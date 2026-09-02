const express = require("express");
const crypto = require("crypto");
const store = require("../services/store");

const router = express.Router();

// Compara la clave con tiempo constante (evita filtrar por cuanto tarda la
// comparacion) y sin reventar si las claves tienen largos distintos.
function passwordMatches(candidate) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !candidate) return false;
  const a = Buffer.from(String(candidate));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: "El panel de pedidos aun no esta configurado (falta ADMIN_PASSWORD)." });
  }
  if (!passwordMatches(req.get("x-admin-password"))) {
    return res.status(401).json({ error: "Clave incorrecta" });
  }
  next();
}

router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await store.getOrders();
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudieron cargar los pedidos" });
  }
});

module.exports = router;
