// Carrito de compras: persistido en localStorage, se comparte entre paginas
// guardando solo {productId, qty} y resolviendo los datos del producto
// contra la API cada vez que se dibuja.

const CART_KEY = "esmeraldas_ws_cart_v1";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(productId, qty = 1) {
  const cart = getCart();
  const line = cart.find((l) => l.productId === productId);
  if (line) line.qty += qty;
  else cart.push({ productId, qty });
  saveCart(cart);
}

function setCartQty(productId, qty) {
  let cart = getCart();
  if (qty <= 0) {
    cart = cart.filter((l) => l.productId !== productId);
  } else {
    const line = cart.find((l) => l.productId === productId);
    if (line) line.qty = qty;
  }
  saveCart(cart);
  renderCartDrawer();
}

function removeFromCart(productId) {
  const cart = getCart().filter((l) => l.productId !== productId);
  saveCart(cart);
  renderCartDrawer();
}

function clearCart() {
  saveCart([]);
}

function getCartCount() {
  return getCart().reduce((sum, l) => sum + l.qty, 0);
}

function updateCartCount() {
  qsa(".cart-count").forEach((el) => {
    const count = getCartCount();
    el.textContent = String(count);
    el.hidden = count === 0;
  });
}

async function getCartDetailed() {
  const cart = getCart();
  const products = await fetchProducts();
  return cart
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      return { product, qty: line.qty, available: product.stock };
    })
    .filter(Boolean);
}

async function renderCartDrawer() {
  const itemsEl = qs("#cartItems");
  const footerEl = qs("#cartFooter");
  if (!itemsEl) return;

  const detailed = await getCartDetailed();
  const countEl = qs("#cartDrawerCount");

  if (detailed.length === 0) {
    if (countEl) countEl.textContent = "";
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
        <p>Tu carrito está vacío</p>
        <span>Explora la colección y encuentra tu próxima pieza favorita.</span>
        <a class="btn btn-outline" href="/catalogo.html">Ver catálogo</a>
      </div>`;
    if (footerEl) footerEl.hidden = true;
    return;
  }

  const totalQty = detailed.reduce((sum, { qty }) => sum + qty, 0);
  if (countEl) countEl.textContent = `(${totalQty})`;
  if (footerEl) footerEl.hidden = false;

  itemsEl.innerHTML = detailed
    .map(({ product, qty }) => {
      const soldOut = product.stock < 1;
      const atMax = qty >= product.stock;
      return `
      <div class="cart-line" data-id="${product.id}">
        <div class="cart-line__img">
          <img src="${productImage(product, 1)}" alt="${product.name}" loading="lazy">
        </div>
        <div class="cart-line__body">
          <div class="cart-line__top">
            <h3 class="cart-line__name">${product.name}</h3>
            <button class="cart-line__remove" data-action="remove" data-id="${product.id}" aria-label="Eliminar ${product.name}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
          <p class="cart-line__unit">${formatPrice(product.price)} c/u</p>
          ${soldOut ? '<p class="cart-line__warning">Ya no disponible</p>' : ""}
          <div class="cart-line__bottom">
            <div class="qty-control qty-control--sm">
              <button data-action="dec" data-id="${product.id}" aria-label="Restar">&minus;</button>
              <input type="text" readonly value="${qty}" aria-label="Cantidad">
              <button data-action="inc" data-id="${product.id}" aria-label="Sumar" ${atMax ? "disabled" : ""}>&plus;</button>
            </div>
            <span class="cart-line__total">${formatPrice(product.price * qty)}</span>
          </div>
        </div>
      </div>`;
    })
    .join("");

  const subtotal = detailed.reduce((sum, { product, qty }) => sum + product.price * qty, 0);
  if (footerEl) {
    const subtotalEl = qs("#cartSubtotal", footerEl);
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  }

  itemsEl.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const cart = getCart();
      const line = cart.find((l) => l.productId === id);
      if (action === "remove") return removeFromCart(id);
      if (!line) return;
      if (action === "inc") {
        const found = detailed.find((d) => d.product.id === id);
        if (found && line.qty >= found.product.stock) return;
        setCartQty(id, line.qty + 1);
      }
      if (action === "dec") setCartQty(id, line.qty - 1);
    });
  });
}

function openCart() {
  qs(".cart-overlay")?.classList.add("is-open");
  qs(".cart-drawer")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  renderCartDrawer();
}

function closeCart() {
  qs(".cart-overlay")?.classList.remove("is-open");
  qs(".cart-drawer")?.classList.remove("is-open");
  document.body.style.overflow = "";
}

function initCartUI() {
  updateCartCount();
  qsa("[data-open-cart]").forEach((btn) => btn.addEventListener("click", openCart));
  qsa("[data-close-cart]").forEach((btn) => btn.addEventListener("click", closeCart));
  qs(".cart-overlay")?.addEventListener("click", closeCart);
}

document.addEventListener("DOMContentLoaded", initCartUI);
