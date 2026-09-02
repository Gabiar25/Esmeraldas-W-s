// Logica de checkout: resumen del pedido, validacion del formulario,
// creacion del pedido en el backend y apertura del widget de pago de Wompi
// (o confirmacion directa si el metodo elegido es contra entrega).

// Ciudades principales por departamento para el selector de "Ciudad"
// (no es exhaustivo con los 1000+ municipios de Colombia, pero cubre las
// ciudades mas comunes de cada departamento). El precio de envio sigue
// calculandose por DEPARTAMENTO, no por ciudad especifica.
const CITIES_BY_DEPARTMENT = {
  "Amazonas": ["Leticia", "Puerto Nariño"],
  "Antioquia": ["Medellín", "Bello", "Itagüí", "Envigado", "Rionegro", "Apartadó", "Turbo", "Caucasia", "Sabaneta", "La Estrella", "Copacabana", "Girardota"],
  "Arauca": ["Arauca", "Saravena", "Tame", "Arauquita"],
  "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia", "Galapa"],
  "Bogotá D.C.": ["Bogotá"],
  "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar"],
  "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa"],
  "Caldas": ["Manizales", "La Dorada", "Chinchiná", "Villamaría", "Riosucio"],
  "Caquetá": ["Florencia", "San Vicente del Caguán"],
  "Casanare": ["Yopal", "Aguazul", "Villanueva"],
  "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
  "Cesar": ["Valledupar", "Aguachica", "Codazzi"],
  "Chocó": ["Quibdó", "Istmina"],
  "Córdoba": ["Montería", "Cereté", "Lorica", "Sahagún"],
  "Cundinamarca": ["Soacha", "Chía", "Zipaquirá", "Facatativá", "Fusagasugá", "Girardot", "Mosquera", "Madrid", "Funza"],
  "Guainía": ["Inírida"],
  "Guaviare": ["San José del Guaviare"],
  "Huila": ["Neiva", "Pitalito", "Garzón"],
  "La Guajira": ["Riohacha", "Maicao", "Uribia"],
  "Magdalena": ["Santa Marta", "Ciénaga", "Fundación"],
  "Meta": ["Villavicencio", "Acacías", "Granada"],
  "Nariño": ["Pasto", "Ipiales", "Tumaco"],
  "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario"],
  "Putumayo": ["Mocoa", "Puerto Asís"],
  "Quindío": ["Armenia", "Calarcá", "Montenegro"],
  "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal"],
  "San Andrés y Providencia": ["San Andrés", "Providencia"],
  "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"],
  "Sucre": ["Sincelejo", "Corozal"],
  "Tolima": ["Ibagué", "Espinal", "Melgar"],
  "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago", "Buga", "Yumbo", "Jamundí"],
  "Vaupés": ["Mitú"],
  "Vichada": ["Puerto Carreño"],
};
const OTHER_CITY_VALUE = "__otra__";

function populateCities(department, selected) {
  const citySelect = qs("#city");
  if (!citySelect) return;
  const cities = CITIES_BY_DEPARTMENT[department] || [];

  if (!department || cities.length === 0) {
    citySelect.innerHTML = '<option value="">Elige un departamento primero</option>';
    citySelect.disabled = true;
    return;
  }

  citySelect.disabled = false;
  citySelect.innerHTML =
    '<option value="">Selecciona…</option>' +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("") +
    `<option value="${OTHER_CITY_VALUE}">Otro municipio…</option>`;

  if (selected && (cities.includes(selected) || selected === OTHER_CITY_VALUE)) {
    citySelect.value = selected;
  }
  toggleCityOther();
}

function toggleCityOther() {
  const citySelect = qs("#city");
  const otherField = qs("#cityOtherField");
  if (!citySelect || !otherField) return;
  otherField.hidden = citySelect.value !== OTHER_CITY_VALUE;
}

let shippingByDepartment = {};

async function loadShippingZones() {
  try {
    const res = await fetch("/api/shipping-zones");
    const data = await res.json();
    shippingByDepartment = {};
    (data.departments || []).forEach((d) => { shippingByDepartment[d.name] = d.cost; });
  } catch {
    shippingByDepartment = {};
  }
}

function currentShippingCost() {
  const dept = qs("#department")?.value;
  return dept && shippingByDepartment[dept] != null ? shippingByDepartment[dept] : null;
}

