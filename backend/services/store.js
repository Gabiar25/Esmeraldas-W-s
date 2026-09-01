const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// Cola simple para serializar escrituras al archivo de pedidos y evitar
// que dos guardados concurrentes se pisen entre si.
let writeQueue = Promise.resolve();

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  const raw = fs.readFileSync(file, "utf-8").trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

function getProducts() {
  return readJson(PRODUCTS_FILE, []);
}

function getProduct(id) {
  return getProducts().find((p) => p.id === id) || null;
}

function getOrders() {
  return readJson(ORDERS_FILE, []);
}

function getOrder(id) {
  return getOrders().find((o) => o.id === id) || null;
}

function getOrderByReference(reference) {
  return getOrders().find((o) => o.reference === reference) || null;
}

function saveOrder(order) {
  writeQueue = writeQueue.then(() => {
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) orders[idx] = order;
    else orders.push(order);
    writeJsonAtomic(ORDERS_FILE, orders);
  });
  return writeQueue;
}

// Descuenta stock de cada producto vendido en un pedido aprobado. Las piezas
// son artesanales y unicas (stock 1), asi que al aprobarse un pago la pieza
// deja de estar disponible para otros compradores.
function decrementStockForOrder(order) {
  writeQueue = writeQueue.then(() => {
    const products = getProducts();
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) product.stock = Math.max(0, product.stock - item.qty);
    }
    writeJsonAtomic(PRODUCTS_FILE, products);
  });
  return writeQueue;
}

module.exports = {
  getProducts,
  getProduct,
  getOrders,
  getOrder,
  getOrderByReference,
  saveOrder,
  decrementStockForOrder,
};
