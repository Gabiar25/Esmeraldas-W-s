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

/**
 * Arma la URL del Checkout Web de Wompi (pagina completa alojada por Wompi,
 * no el widget emergente). El navegador navega directo a esta URL y Wompi
 * lo regresa solo a "redirectUrl" cuando termina, agregando "?id=" con el
 * id de la transaccion. Evita por completo los problemas de scroll/zIndex
 * que puede tener un widget embebido dentro de nuestra propia pagina.
 */
function buildCheckoutUrl({ amountInCents, reference, currency, redirectUrl, customerData }) {
  const params = new URLSearchParams({
    "public-key": process.env.WOMPI_PUBLIC_KEY,
    currency,
    "amount-in-cents": String(amountInCents),
    reference,
    "signature:integrity": buildIntegritySignature({ reference, amountInCents, currency }),
    "redirect-url": redirectUrl,
  });

  if (customerData?.email) params.set("customer-data:email", customerData.email);
  if (customerData?.fullName) params.set("customer-data:full-name", customerData.fullName);
  if (customerData?.phoneNumber) params.set("customer-data:phone-number", customerData.phoneNumber);
  if (customerData?.phoneNumberPrefix) params.set("customer-data:phone-number-prefix", customerData.phoneNumberPrefix);
  if (customerData?.legalId) params.set("customer-data:legal-id", customerData.legalId);
  if (customerData?.legalIdType) params.set("customer-data:legal-id-type", customerData.legalIdType);

  return `https://checkout.wompi.co/p/?${params.toString()}`;
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
  buildCheckoutUrl,
  verifyWebhookSignature,
  fetchTransaction,
};
