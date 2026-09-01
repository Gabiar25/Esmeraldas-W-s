// Logica de la pagina de detalle de producto.

const CAT_LABELS_P = { collares: "Collares", aretes: "Aretes", sets: "Sets" };

function relatedCard(p) {
  const soldOut = p.stock < 1;
  return `
  <article class="product-card">
    <a class="product-card__link" href="/producto.html?id=${p.id}">
      <div class="product-card__media">
        <img class="img-main" src="${productImage(p, 1)}" alt="${p.name}" loading="lazy">
        ${soldOut ? '<span class="badge badge-sold">Agotado</span>' : ""}
      </div>
    </a>
    <div class="product-card__info">
      <h3 class="product-card__name"><a class="product-card__link" href="/producto.html?id=${p.id}">${p.name}</a></h3>
      <p class="product-card__price">${formatPrice(p.price)}</p>
    </div>
  </article>`;
}

async function initProducto() {
  const id = getQueryParam("id");
  const root = qs("#productRoot");
  const product = id ? await fetchProduct(id) : null;

  if (!product) {
    root.innerHTML = '<p class="empty-state">No encontramos esta pieza. <a href="/catalogo.html">Volver al catálogo</a></p>';
    return;
  }

  document.title = `${product.name} — Esmeraldas W&S`;
  qs("#pageTitleTag").textContent = document.title;

  const soldOut = product.stock < 1;

  root.innerHTML = `
  <div class="product-detail">
    <div class="gallery">
      <div class="gallery__thumbs">
        ${product.images
          .map(
            (img, i) => `<button class="${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Ver foto ${i + 1}">
              <img src="${productImage(product, img)}" alt="${product.name} vista ${i + 1}">
            </button>`
          )
          .join("")}
      </div>
      <div id="galleryMain" class="gallery__main">
        ${product.images
          .map(
            (img, i) => `<div class="gallery__slide" data-index="${i}">
              <img src="${productImage(product, img, "full")}" alt="${product.name} vista ${i + 1}" loading="${i === 0 ? "eager" : "lazy"}">
            </div>`
          )
          .join("")}
      </div>
    </div>
    <div class="gallery__dots">
      ${product.images.map((_, i) => `<button class="${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Ir a la foto ${i + 1}"></button>`).join("")}
    </div>
    <div class="product-info">
      <p class="eyebrow">${CAT_LABELS_P[product.category] || ""}</p>
      <h1>${product.name}</h1>
      <p class="product-info__price">${formatPrice(product.price)}</p>
      <p class="product-info__desc">${product.description}</p>
      <p class="stock-note ${soldOut ? "out-stock" : "in-stock"}">
        ${soldOut ? "Esta pieza ya no está disponible" : "Pieza única disponible — 1 unidad en existencia"}
      </p>
      ${
        soldOut
          ? `<button class="btn btn-block" disabled>Agotado</button>`
          : `
        <div class="qty-row">
          <div class="qty-control">
            <button type="button" id="qtyDec" aria-label="Restar">&minus;</button>
            <input type="text" id="qtyInput" readonly value="1" aria-label="Cantidad">
            <button type="button" id="qtyInc" aria-label="Sumar">&plus;</button>
          </div>
        </div>
        <button class="btn btn-block" id="addToCartBtn">Agregar al carrito</button>
      `
      }
      <ul class="product-info__meta">
        <li>Hecho a mano — baño de oro</li>
        <li>Envío asegurado a toda Colombia</li>
        <li>Pieza única: no se vuelve a fabricar una vez vendida</li>
      </ul>
    </div>
  </div>`;

  const track = qs("#galleryMain");
  const slides = qsa(".gallery__slide", track);
  const thumbButtons = qsa(".gallery__thumbs button");
  const dotButtons = qsa(".gallery__dots button");

  function setActiveSlide(index) {
    thumbButtons.forEach((b) => b.classList.toggle("active", Number(b.dataset.index) === index));
    dotButtons.forEach((b) => b.classList.toggle("active", Number(b.dataset.index) === index));
  }

  function goToSlide(index) {
    slides[index]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  [...thumbButtons, ...dotButtons].forEach((btn) => {
    btn.addEventListener("click", () => goToSlide(Number(btn.dataset.index)));
  });

  if (slides.length > 1) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveSlide(Number(visible.target.dataset.index));
      },
      { root: track, threshold: 0.6 }
    );
    slides.forEach((slide) => observer.observe(slide));
  }

  if (!soldOut) {
    let qty = 1;
    const maxQty = Math.max(1, product.stock);
    const qtyInput = qs("#qtyInput");
    qs("#qtyInc").addEventListener("click", () => {
      qty = Math.min(maxQty, qty + 1);
      qtyInput.value = qty;
    });
    qs("#qtyDec").addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qtyInput.value = qty;
    });
    qs("#addToCartBtn").addEventListener("click", () => {
      addToCart(product.id, qty);
      showToast("Agregado al carrito");
    });
  }

  const all = await fetchProducts();
  const related = all.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  qs("#relatedGrid").innerHTML = related.map(relatedCard).join("") || '<p class="empty-state">Más piezas próximamente.</p>';
}

initProducto();