function updateShippingUI() {
  const cost = currentShippingCost();
  const methodEl = qs("#shippingMethodCost");
  if (methodEl) {
    methodEl.textContent = cost == null ? "Según tu departamento" : cost > 0 ? formatPrice(cost) : "Gratis";
  }
  const shipEl = qs("#summaryShipping");
  const totalEl = qs("#summaryTotal");
  const subtotalEl = qs("#summarySubtotal");
  if (shipEl && totalEl && subtotalEl) {
    const subtotal = Number(subtotalEl.dataset.value || 0);
    shipEl.textContent = cost == null ? "Selecciona tu departamento" : cost > 0 ? formatPrice(cost) : "Gratis";
    totalEl.textContent = formatPrice(subtotal + (cost || 0));
  }
}

async function renderSummary() {
  const detailed = await getCartDetailed();
  const itemsEl = qs("#summaryItems");

  if (detailed.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío. <a href="/catalogo.html">Ir al catálogo</a></p>';
    qs("#payBtn").disabled = true;
    return detailed;
  }

  itemsEl.innerHTML = detailed
    .map(
      ({ product, qty }) => `
    <div class="summary-item">
      <span class="summary-item__thumb">
        <img src="${productImage(product, 1)}" alt="${product.name}">
        <span class="summary-item__qty">${qty}</span>
      </span>
      <span class="summary-item__name">${product.name}</span>
      <span class="summary-item__price">${formatPrice(product.price * qty)}</span>
    </div>`
    )
    .join("");

  const subtotal = detailed.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  qs("#summarySubtotal").textContent = formatPrice(subtotal);
  qs("#summarySubtotal").dataset.value = String(subtotal);
  updateShippingUI();

  return detailed;
}

function clearErrors() {
  qsa(".field-error").forEach((el) => (el.textContent = ""));
  qs("#formMsg").textContent = "";
  qs("#formMsg").className = "form-msg";
}

function setFieldError(field, message) {
  const el = qs(`[data-error-for="${field}"]`);
  if (el) el.textContent = message;
}

// No mostramos un selector de "tipo de documento" (para verse mas simple,
// como "Cedula o Nit"); inferimos si es NIT por el guion del digito de
// verificacion (ej: 900123456-7), si no, se asume cedula de ciudadania.
function inferDocType(docNumber) {
  return /-/.test(docNumber) ? "NIT" : "CC";
}

