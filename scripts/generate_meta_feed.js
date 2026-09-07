// Genera una copia local de backend/public/meta-catalog-feed.csv.
// Ya NO hace falta correrlo para que el feed funcione: server.js sirve
// /meta-catalog-feed.csv al vuelo con el stock real de la base de datos en
// cada pedido (ver backend/services/metaFeed.js). Este script queda solo
// como utilidad para inspeccionar el CSV en local o subirlo a mano si
// alguna vez hace falta el metodo de "subir archivo" en vez de URL.
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
const { buildFeedCsv } = require(path.join(ROOT, "backend", "services", "metaFeed"));

async function main() {
  const products = await store.getProducts();
  const csv = buildFeedCsv(products);
  const dest = path.join(ROOT, "backend", "meta-catalog-feed.local.csv");
  fs.writeFileSync(dest, csv);
  console.log(`Listo: ${products.length} productos -> ${dest}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
