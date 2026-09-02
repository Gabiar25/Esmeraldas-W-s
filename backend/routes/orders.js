const express = require("express");
const crypto = require("crypto");
const store = require("../services/store");
const wompi = require("../services/wompi");

const router = express.Router();

const REQUIRED_CUSTOMER_FIELDS = [
  "name",
  "email",
  "phone",
  "docType",
  "docNumber",
  "address",
  "city",
  "department",
];

function validateCustomer(customer) {
  if (!customer || typeof customer !== "object") return "Faltan los datos del cliente";
  for (const field of REQUIRED_CUSTOMER_FIELDS) {
    if (!String(customer[field] || "").trim()) return `El campo "${field}" es obligatorio`;
  }
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) return "El correo no es valido";
  return null;
}

function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt,
    customerName: order.customer.name,
  };
}

// Crea el pedido en estado PENDIENTE, recalcula precios en el servidor
// (nunca se confia en el precio que manda el navegador) y si Wompi esta
// configurado devuelve todo lo necesario para abrir el widget de pago.
router.post("/", async (req, res) => {
  try {
    const { customer, items } = req.body || {};

    const customerError = validateCustomer(customer);
    if (customerError) return res.status(400).json({ error: customerError });

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "El carrito esta vacio" });
    }

    const orderItems = [];
    for (const line of items) {
      const product = await store.getProduct(line.productId);
      if (!product) return res.status(400).json({ error: `Producto invalido: ${line.productId}` });
      const qty = Number(line.qty) || 0;
      if (qty < 1) return res.status(400).json({ error: `Cantidad invalida para ${product.name}` });
      if (qty > product.stock) {
        return res.status(409).json({ error: `"${product.name}" ya no tiene suficientes unidades disponibles` });
      }
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        qty,
        image: `/assets/images/${product.id}/1-card.jpg`,
      });
    }

    const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.qty, 0);
    const shipping = Number(process.env.SHIPPING_COST || 0);
    const total = subtotal + shipping;

    const id = `WS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const now = new Date().toISOString();

    const order = {
      id,
      reference: id,
      customer,
      items: orderItems,
      subtotal,
      shipping,
      total,
      currency: "COP",
      status: "PENDING",
      wompiTransactionId: null,
      createdAt: now,
      updatedAt: now,
    };

    await store.saveOrder(order);

    if (!wompi.isConfigured()) {
      return res.status(201).json({
        order: publicOrder(order),
        payment: { available: false, reason: "La pasarela de pagos aun no esta configurada." },
      });
    }

    const amountInCents = total * 100;
    const signature = wompi.buildIntegritySignature({
      reference: order.reference,
      amountInCents,
      currency: order.currency,
    });

    res.status(201).json({
      order: publicOrder(order),
      payment: {
        available: true,
        publicKey: process.env.WOMPI_PUBLIC_KEY,
        currency: order.currency,
        amountInCents,
        reference: order.reference,
        signature,
        redirectUrl: `${process.env.SITE_URL || ""}/pedido-confirmado.html?order=${order.id}`,
        customerData: {
          email: customer.email,
          phoneNumber: customer.phone,
          phoneNumberPrefix: "+57",
          fullName: customer.name,
          legalId: customer.docNumber,
          legalIdType: customer.docType,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo crear el pedido" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await store.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido no encontrado" });
    res.json(publicOrder(order));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo consultar el pedido" });
  }
});

// La pagina de confirmacion llega aqui con el id de transaccion que Wompi
// agrega al redirectUrl. Consultamos la transaccion real en la API de Wompi
// (no confiamos solo en el parametro de la URL) y actualizamos el pedido.
router.post("/:id/confirm", async (req, res) => {
  try {
    const order = await store.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido no encontrado" });

    const { transactionId } = req.body || {};
    if (!transactionId) return res.status(400).json({ error: "Falta transactionId" });
    if (!wompi.isConfigured()) return res.status(409).json({ error: "Pagos no configurados" });

    const transaction = await wompi.fetchTransaction(transactionId);
    if (!transaction || transaction.reference !== order.reference) {
      return res.status(400).json({ error: "La transaccion no corresponde a este pedido" });
    }

    const wasApproved = order.status === "APPROVED";
    order.status = transaction.status;
    order.wompiTransactionId = transaction.id;
    order.updatedAt = new Date().toISOString();
    await store.saveOrder(order);

    if (!wasApproved && transaction.status === "APPROVED") {
      await store.decrementStockForOrder(order);
    }

    res.json(publicOrder(order));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo confirmar el pedido" });
  }
});

module.exports = router;
