// Arma el CSV del catalogo de productos para Meta Commerce Manager.
// Usado por server.js (ruta /meta-catalog-feed.csv, siempre con datos
// frescos) y por scripts/generate_meta_feed.js (copia local opcional).

const SITE_URL = "https://www.joyeriaws.com";
const BRAND = "Esmeraldas W&S";

const FEED_HEADER = [
  "id", "title", "description", "availability", "condition",
  "price", "link", "image_link", "additional_image_link", "brand",
];

function csvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// products.json lista los productos agrupados por categoria (todos los
// collares, despues aretes, despues sets) -- perfecto para el catalogo del
// sitio, pero como catalogo nuevo de Meta todavia no tiene historial para
// personalizar, al principio tiende a mostrar el feed casi en orden. Esto
// intercala las categorias (collar, arete, set, collar, set...) solo para
// el feed publicitario, para que los anuncios muestren variedad desde el
// primer momento sin tener que reordenar products.json (que sigue
// controlando el orden del catalogo de la pagina).
function interleaveByCategory(products) {
  const groups = new Map();
  for (const p of products) {
    if (!groups.has(p.category)) groups.set(p.category, []);
    groups.get(p.category).push(p);
  }
  const buckets = [...groups.values()];
  const result = [];
  let added = true;
  while (added) {
    added = false;
    for (const bucket of buckets) {
      if (bucket.length) {
        result.push(bucket.shift());
        added = true;
      }
    }
  }
  return result;
}

function buildFeedCsv(products) {
  const rows = interleaveByCategory(products).map((p) => {
    const images = p.images.map((img) => `${SITE_URL}/assets/images/${p.id}/${img}-full.jpg`);
    return [
      p.id,
      p.name,
      p.description,
      p.stock > 0 ? "in stock" : "out of stock",
      "new",
      `${p.price} COP`,
      `${SITE_URL}/producto.html?id=${p.id}`,
      images[0],
      images.slice(1).join(","),
      BRAND,
    ].map(csvField).join(",");
  });

  return [FEED_HEADER.join(","), ...rows].join("\n") + "\n";
}

module.exports = { buildFeedCsv };
