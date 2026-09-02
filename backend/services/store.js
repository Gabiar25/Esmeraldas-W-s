const fs = require("fs");
const path = require("path");
const db = require("./db");

const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");

function readCatalog() {
  const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8").trim();
  return raw ? JSON.parse(raw) : [];
}

// El catalogo (nombre, precio, descripcion, fotos) vive en products.json y se
// edita a mano / con git. El stock en cambio cambia solo (cuando se vende una
// pieza), asi que vive en la base de datos para no perderse en cada deploy.
async function seedStockFromCatalog() {
  if (!db.isConfigured()) return;
  const catalog = readCatalog();
  for (const product of catalog) {
    await db.query(
      "INSERT INTO product_stock (product_id, stock) VALUES ($1, $2) ON CONFLICT (product_id) DO NOTHING",
      [product.id, product.stock]
    );
  }
}

async function getProducts() {
  const catalog = readCatalog();
  if (!db.isConfigured()) return catalog;
  const { rows } = await db.query("SELECT product_id, stock FROM product_stock");
  const stockByProduct = new Map(rows.map((r) => [r.product_id, r.stock]));
  return catalog.map((p) => ({
    ...p,
    stock: stockByProduct.has(p.id) ? stockByProduct.get(p.id) : p.stock,
  }));
}

async function getProduct(id) {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

function rowToOrder(row) {
  return {
    id: row.id,
    reference: row.reference,
    customer: row.customer,
    items: row.items,
    subtotal: row.subtotal,
    shipping: row.shipping,
    total: row.total,
    currency: row.currency,
    status: row.status,
    paymentMethod: row.payment_method,
    wompiTransactionId: row.wompi_transaction_id,
    fulfillmentStatus: row.fulfillment_status,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function getOrders() {
  const { rows } = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(rowToOrder);
}

async function getOrder(id) {
  const { rows } = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  return rows[0] ? rowToOrder(rows[0]) : null;
}

async function getOrderByReference(reference) {
  const { rows } = await db.query("SELECT * FROM orders WHERE reference = $1", [reference]);
  return rows[0] ? rowToOrder(rows[0]) : null;
}

async function saveOrder(order) {
  await db.query(
    `INSERT INTO orders (id, reference, customer, items, subtotal, shipping, total, currency, status, payment_method, wompi_transaction_id, fulfillment_status, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       wompi_transaction_id = EXCLUDED.wompi_transaction_id,
       fulfillment_status = EXCLUDED.fulfillment_status,
       notes = EXCLUDED.notes,
       updated_at = EXCLUDED.updated_at`,
    [
      order.id,
      order.reference,
      JSON.stringify(order.customer),
      JSON.stringify(order.items),
      order.subtotal,
      order.shipping,
      order.total,
      order.currency,
      order.status,
      order.paymentMethod || "card",
      order.wompiTransactionId,
      order.fulfillmentStatus || "PENDING",
      order.notes || "",
      order.createdAt,
      order.updatedAt,
    ]
  );
}

// Descuenta stock de cada producto vendido en un pedido aprobado. Las piezas
// son artesanales y unicas (stock 1), asi que al aprobarse un pago la pieza
// deja de estar disponible para otros compradores. GREATEST evita que quede
// en negativo si por algun motivo se llama dos veces.
async function decrementStockForOrder(order) {
  for (const item of order.items) {
    await db.query("UPDATE product_stock SET stock = GREATEST(stock - $1, 0) WHERE product_id = $2", [
      item.qty,
      item.productId,
    ]);
  }
}

module.exports = {
  seedStockFromCatalog,
  getProducts,
  getProduct,
  getOrders,
  getOrder,
  getOrderByReference,
  saveOrder,
  decrementStockForOrder,
};
