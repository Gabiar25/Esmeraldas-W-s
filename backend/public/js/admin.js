// Panel de pedidos, protegido con una clave (ADMIN_PASSWORD en el servidor).
// La clave se guarda en sessionStorage solo para no pedirla en cada click
// dentro de la misma pestaña; se manda en cada consulta al servidor, que es
// quien realmente la valida.
const ADMIN_KEY = "esmeraldas_ws_admin_password";

const WOMPI_STATUS_LABELS = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  DECLINED: "Rechazado",
  VOIDED: "Anulado",
  ERROR: "Error",
};

const FULFILL_LABELS = {
  PENDING: "Pendiente",
  FULFILLED: "Entregado",
  CANCELLED: "Cancelado",
};

let allOrders = [];

function wompiStatusClass(status) {
  if (status === "APPROVED") return "admin-status--approved";
  if (status === "DECLINED" || status === "VOIDED" || status === "ERROR") return "admin-status--declined";
  return "admin-status--pending";
}

function fulfillClass(status) {
  if (status === "FULFILLED") return "is-fulfilled";
  if (status === "CANCELLED") return "is-cancelled";
  return "";
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

async function apiFetch(path, options = {}, retry = true) {
  const password = sessionStorage.getItem(ADMIN_KEY);
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: { ...(options.headers || {}), "x-admin-password": password },
    });
  } catch (networkErr) {
    // Un fallo de red (no de credenciales) puede ser un hipo pasajero de
    // conexión; se reintenta una sola vez antes de mostrar el error.
    if (retry) return apiFetch(path, options, false);
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo completar la operación");
  }
  return res.json();
}

// ---------- Resumen ----------
function renderStats(orders) {
  const total = orders.length;
  const pending = orders.filter((o) => (o.fulfillmentStatus || "PENDING") === "PENDING").length;
  const fulfilled = orders.filter((o) => o.fulfillmentStatus === "FULFILLED").length;
  const revenue = orders
    .filter((o) => o.fulfillmentStatus !== "CANCELLED" && (o.paymentMethod === "cod" || o.status === "APPROVED"))
    .reduce((sum, o) => sum + o.total, 0);

  qs("#statsRow").innerHTML = [
    ["Total de pedidos", total],
    ["Pendientes", pending],
    ["Entregados", fulfilled],
    ["Ingresos confirmados", formatPrice(revenue)],
  ]
    .map(
      ([label, value]) => `
      <div class="admin-stat-card">
        <div class="admin-stat-card__label">${label}</div>
        <div class="admin-stat-card__value">${value}</div>
      </div>`
    )
    .join("");
}

