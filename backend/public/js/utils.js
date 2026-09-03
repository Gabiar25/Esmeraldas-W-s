// Utilidades compartidas por todas las paginas.

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
