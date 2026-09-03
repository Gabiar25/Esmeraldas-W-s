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

// Bloquea el scroll del body con position:fixed en vez de
// overflow:hidden -- en iOS Safari, overflow:hidden en el body hace
// que la barra de navegador pierda la transparencia y se vea gris
// solido mientras el menu/carrito esta abierto.
function lockBodyScroll() {
  const scrollY = window.scrollY;
  document.body.dataset.scrollY = String(scrollY);
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
}

function unlockBodyScroll() {
  const scrollY = parseInt(document.body.dataset.scrollY || "0", 10);
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  delete document.body.dataset.scrollY;
  window.scrollTo(0, scrollY);
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
