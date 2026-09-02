const express = require("express");
const store = require("../services/store");
const wompi = require("../services/wompi");
const notify = require("../services/notify");

const router = express.Router();

// Wompi notifica aqui cada cambio de estado de una transaccion. Esta es la
// fuente de verdad definitiva del pago (mas confiable que el redirect del
// navegador, que el cliente podria cerrar antes de tiempo o manipular).
router.post("/wompi", async (req, res) => {
  try {
    const payload = req.body;

    if (!wompi.verifyWebhookSignature(payload)) {
      console.warn("Webhook de Wompi con firma invalida, se ignora");
      return res.status(400).json({ error: "Firma invalida" });
    }

    const transaction = payload?.data?.transaction;
    if (!transaction) return res.status(400).json({ error: "Payload sin transaccion" });

    const order = await store.getOrderByReference(transaction.reference);
    if (!order) {
      console.warn(`Webhook de Wompi: no existe pedido con referencia ${transaction.reference}`);
      return res.status(200).json({ received: true });
    }

    const wasApproved = order.status === "APPROVED";
    order.status = transaction.status;
    order.wompiTransactionId = transaction.id;
    order.updatedAt = new Date().toISOString();
    await store.saveOrder(order);

    if (!wasApproved && transaction.status === "APPROVED") {
      await store.decrementStockForOrder(order);
      notify.notifyNewOrder(order);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando el webhook" });
  }
});

module.exports = router;
