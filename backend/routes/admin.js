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

const FULFILLMENT_STATUSES = ["PENDING", "FULFILLED", "CANCELLED"];

// Estado de gestion propio del dueño (entregado/cancelado + nota), separado
// del "status" que refleja el estado de la transaccion de Wompi.
router.patch("/orders/:id", requireAdmin, async (req, res) => {
  try {
    const order = await store.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido no encontrado" });

    const { fulfillmentStatus, notes } = req.body || {};
    if (fulfillmentStatus !== undefined) {
      if (!FULFILLMENT_STATUSES.includes(fulfillmentStatus)) {
        return res.status(400).json({ error: "Estado invalido" });
      }
      order.fulfillmentStatus = fulfillmentStatus;
    }
    if (notes !== undefined) {
      order.notes = String(notes).slice(0, 2000);
    }
    order.updatedAt = new Date().toISOString();

    await store.saveOrder(order);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo actualizar el pedido" });
  }
});

module.exports = router;
