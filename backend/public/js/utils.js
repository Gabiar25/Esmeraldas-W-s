// Utilidades compartidas por todas las paginas.

// Nombre simple de cada categoria (titulo de pagina, filtros) y la
// etiqueta descriptiva que se muestra en tarjetas/fichas de producto.
// Unico lugar donde viven -- antes estaban repetidas en catalogo.js,
// producto.js e index.html, y se desincronizaban al cambiar una sola.
const CATEGORY_NAMES = { collares: "Collares", aretes: "Aretes", sets: "Sets" };
const CATEGORY_CARD_LABELS = { collares: "Dije + Cadena", aretes: "Aretes", sets: "Cadena + Dije + Aretes" };

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  return COP.format(value);
}

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Escapa texto antes de insertarlo en HTML armado a mano (innerHTML con
// template strings) -- imprescindible para cualquier dato que venga de un
// formulario (nombre, dirección, etc.), nunca confiar en que "no debería"
// traer HTML.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

let productsCache = null;
async function fetchProducts() {
  if (productsCache) return productsCache;
  const res = await fetch("/api/products");
  productsCache = await res.json();
  return productsCache;
}

async function fetchProduct(id) {
  const products = await fetchProducts();
  const found = products.find((p) => p.id === id);
  if (found) return found;
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) return null;
  return res.json();
}

function productImage(product, index, size = "card") {
  return `/assets/images/${product.id}/${index}-${size}.jpg`;
}

// Gancho de "oferta" para la categoria collares: como las piezas son
// unicas (no hay reposicion), no existe un precio "antes" real -- es solo
// un precio de referencia tachado, mas alto, que se muestra junto al
// precio de siempre para dar sensacion de descuento. El precio que se
// cobra (product.price) nunca cambia, en ningun lado.
function offerCompareAtPrice(product) {
  if (product.category !== "collares") return null;
  return Math.round((product.price * 1.25) / 1000) * 1000;
}

function priceBlockHtml(product) {
  const compareAt = offerCompareAtPrice(product);
  if (!compareAt) return formatPrice(product.price);
  return `<span class="price-was">${formatPrice(compareAt)}</span>${formatPrice(product.price)}`;
}

function offerBadgeHtml(product) {
  return offerCompareAtPrice(product) ? '<span class="badge badge-offer">¡Oferta!</span>' : "";
}

function showToast(message) {
  let toast = qs(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}
