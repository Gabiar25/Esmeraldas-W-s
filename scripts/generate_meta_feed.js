// Genera backend/public/meta-catalog-feed.csv: el feed de productos que se
// conecta en Meta Commerce Manager para el catalogo de anuncios (carrusel /
// dinamicos) y para que el Pixel (ver server.js) pueda enriquecer eventos
// como ViewContent con datos del catalogo.
// Usa el stock real de la base de datos (igual que la API /api/products),
// no solo el valor semilla de products.json, para que "availability"
// refleje lo que el cliente ve en la pagina.
// Correr de nuevo cada vez que cambien productos, precios, fotos o stock:
// Uso: node scripts/generate_meta_feed.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// No usamos el paquete "dotenv" aca porque node_modules vive dentro de
// backend/, no en la raiz del repo (scripts/ es hermano de backend/, no
// hijo) -- asi que leemos backend/.env a mano para tener DATABASE_URL
// disponible antes de cargar services/db.js.
const envPath = path.join(ROOT, "backend", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] || "").trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

const store = require(path.join(ROOT, "backend", "services", "store"));
const SITE = "https://www.joyeriaws.com";
const BRAND = "Esmeraldas W&S";

function csvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function main() {
  const products = await store.getProducts();

  const header = [
    "id", "title", "description", "availability", "condition",
    "price", "link", "image_link", "additional_image_link", "brand",
  ];

  const rows = products.map((p) => {
    const images = p.images.map((img) => `${SITE}/assets/images/${p.id}/${img}-full.jpg`);
    return [
      p.id,
      p.name,
      p.description,
      p.stock > 0 ? "in stock" : "out of stock",
      "new",
      `${p.price} COP`,
      `${SITE}/producto.html?id=${p.id}`,
      images[0],
      images.slice(1).join(","),
      BRAND,
    ].map(csvField).join(",");
  });

  const csv = [header.join(","), ...rows].join("\n") + "\n";
  const dest = path.join(ROOT, "backend", "public", "meta-catalog-feed.csv");
  fs.writeFileSync(dest, csv);
  console.log(`Listo: ${products.length} productos -> ${dest}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
