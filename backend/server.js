require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const wompi = require("./services/wompi");
const db = require("./services/db");
const store = require("./services/store");
const shipping = require("./services/shipping");

const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const webhooksRouter = require("./routes/webhooks");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// CSP desactivado a proposito: el widget de pago de Wompi inyecta su propio
// script/iframe desde checkout.wompi.co y una politica mal calibrada podria
// bloquear el pago sin que se note hasta que haya llaves reales conectadas.
// El resto de protecciones de helmet (nosniff, referrer-policy, etc.) siguen activas.
app.use(helmet({ contentSecurityPolicy: false }));

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Mas estricto que apiLimiter: protege la clave del panel de pedidos de
// intentos por fuerza bruta.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
});

app.use(express.json());

app.use("/api/products", apiLimiter, productsRouter);
app.use("/api/orders", orderLimiter, ordersRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/admin", adminLimiter, adminRouter);

app.get("/api/config", (req, res) => {
  res.json({ paymentsAvailable: wompi.isConfigured() });
});

app.get("/api/shipping-zones", (req, res) => {
  res.json({ departments: shipping.getAllDepartments() });
});

const SITE_URL = "https://www.joyeriaws.com";
const PRODUCTO_HTML_PATH = path.join(__dirname, "public", "producto.html");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

// producto.html es un archivo estatico que arma todo por JS -- sin esto,
// las 17 fichas de producto compartian el mismo <title>/descripcion
// generico hasta que el navegador corria el JS, lo que es malo para SEO
// (contenido duplicado) y puede hacer que Google indexe la version
// generica en vez de la del producto real. Esta ruta intercepta la
// peticion antes que express.static y rellena los meta tags + JSON-LD
// con los datos reales del producto pedido, directo en el HTML.
app.get("/producto.html", async (req, res, next) => {
  try {
    const product = req.query.id ? await store.getProduct(req.query.id) : null;
    let html = fs.readFileSync(PRODUCTO_HTML_PATH, "utf-8");

    if (product) {
      const title = escapeHtml(`${product.name} — Esmeraldas W&S`);
      const description = escapeHtml(product.description);
      const image = `${SITE_URL}/assets/images/${product.id}/1-full.jpg`;
      const url = `${SITE_URL}/producto.html?id=${encodeURIComponent(product.id)}`;

      html = html
        .replace(/<title id="pageTitleTag">[^<]*<\/title>/, `<title id="pageTitleTag">${title}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
        .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`)
        .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`)
        .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`)
        .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
        .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`)
        .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`)
        .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`);

      const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        name: product.name,
        image: product.images.map((img) => `${SITE_URL}/assets/images/${product.id}/${img}-full.jpg`),
        description: product.description,
        sku: product.id,
        brand: { "@type": "Brand", name: "Esmeraldas W&S" },
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "COP",
          price: product.price,
          availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      };
      html = html.replace("</head>", `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`);
    }

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    next(err);
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

(async () => {
  if (!db.isConfigured()) {
    console.log(
      "Aviso: DATABASE_URL no esta configurada. Los pedidos y el stock no se guardaran de forma permanente."
    );
  } else {
    await db.init();
    await store.seedStockFromCatalog();
  }

  app.listen(PORT, () => {
    console.log(`Esmeraldas W&S escuchando en http://localhost:${PORT}`);
    if (!wompi.isConfigured()) {
      console.log(
        "Aviso: Wompi no esta configurado (.env con llaves de prueba). El sitio funciona, pero el pago con tarjeta se desactiva hasta que completes backend/.env"
      );
    }
  });
})();
