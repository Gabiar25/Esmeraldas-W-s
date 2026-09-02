require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const wompi = require("./services/wompi");
const db = require("./services/db");
const store = require("./services/store");

const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const webhooksRouter = require("./routes/webhooks");

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

app.use(express.json());

app.use("/api/products", apiLimiter, productsRouter);
app.use("/api/orders", orderLimiter, ordersRouter);
app.use("/api/webhooks", webhooksRouter);

app.get("/api/config", (req, res) => {
  res.json({ paymentsAvailable: wompi.isConfigured() });
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
