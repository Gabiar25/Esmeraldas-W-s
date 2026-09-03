// Menu movil: panel lateral que entra desde la izquierda (igual patron que el carrito).
function openNav() {
  qs(".nav-overlay")?.classList.add("is-open");
  qs(".nav-drawer")?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  qs(".nav-toggle")?.setAttribute("aria-expanded", "true");
}

function closeNav() {
  qs(".nav-overlay")?.classList.remove("is-open");
  qs(".nav-drawer")?.classList.remove("is-open");
  document.body.style.overflow = "";
  qs(".nav-toggle")?.setAttribute("aria-expanded", "false");
}

// Marca como activo el link del menu que corresponde a la pagina/filtro
// actual (compara path + query string), en vez de depender de la clase
// "active" fija que venia escrita en el HTML de cada pagina.
function highlightActiveNav() {
  let path = window.location.pathname;
  if (path === "/") path = "/index.html";
  const current = path + window.location.search;
  const links = qsa(".main-nav a, .nav-drawer__links a");
  links.forEach((a) => a.classList.remove("active"));
  let matched = links.find((a) => a.getAttribute("href") === current);
  if (!matched && path === "/producto.html") {
    matched = links.find((a) => a.getAttribute("href") === "/catalogo.html");
  }
  matched?.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNav();

  const toggle = qs(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", openNav);
    qsa("[data-close-nav]").forEach((btn) => btn.addEventListener("click", closeNav));
    qs(".nav-overlay")?.addEventListener("click", closeNav);
  }

  // Home: mide el alto real del header para que el video del hero se
  // estire justo esa medida por detras (ver --header-h en styles.css).
  // El hero en si no se mueve, solo su video/overlay de fondo.
  if (document.body.classList.contains("has-hero")) {
    const header = qs(".site-header");
    if (header) {
      const syncHeaderHeight = () => {
        document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
      };
      syncHeaderHeight();
      window.addEventListener("resize", syncHeaderHeight);
    }
  }
});
