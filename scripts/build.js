// Arma backend/public/*.html a partir de src/pages/ + src/partials/.
// El header, footer y los paneles (menu movil / carrito) viven una sola vez
// en src/partials/ y se insertan en cada pagina via marcadores
// <!--include:nombre-->, en vez de estar copiados y pegados en cada HTML.
//
// Flujo: editar los archivos en src/, despues correr:
//   node scripts/build.js
// (o npm start, que lo corre solo antes de arrancar el servidor)
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "src", "pages");
const PARTIALS_DIR = path.join(ROOT, "src", "partials");
const DEST_DIR = path.join(ROOT, "backend", "public");

function loadPartials() {
  const partials = {};
  for (const file of fs.readdirSync(PARTIALS_DIR)) {
    if (!file.endsWith(".html")) continue;
    partials[file.replace(/\.html$/, "")] = fs.readFileSync(path.join(PARTIALS_DIR, file), "utf8").replace(/\n$/, "");
  }
  return partials;
}

function build() {
  const partials = loadPartials();
  const pages = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith(".html"));

  for (const file of pages) {
    let html = fs.readFileSync(path.join(PAGES_DIR, file), "utf8");
    html = html.replace(/<!--include:([a-z0-9-]+)-->/g, (match, name) => {
      if (!(name in partials)) throw new Error(`${file}: no existe el partial "${name}"`);
      return partials[name];
    });
    fs.writeFileSync(path.join(DEST_DIR, file), html);
  }
  console.log(`Listo: ${pages.length} paginas generadas en backend/public/.`);
}

build();
