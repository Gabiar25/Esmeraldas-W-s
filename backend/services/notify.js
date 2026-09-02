// Avisa por correo al dueño de la tienda cuando entra un pedido confirmado
// (contra entrega, o pago con tarjeta ya aprobado). Usa la API REST de
// Resend (https://resend.com) para no depender de un servidor SMTP propio.

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.OWNER_EMAIL);
}

function money(value) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

function buildEmailHtml(order) {
  const methodLabel = order.paymentMethod === "cod" ? "Contra entrega" : "Tarjeta (pago aprobado)";
  const deliveryLabel = order.deliveryMethod === "pickup" ? "Retiro en oficina (Bogotá)" : "Envío a domicilio";
  const itemsHtml = order.items
    .map((item) => `<li>${item.name} × ${item.qty} — ${money(item.price * item.qty)}</li>`)
    .join("");

  return `
    <h2>Nuevo pedido ${order.id}</h2>
    <p><strong>Método de pago:</strong> ${methodLabel}</p>
    <p><strong>Entrega:</strong> ${deliveryLabel}</p>
    <p>
      <strong>Cliente:</strong> ${order.customer.name}<br>
      <strong>Teléfono:</strong> ${order.customer.phone}<br>
      <strong>Correo:</strong> ${order.customer.email}<br>
      <strong>Documento:</strong> ${order.customer.docType} ${order.customer.docNumber}<br>
      <strong>Dirección:</strong> ${order.customer.address}, ${order.customer.city}, ${order.customer.department}
    </p>
    <ul>${itemsHtml}</ul>
    <p>
      Subtotal: ${money(order.subtotal)}<br>
      Envío: ${money(order.shipping)}<br>
      <strong>Total: ${money(order.total)}</strong>
    </p>
  `;
}

// No lanza error si falla: un correo que no llega no debe tumbar el pedido,
// que ya quedó guardado en la base de datos antes de llamar esta funcion.
async function notifyNewOrder(order) {
  if (!isConfigured()) {
    console.log("Aviso: RESEND_API_KEY/OWNER_EMAIL no configurados; no se envía el correo de pedido nuevo.");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL || "Esmeraldas W&S <onboarding@resend.dev>",
        to: process.env.OWNER_EMAIL,
        subject: `Nuevo pedido ${order.id} — ${money(order.total)}`,
        html: buildEmailHtml(order),
      }),
    });
    if (!res.ok) {
      console.error("Resend respondió con error al enviar el correo de pedido nuevo:", res.status, await res.text());
    }
  } catch (err) {
    console.error("No se pudo enviar el correo de pedido nuevo:", err);
  }
}

module.exports = { isConfigured, notifyNewOrder };
