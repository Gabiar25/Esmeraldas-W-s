// Genera backend/public/sitemap.xml a partir de products.json.
// Correr de nuevo cada vez que se agreguen o quiten productos.
// Uso: node scripts/generate_sitemap.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://www.joyeriaws.com";
const products = require(path.join(ROOT, "backend", "data", "products.json"));
const today = new Date().toISOString().slice(0, 10);

const staticUrls = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/catalogo.html", changefreq: "weekly", priority: "0.9" },
  { loc: "/catalogo.html?categoria=collares", changefreq: "weekly", priority: "0.8" },
  { loc: "/catalogo.html?categoria=aretes", changefreq: "weekly", priority: "0.8" },
  { loc: "/catalogo.html?categoria=sets", changefreq: "weekly", priority: "0.8" },
  { loc: "/informacion.html", changefreq: "monthly", priority: "0.5" },
];

const productUrls = products.map((p) => ({
  loc: `/producto.html?id=${p.id}`,
  changefreq: "monthly",
  priority: "0.7",
}));

const urls = [...staticUrls, ...productUrls];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const dest = path.join(ROOT, "backend", "public", "sitemap.xml");
fs.writeFileSync(dest, xml);
console.log(`Listo: ${urls.length} URLs -> ${dest}`);
