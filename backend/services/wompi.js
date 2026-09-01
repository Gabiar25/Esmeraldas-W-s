const crypto = require("crypto");

function isConfigured() {
  return Boolean(
    process.env.WOMPI_PUBLIC_KEY &&
      process.env.WOMPI_INTEGRITY_SECRET &&
      !process.env.WOMPI_PUBLIC_KEY.includes("XXXX")
  );
}

/**
 * Firma de integridad que exige el widget de Wompi para abrir el checkout.
 * Formula oficial: SHA256(referencia + montoEnCentavos + moneda + secretoDeIntegridad)
 * Se calcula en el servidor porque nunca debe viajar el secreto al navegador.
 */
function buildIntegritySignature({ reference, amountInCents, currency }) {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  const raw = `${reference}${amountInCents}${currency}${secret}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function getByPath(obj, dottedPath) {
  return dottedPath
    .split(".")
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

/**
 * Verifica la firma (checksum) que Wompi envia en cada evento de webhook,
 * para confirmar que la notificacion realmente viene de Wompi y no fue falsificada.
 */
function verifyWebhookSignature(payload) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret || !payload?.signature?.checksum) return false;

  const { properties, checksum } = payload.signature;
  const concatenatedValues = properties
    .map((propPath) => getByPath(payload.data, propPath))
    .join("");
  const raw = `${concatenatedValues}${payload.timestamp}${secret}`;
  const computed = crypto.createHash("sha256").update(raw).digest("hex");

  return computed.toLowerCase() === String(checksum).toLowerCase();
}

async function fetchTransaction(transactionId) {
  const base = process.env.WOMPI_API_BASE || "https://sandbox.wompi.co/v1";
  const res = await fetch(`${base}/transactions/${transactionId}`);
  if (!res.ok) throw new Error(`Wompi respondio ${res.status} al consultar la transaccion`);
  const json = await res.json();
  return json.data;
}

module.exports = {
  isConfigured,
  buildIntegritySignature,
  verifyWebhookSignature,
  fetchTransaction,
};
