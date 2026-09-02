const express = require("express");
const crypto = require("crypto");
const store = require("../services/store");
const wompi = require("../services/wompi");
const shipping = require("../services/shipping");
const notify = require("../services/notify");

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
    paymentMethod: order.paymentMethod,
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
// (nunca se confia en el precio que manda el navegador). Segun el metodo
// de pago elegido, devuelve lo necesario para abrir el widget de Wompi,
// o confirma directamente el pedido si es contra entrega.
router.post("/", async (req, res) => {
  try {
    const { customer, items, paymentMethod } = req.body || {};
    const method = paymentMethod === "cod" ? "cod" : "card";

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
    const shippingCost = shipping.getShippingCost(customer.department);
    const total = subtotal + shippingCost;

    const id = `WS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const now = new Date().toISOString();

    const order = {
      id,
      reference: id,
      customer,
      items: orderItems,
      subtotal,
      shipping: shippingCost,
      total,
      currency: "COP",
      status: "PENDING",
      paymentMethod: method,
      wompiTransactionId: null,
      createdAt: now,
      updatedAt: now,
    };

    await store.saveOrder(order);

    // Contra entrega: el pedido queda confirmado de una vez (se paga al
    // recibir), asi que la pieza se reserva/descuenta del stock ya mismo
    // para que no se le pueda vender a otro cliente mientras se entrega.
    if (method === "cod") {
      await store.decrementStockForOrder(order);
      notify.notifyNewOrder(order);
      return res.status(201).json({
        order: publicOrder(order),
        payment: { available: false, method: "cod" },
      });
    }

    if (!wompi.isConfigured()) {
      return res.status(201).json({
        order: publicOrder(order),
        payment: { available: false, method: "wompi_unconfigured", reason: "La pasarela de pagos aun no esta configurada." },
      });
    }

    const amountInCents = total * 100;
    const checkoutUrl = wompi.buildCheckoutUrl({
      amountInCents,
      reference: order.reference,
      currency: order.currency,
      redirectUrl: `${process.env.SITE_URL || ""}/pedido-confirmado.html?order=${order.id}`,
      customerData: {
        email: customer.email,
        phoneNumber: customer.phone,
        phoneNumberPrefix: "+57",
        fullName: customer.name,
        legalId: customer.docNumber,
        legalIdType: customer.docType,
      },
    });

    res.status(201).json({
      order: publicOrder(order),
      payment: {
        available: true,
        method: "card",
        checkoutUrl,
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
      notify.notifyNewOrder(order);
    }

    res.json(publicOrder(order));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo confirmar el pedido" });
  }
});

module.exports = router;
