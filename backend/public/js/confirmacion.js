// Pagina de confirmacion: sincroniza el estado real de la transaccion con
// Wompi (via el backend) y lo muestra al cliente.

const STATUS_INFO = {
  APPROVED: { label: "Pago aprobado", cls: "status-approved", msg: "¡Gracias por tu compra! Te contactaremos por WhatsApp o correo para coordinar el envío." },
  PENDING: { label: "Pago pendiente", cls: "status-pending", msg: "Tu pago está siendo procesado. Te avisaremos apenas se confirme." },
  DECLINED: { label: "Pago rechazado", cls: "status-declined", msg: "El pago no pudo procesarse. Puedes intentar de nuevo desde el carrito." },
  ERROR: { label: "Error en el pago", cls: "status-declined", msg: "Ocurrió un error procesando el pago. Intenta de nuevo o escríbenos por WhatsApp." },
  VOIDED: { label: "Pago anulado", cls: "status-declined", msg: "Este pago fue anulado." },
};

const COD_INFO = {
  label: "Pedido confirmado",
  cls: "status-pending",
  msg: "Tu pedido quedó registrado para pago contra entrega. Te contactaremos por WhatsApp para coordinar la entrega y el pago.",
};

function renderOrder(order) {
  const info = order.paymentMethod === "cod" ? COD_INFO : STATUS_INFO[order.status] || STATUS_INFO.PENDING;
  const pickupNote =
    order.deliveryMethod === "pickup"
      ? `<p><strong>Retiro en oficina:</strong> ${order.pickupAddress}. Estará lista para recoger 1 día hábil después de la compra y la verificación del pago.</p>`
      : "";
  const root = qs("#confirmRoot");
  root.innerHTML = `
    <span class="status-pill ${info.cls}">${info.label}</span>
    <h1>Pedido ${order.id}</h1>
    <p>${info.msg}</p>
    ${pickupNote}
    <div style="text-align:left; margin-top:1.5rem; border-top:1px solid var(--color-line); padding-top:1rem;">
      ${order.items
        .map(
          (it) => `<div class="summary-line"><span>${it.name} × ${it.qty}</span><span>${formatPrice(it.price * it.qty)}</span></div>`
        )
        .join("")}
      <div class="summary-total"><span>Total</span><span>${formatPrice(order.total)}</span></div>
    </div>
    <a href="/catalogo.html" class="btn btn-outline" style="margin-top:1.75rem;">Seguir viendo piezas</a>
  `;
}

async function initConfirmacion() {
  const orderId = getQueryParam("order");
  const transactionId = getQueryParam("id");
  const root = qs("#confirmRoot");

  if (!orderId) {
    root.innerHTML = '<p class="empty-state">No encontramos información de este pedido.</p>';
    return;
  }

  try {
    let order;
    if (transactionId) {
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      order = await res.json();
      if (!res.ok) throw new Error(order.error || "No se pudo confirmar el pedido");
    } else {
      const res = await fetch(`/api/orders/${orderId}`);
      order = await res.json();
      if (!res.ok) throw new Error(order.error || "Pedido no encontrado");
    }
    renderOrder(order);
    // El carrito se vacía aquí (y no antes de mandar al cliente a pagar) para
    // que si abandona el pago de Wompi y no vuelve, no pierda lo que tenía
    // en el carrito.
    clearCart();
  } catch (err) {
    root.innerHTML = `<p class="empty-state">${err.message}</p>`;
  }
}

initConfirmacion();
