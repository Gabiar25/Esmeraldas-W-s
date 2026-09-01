// Logica de checkout: resumen del pedido, validacion del formulario,
// creacion del pedido en el backend y apertura del widget de pago de Wompi.

const FIELD_IDS = ["name", "email", "phone", "docType", "docNumber", "address", "city", "department"];

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
    <div class="cart-line" style="grid-template-columns:56px 1fr auto;">
      <img src="${productImage(product, 1)}" alt="${product.name}">
      <div>
        <div class="cart-line__name">${product.name}</div>
        <div class="cart-line__price">Cantidad: ${qty}</div>
      </div>
      <span class="cart-line__price">${formatPrice(product.price * qty)}</span>
    </div>`
    )
    .join("");

  const subtotal = detailed.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  qs("#summarySubtotal").textContent = formatPrice(subtotal);
  qs("#summaryShipping").textContent = "Se calcula al confirmar";
  qs("#summaryTotal").textContent = formatPrice(subtotal);

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

function readForm() {
  const data = {};
  FIELD_IDS.forEach((id) => (data[id === "name" ? "name" : id] = qs(`#${id}`).value.trim()));
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    docType: data.docType,
    docNumber: data.docNumber,
    address: data.address,
    city: data.city,
    department: data.department,
  };
}

function validateForm(customer) {
  let ok = true;
  if (!customer.name) { setFieldError("name", "Ingresa tu nombre completo"); ok = false; }
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) { setFieldError("email", "Correo inválido"); ok = false; }
  if (!/^\d{7,15}$/.test(customer.phone.replace(/\s|-/g, ""))) { setFieldError("phone", "Teléfono inválido"); ok = false; }
  if (!customer.docNumber) { setFieldError("docNumber", "Ingresa tu número de documento"); ok = false; }
  if (!customer.address) { setFieldError("address", "Ingresa tu dirección"); ok = false; }
  if (!customer.city) { setFieldError("city", "Ingresa tu ciudad"); ok = false; }
  if (!customer.department) { setFieldError("department", "Ingresa tu departamento"); ok = false; }
  return ok;
}

async function initCheckout() {
  await renderSummary();

  qs("#checkoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const detailed = await getCartDetailed();
    if (detailed.length === 0) return;

    const customer = readForm();
    if (!validateForm(customer)) return;

    const payBtn = qs("#payBtn");
    payBtn.disabled = true;
    payBtn.textContent = "Procesando…";

    const items = detailed.map(({ product, qty }) => ({ productId: product.id, qty }));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items }),
      });
      const data = await res.json();

      if (!res.ok) {
        qs("#formMsg").textContent = data.error || "No se pudo crear el pedido";
        qs("#formMsg").className = "form-msg error";
        payBtn.disabled = false;
        payBtn.textContent = "Pagar con tarjeta";
        return;
      }

      if (!data.payment.available) {
        qs("#formMsg").innerHTML = `Tu pedido <strong>${data.order.id}</strong> quedó registrado. Los pagos en línea aún no están activados: escríbenos por <a href="https://wa.me/573006911778?text=${encodeURIComponent("Hola, quiero completar mi pedido " + data.order.id)}" target="_blank" rel="noopener">WhatsApp</a> para coordinar el pago.`;
        qs("#formMsg").className = "form-msg";
        payBtn.disabled = false;
        payBtn.textContent = "Pagar con tarjeta";
        return;
      }

      const p = data.payment;
      const checkout = new window.WidgetCheckout({
        currency: p.currency,
        amountInCents: p.amountInCents,
        reference: p.reference,
        publicKey: p.publicKey,
        signature: { integrity: p.signature },
        redirectUrl: p.redirectUrl,
        customerData: p.customerData,
      });

      checkout.open((result) => {
        const transaction = result?.transaction;
        clearCart();
        const idParam = transaction?.id ? `&id=${encodeURIComponent(transaction.id)}` : "";
        window.location.href = `/pedido-confirmado.html?order=${data.order.id}${idParam}`;
      });

      payBtn.disabled = false;
      payBtn.textContent = "Pagar con tarjeta";
    } catch (err) {
      console.error(err);
      qs("#formMsg").textContent = "Ocurrió un error de conexión. Intenta de nuevo.";
      qs("#formMsg").className = "form-msg error";
      payBtn.disabled = false;
      payBtn.textContent = "Pagar con tarjeta";
    }
  });
}

initCheckout();
