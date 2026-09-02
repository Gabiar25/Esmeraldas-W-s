// Panel simple de pedidos, protegido con una clave (ADMIN_PASSWORD en el
// servidor). La clave se guarda en sessionStorage solo para no pedirla en
// cada click dentro de la misma pestaña; se manda en cada consulta al
// servidor, que es quien realmente la valida.
const ADMIN_KEY = "esmeraldas_ws_admin_password";

const STATUS_LABELS = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  DECLINED: "Rechazado",
  VOIDED: "Anulado",
  ERROR: "Error",
};

function statusClass(status) {
  if (status === "APPROVED") return "admin-status--approved";
  if (status === "DECLINED" || status === "VOIDED" || status === "ERROR") return "admin-status--declined";
  return "admin-status--pending";
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

async function fetchOrders(password, retry = true) {
  let res;
  try {
    res = await fetch("/api/admin/orders", { headers: { "x-admin-password": password } });
  } catch (networkErr) {
    // Un fallo de red (no de credenciales) puede ser un hipo pasajero de
    // conexión; se reintenta una sola vez antes de mostrar el error.
    if (retry) return fetchOrders(password, false);
    throw new Error("No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo cargar");
  }
  return res.json();
}

function renderOrders(orders) {
  const box = qs("#ordersContent");
  if (orders.length === 0) {
    box.innerHTML = '<p class="admin-empty">Todavía no hay pedidos.</p>';
    return;
  }

  const rows = orders
    .map((o) => {
      const itemsText = o.items.map((i) => `${i.name} ×${i.qty}`).join(", ");
      const waLink = `https://wa.me/57${o.customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola ${o.customer.name}, te escribimos de Esmeraldas W&S por tu pedido ${o.id}.`
      )}`;
      return `
        <tr>
          <td>${formatDate(o.createdAt)}</td>
          <td>${o.id}</td>
          <td>${o.customer.name}<br><a class="admin-wa" href="${waLink}" target="_blank" rel="noopener">${o.customer.phone}</a></td>
          <td>${itemsText}</td>
          <td>${o.paymentMethod === "cod" ? "Contra entrega" : "Tarjeta"}</td>
          <td><span class="admin-status ${statusClass(o.status)}">${STATUS_LABELS[o.status] || o.status}</span></td>
          <td>${formatPrice(o.total)}</td>
          <td>${o.customer.address}, ${o.customer.city}, ${o.customer.department}</td>
        </tr>`;
    })
    .join("");

  const box2 = qs("#ordersContent");
  box2.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Piezas</th>
            <th>Método</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Dirección</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadOrders(password) {
  try {
    const orders = await fetchOrders(password);
    qs("#loginBox").hidden = true;
    qs("#ordersBox").hidden = false;
    renderOrders(orders);
    sessionStorage.setItem(ADMIN_KEY, password);
  } catch (err) {
    sessionStorage.removeItem(ADMIN_KEY);
    qs("#loginBox").hidden = false;
    qs("#ordersBox").hidden = true;
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

  const saved = sessionStorage.getItem(ADMIN_KEY);
  if (saved) loadOrders(saved);
});
