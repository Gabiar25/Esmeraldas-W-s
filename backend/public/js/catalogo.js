// Logica de la pagina de catalogo: filtros por categoria, orden y grid.

const CAT_LABELS = { collares: "Collares", aretes: "Aretes", sets: "Sets" };
const CAT_CARD_LABEL = { collares: "Dije + Cadena", aretes: "Aretes", sets: "Cadena + Dije + Aretes" };

function renderProductCard(p) {
  const soldOut = p.stock < 1;
  return `
  <article class="product-card">
    <div class="product-card__media">
      <a class="product-card__link" href="/producto.html?id=${p.id}">
        <img class="img-main" src="${productImage(p, 1)}" alt="${p.name}" loading="lazy">
        ${p.images.length > 1 ? `<img class="img-alt" src="${productImage(p, 2)}" alt="" loading="lazy">` : ""}
      </a>
      ${soldOut ? '<span class="badge badge-sold">Agotado</span>' : ""}
    </div>
    <div class="product-card__info">
      <p class="product-card__cat">${CAT_CARD_LABEL[p.category] || ""}</p>
      <h3 class="product-card__name"><a class="product-card__link" href="/producto.html?id=${p.id}">${p.name}</a></h3>
      <p class="product-card__price">${formatPrice(p.price)}</p>
      ${!soldOut ? `<div class="quick-add"><button class="btn btn-block" data-quick-add="${p.id}">Agregar al carrito</button></div>` : ""}
    </div>
  </article>`;
}

function wireQuickAdd(scope) {
  qsa("[data-quick-add]", scope).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      addToCart(btn.dataset.quickAdd, 1);
      showToast("Agregado al carrito");
    });
  });
}

async function initCatalogo() {
  const grid = qs("#productGrid");
  const products = await fetchProducts();

  const state = {
    cat: getQueryParam("categoria") || "",
    sort: "relevancia",
  };

  function applyChipState() {
    qsa(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.cat === state.cat);
    });
    qs("#pageTitle").textContent = state.cat ? CAT_LABELS[state.cat] || "Todas las piezas" : "Todas las piezas";
  }

  function render() {
    let list = state.cat ? products.filter((p) => p.category === state.cat) : products.slice();

    if (state.sort === "precio-asc") list.sort((a, b) => a.price - b.price);
    if (state.sort === "precio-desc") list.sort((a, b) => b.price - a.price);
    if (state.sort === "nombre") list.sort((a, b) => a.name.localeCompare(b.name));

    qs("#resultsCount").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;

    grid.innerHTML = list.length
      ? list.map(renderProductCard).join("")
      : '<p class="empty-state">No hay productos en esta categoría todavía.</p>';

    wireQuickAdd(grid);
  }

  qsa(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.cat = chip.dataset.cat;
      const url = new URL(window.location);
      if (state.cat) url.searchParams.set("categoria", state.cat);
      else url.searchParams.delete("categoria");
      window.history.replaceState({}, "", url);
      applyChipState();
      render();
    });
  });

  qs("#sortSelect").addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });

  applyChipState();
  render();
}

initCatalogo();