function readForm() {
  const val = (id) => qs(`#${id}`).value.trim();
  const address2 = val("address2");
  const postalCode = val("postalCode");
  let address = val("address");
  if (address2) address += `, ${address2}`;
  if (postalCode) address += ` (CP: ${postalCode})`;

  const citySelect = qs("#city");
  const city = citySelect?.value === OTHER_CITY_VALUE ? val("cityOther") : citySelect?.value || "";

  const docNumber = val("docNumber");

  const paymentInput = qs('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentInput && paymentInput.value === "cod" ? "cod" : "card";

  return {
    customer: {
      name: `${val("firstName")} ${val("lastName")}`.trim(),
      email: val("email"),
      phone: val("phone"),
      docType: inferDocType(docNumber),
      docNumber,
      address,
      city,
      department: val("department"),
      smsOptIn: qs("#smsOptIn")?.checked || false,
    },
    paymentMethod,
  };
}

// "Guardar mi informacion": si esta marcado, recuerda los campos en este
// navegador para la proxima visita (nunca se manda al servidor).
const SAVED_INFO_KEY = "esmeraldas_ws_checkout_info";
const SAVED_INFO_FIELDS = [
  "firstName", "lastName", "email", "phone", "docNumber",
  "address", "address2", "department", "postalCode",
];

function restoreSavedInfo() {
  try {
    const raw = localStorage.getItem(SAVED_INFO_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    SAVED_INFO_FIELDS.forEach((id) => {
      const el = qs(`#${id}`);
      if (el && data[id]) el.value = data[id];
    });
    if (data.department) {
      populateCities(data.department, data.city);
      if (data.city === OTHER_CITY_VALUE && data.cityOther) {
        qs("#cityOther").value = data.cityOther;
      }
    }
    const saveInfoBox = qs("#saveInfo");
    if (saveInfoBox) saveInfoBox.checked = true;
  } catch {
    /* localStorage no disponible; simplemente no se restaura nada */
  }
}

function persistSavedInfo() {
  const saveInfoBox = qs("#saveInfo");
  if (!saveInfoBox) return;
  try {
    if (!saveInfoBox.checked) {
      localStorage.removeItem(SAVED_INFO_KEY);
      return;
    }
    const data = {};
    SAVED_INFO_FIELDS.forEach((id) => {
      const el = qs(`#${id}`);
      if (el) data[id] = el.value;
    });
    data.city = qs("#city")?.value || "";
    data.cityOther = qs("#cityOther")?.value || "";
    localStorage.setItem(SAVED_INFO_KEY, JSON.stringify(data));
  } catch {
    /* si el navegador bloquea localStorage, simplemente no se guarda */
  }
}

function validateForm(customer) {
  let ok = true;
  if (!qs("#firstName").value.trim()) { setFieldError("firstName", "Ingresa tu nombre"); ok = false; }
  if (!qs("#lastName").value.trim()) { setFieldError("lastName", "Ingresa tus apellidos"); ok = false; }
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) { setFieldError("email", "Correo inválido"); ok = false; }
  if (!/^\d{7,15}$/.test(customer.phone.replace(/\s|-/g, ""))) { setFieldError("phone", "Teléfono inválido"); ok = false; }
  if (!customer.docNumber) { setFieldError("docNumber", "Ingresa tu número de documento"); ok = false; }
  if (!customer.address) { setFieldError("address", "Ingresa tu dirección"); ok = false; }
  if (!customer.department) { setFieldError("department", "Ingresa tu departamento"); ok = false; }
  if (!customer.city) { setFieldError("city", "Selecciona o escribe tu ciudad"); ok = false; }
  return ok;
}

function currentPayBtnLabel() {
  const paymentInput = qs('input[name="paymentMethod"]:checked');
  return paymentInput && paymentInput.value === "cod" ? "Confirmar pedido" : "Pagar ahora";
}

async function initCheckout() {
  restoreSavedInfo();
  await loadShippingZones();
  await renderSummary();
  updateShippingUI();

  qs("#department")?.addEventListener("change", (e) => {
    populateCities(e.target.value);
    updateShippingUI();
    setFieldError("department", "");
    setFieldError("city", "");
  });

  qs("#city")?.addEventListener("change", () => {
    toggleCityOther();
    setFieldError("city", "");
  });

  const payBtn = qs("#payBtn");
  qsa('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", () => {
      payBtn.textContent = currentPayBtnLabel();
    });
  });

  qs("#checkoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const detailed = await getCartDetailed();
    if (detailed.length === 0) return;

    const { customer, paymentMethod } = readForm();
    if (!validateForm(customer)) return;

    persistSavedInfo();

    payBtn.disabled = true;
    payBtn.textContent = "Procesando…";

    const items = detailed.map(({ product, qty }) => ({ productId: product.id, qty }));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items, paymentMethod }),
      });
      const data = await res.json();

      if (!res.ok) {
        qs("#formMsg").textContent = data.error || "No se pudo crear el pedido";
        qs("#formMsg").className = "form-msg error";
        payBtn.disabled = false;
        payBtn.textContent = currentPayBtnLabel();
        return;
      }

      if (data.payment.method === "cod") {
        window.location.href = `/pedido-confirmado.html?order=${data.order.id}`;
        return;
      }

      if (!data.payment.available) {
        qs("#formMsg").innerHTML = `Tu pedido <strong>${data.order.id}</strong> quedó registrado. Los pagos en línea aún no están activados: escríbenos por <a href="https://wa.me/573006911778?text=${encodeURIComponent("Hola, quiero completar mi pedido " + data.order.id)}" target="_blank" rel="noopener">WhatsApp</a> para coordinar el pago.`;
        qs("#formMsg").className = "form-msg";
        payBtn.disabled = false;
        payBtn.textContent = currentPayBtnLabel();
        return;
      }

      // Checkout Web de Wompi: pagina completa alojada por Wompi (no un
      // widget emergente encima de la nuestra), asi que no hay forma de
      // que quede scroll trabado ni de que se vea mal en un navegador
      // movil raro. Wompi nos devuelve solo a "redirectUrl" cuando termina.
      window.location.href = data.payment.checkoutUrl;
    } catch (err) {
      console.error(err);
      qs("#formMsg").textContent = "Ocurrió un error de conexión. Intenta de nuevo.";
      qs("#formMsg").className = "form-msg error";
      payBtn.disabled = false;
      payBtn.textContent = currentPayBtnLabel();
    }
  });
}

initCheckout();
