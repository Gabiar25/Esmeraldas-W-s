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

document.addEventListener("DOMContentLoaded", () => {
  const toggle = qs(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", openNav);
    qsa("[data-close-nav]").forEach((btn) => btn.addEventListener("click", closeNav));
    qs(".nav-overlay")?.addEventListener("click", closeNav);
  }

  // Home: el header flota transparente sobre el hero, asi que el hero
  // se sube (margen negativo) para quedar justo debajo del header.
  if (document.body.classList.contains("has-hero")) {
    const header = qs(".site-header");
    const hero = qs(".hero");
    if (header && hero) {
      const syncHeroOverlap = () => {
        hero.style.marginTop = `-${header.offsetHeight}px`;
      };
      syncHeroOverlap();
      window.addEventListener("resize", syncHeroOverlap);
    }
  }
});