// ---------- Tabla ----------
function applyFilters(orders) {
  const search = qs("#searchInput").value.trim().toLowerCase();
  const statusFilter = qs("#statusFilter").value;
  const methodFilter = qs("#methodFilter").value;

  return orders.filter((o) => {
    if (statusFilter && (o.fulfillmentStatus || "PENDING") !== statusFilter) return false;
    if (methodFilter && o.paymentMethod !== methodFilter) return false;
    if (search) {
      const haystack = `${o.id} ${o.customer.name} ${o.customer.phone}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

async function updateOrder(id, patch) {
  const updated = await apiFetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const idx = allOrders.findIndex((o) => o.id === id);
  if (idx !== -1) allOrders[idx] = updated;
  return updated;
}

function renderOrders() {
  const filtered = applyFilters(allOrders);
  renderStats(allOrders);

  const box = qs("#ordersContent");
  if (allOrders.length === 0) {
    box.innerHTML = '<p class="admin-empty">Todavía no hay pedidos.</p>';
    return;
  }
  if (filtered.length === 0) {
    box.innerHTML = '<p class="admin-empty">No hay pedidos que coincidan con el filtro.</p>';
    return;
  }

  const rows = filtered
    .map((o) => {
      const itemsText = o.items.map((i) => `${i.name} ×${i.qty}`).join(", ");
      const waLink = `https://wa.me/57${o.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola ${o.customer.name}, te escribimos de Esmeraldas W&S por tu pedido ${o.id}.`
      )}`;
      const fulfillment = o.fulfillmentStatus || "PENDING";
      return `
        <tr data-id="${o.id}">
          <td>${formatDate(o.createdAt)}</td>
          <td class="admin-order-id">${o.id}</td>
          <td>${o.customer.name}<br><a class="admin-wa" href="${waLink}" target="_blank" rel="noopener">${o.customer.phone}</a></td>
          <td class="admin-items">${itemsText}</td>
          <td>${o.paymentMethod === "cod" ? "Contra entrega" : "Tarjeta"}</td>
          <td><span class="admin-status ${wompiStatusClass(o.status)}">${WOMPI_STATUS_LABELS[o.status] || o.status}</span></td>
          <td>
            <select class="admin-fulfill-select ${fulfillClass(fulfillment)}" data-action="fulfillment">
              ${Object.entries(FULFILL_LABELS)
                .map(([value, label]) => `<option value="${value}" ${value === fulfillment ? "selected" : ""}>${label}</option>`)
                .join("")}
            </select>
          </td>
          <td><input class="admin-note-input" data-action="notes" value="${(o.notes || "").replace(/"/g, "&quot;")}" placeholder="Nota…"></td>
          <td>${formatPrice(o.total)}</td>
          <td class="admin-address">${o.customer.address}, ${o.customer.city}, ${o.customer.department}</td>
        </tr>`;
    })
    .join("");

  box.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Piezas</th>
            <th>Método</th>
            <th>Pago</th>
            <th>Gestión</th>
            <th>Nota</th>
            <th>Total</th>
            <th>Dirección</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  qsa('[data-action="fulfillment"]', box).forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      const value = e.target.value;
      select.disabled = true;
      try {
        await updateOrder(id, { fulfillmentStatus: value });
        showToast("Pedido actualizado");
        renderOrders();
      } catch (err) {
        showToast(err.message);
        select.disabled = false;
      }
    });
  });

  qsa('[data-action="notes"]', box).forEach((input) => {
    input.addEventListener("blur", async (e) => {
      const id = e.target.closest("tr").dataset.id;
      const order = allOrders.find((o) => o.id === id);
      if (order && (order.notes || "") === e.target.value) return;
      try {
        await updateOrder(id, { notes: e.target.value });
        showToast("Nota guardada");
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

// ---------- Exportar CSV ----------
function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function exportCsv() {
  const rows = applyFilters(allOrders);
  const headers = [
    "Fecha",
    "Pedido",
    "Cliente",
    "Teléfono",
    "Correo",
    "Documento",
    "Dirección",
    "Ciudad",
    "Departamento",
    "Piezas",
    "Método de pago",
    "Estado de pago",
    "Gestión",
    "Nota",
    "Subtotal",
    "Envío",
    "Total",
  ];
  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach((o) => {
    lines.push(
      [
        formatDate(o.createdAt),
        o.id,
        o.customer.name,
        o.customer.phone,
        o.customer.email,
        `${o.customer.docType} ${o.customer.docNumber}`,
        o.customer.address,
        o.customer.city,
        o.customer.department,
        o.items.map((i) => `${i.name} x${i.qty}`).join(" / "),
        o.paymentMethod === "cod" ? "Contra entrega" : "Tarjeta",
        WOMPI_STATUS_LABELS[o.status] || o.status,
        FULFILL_LABELS[o.fulfillmentStatus || "PENDING"],
        o.notes || "",
        o.subtotal,
        o.shipping,
        o.total,
      ]
        .map(csvEscape)
        .join(",")
    );
  });

  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos-esmeraldas-ws-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Login / carga inicial ----------
async function loadOrders(password) {
  sessionStorage.setItem(ADMIN_KEY, password);
  try {
    allOrders = await apiFetch("/api/admin/orders");
    qs("#loginBox").hidden = true;
    qs("#dashboard").hidden = false;
    renderOrders();
  } catch (err) {
    sessionStorage.removeItem(ADMIN_KEY);
    qs("#loginBox").hidden = false;
    qs("#dashboard").hidden = true;
    qs("#loginError").textContent = err.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  qs("#loginBtn").addEventListener("click", () => {
    const password = qs("#adminPassword").value.trim();
    if (password) loadOrders(password);
  });

  qs("#adminPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") qs("#loginBtn").click();
  });

  qs("#refreshBtn").addEventListener("click", () => {
    const password = sessionStorage.getItem(ADMIN_KEY);
    if (password) loadOrders(password);
  });

  qs("#logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_KEY);
    qs("#loginBox").hidden = false;
    qs("#dashboard").hidden = true;
    qs("#adminPassword").value = "";
  });

  qs("#searchInput").addEventListener("input", renderOrders);
  qs("#statusFilter").addEventListener("change", renderOrders);
  qs("#methodFilter").addEventListener("change", renderOrders);
  qs("#exportBtn").addEventListener("click", exportCsv);

  const saved = sessionStorage.getItem(ADMIN_KEY);
  if (saved) loadOrders(saved);
});
