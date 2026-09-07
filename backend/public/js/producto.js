// Logica de la pagina de detalle de producto.

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

  // El <title>/meta description/JSON-LD ya vienen rellenados por el
  // servidor (ver server.js) con los datos reales del producto -- esto
  // solo confirma el titulo por si el usuario navega entre productos
  // sin recargar la pagina completa.
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
      <div class="gallery__main-frame">
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
    </div>
    <div class="gallery__dots">
      ${product.images.map((_, i) => `<button class="${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Ir a la foto ${i + 1}"></button>`).join("")}
    </div>
    <div class="product-info">
      <p class="eyebrow">${CATEGORY_CARD_LABELS[product.category] || ""}</p>
      <h1>${product.name}</h1>
      <p class="product-info__price">${formatPrice(product.price)}</p>
      <p class="product-info__desc">${product.description}</p>
      <p class="stock-note ${soldOut ? "out-stock" : "in-stock"}">
        ${soldOut ? "Esta pieza ya no está disponible" : "Pieza única disponible — 1 unidad en existencia"}
      </p>
      ${
        soldOut
          ? `<button class="btn btn-block" disabled>Agotado</button>
        <div class="soldout-cta">
          <p>Esta pieza ya se vendió — al ser hecha a mano, no volvemos a fabricar una idéntica. Pero si te gustó este diseño, podemos elaborarte una similar bajo pedido y cotizarte el precio.</p>
          <a class="btn btn-outline btn-block" href="https://wa.me/573006911778?text=${encodeURIComponent(`Hola, me gustaría cotizar una pieza similar a "${product.name}" que vi en la página`)}" target="_blank" rel="noopener">Cotizar pieza similar por WhatsApp</a>
        </div>`
          : `
        <div class="qty-row">
          <div class="qty-control">
            <button type="button" id="qtyDec" aria-label="Restar">&minus;</button>
            <input type="text" id="qtyInput" readonly value="1" aria-label="Cantidad">
            <button type="button" id="qtyInc" aria-label="Sumar">&plus;</button>
          </div>
        </div>
        <button class="btn btn-outline btn-block" id="addToCartBtn">Agregar al carrito</button>
        <button class="btn btn-block btn-cart" id="buyNowBtn">Comprar ahora</button>
        <div class="product-purchase-note">
          <p class="product-purchase-note__secure">Compra 100% segura con Wompi, con cualquier medio de pago (tarjeta, PSE o Nequi).</p>
          <div class="pickup-box">
            <p>Recogida en <strong>Esmeraldas W&amp;S</strong></p>
            <p>Oficina en Bogotá — lista 1 día hábil después de tu compra.</p>
            <a href="/informacion.html">Ver información de envíos y retiro</a>
          </div>
          <p class="product-purchase-note__more">Revisa el carrito para ver el costo de envío y más información.</p>
        </div>
      `
      }
      <div class="product-tabs">
        <div class="product-tabs__nav">
          <button type="button" class="product-tabs__btn active" data-tab="desc">Descripción</button>
          <button type="button" class="product-tabs__btn" data-tab="care">Cuidados</button>
          <button type="button" class="product-tabs__btn" data-tab="shipping">Envío</button>
        </div>
        <div class="product-tabs__panel active" data-panel="desc">
          <ul>
            ${product.dimensions ? `<li>${product.dimensions}</li>` : ""}
            <li>Incluye certificado de joyería</li>
            <li>Pieza única: al agotarse, podemos elaborar una similar bajo pedido (cotización aparte)</li>
          </ul>
        </div>
        <div class="product-tabs__panel" data-panel="care">
          <h3>Cuidados de la joya</h3>
          <ul>
            <li>No expongas tu joya a lociones, cremas, cosméticos o perfumes ya que estas pueden ocasionar un cambio de color en la joya.</li>
            <li>Guarda tus joyas por separado, en lo posible, en la bolsita de tela entregada por nosotros.</li>
            <li>No hagas ejercicio con tu joya (el sudor genera desgaste).</li>
            <li>Evita llevarla a la piscina o playa.</li>
            <li>Límpiala utilizando un paño suave de tela, para mantener su color y brillo por más tiempo.</li>
            <li>Evita caídas y golpes.</li>
          </ul>
        </div>
        <div class="product-tabs__panel" data-panel="shipping">
          <p>Enviamos a toda Colombia. Una vez confirmado el pago, empacamos tu pieza con cuidado y coordinamos el envío contigo por WhatsApp o correo electrónico con el número de guía.</p>
          <p>El costo de envío se calcula según tu departamento al momento de pagar. Pago contra entrega disponible solo en Bogotá D.C.</p>
        </div>
      </div>
    </div>
  </div>`;

  qsa(".product-tabs__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa(".product-tabs__btn").forEach((b) => b.classList.toggle("active", b === btn));
      qsa(".product-tabs__panel").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panel === btn.dataset.tab);
      });
    });
  });

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
    qs("#buyNowBtn").addEventListener("click", () => {
      addToCart(product.id, qty);
      window.location.href = "/checkout.html";
    });
  }

  const all = await fetchProducts();
  const others = all.filter((p) => p.id !== product.id);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const related = others.slice(0, 4);
  qs("#relatedGrid").innerHTML = related.map(relatedCard).join("") || '<p class="empty-state">Más piezas próximamente.</p>';
}

initProducto();
