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

function buildFeedCsv(products) {
  const rows = products.map((p) => {
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
