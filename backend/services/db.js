const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    })
  : null;

function isConfigured() {
  return Boolean(pool);
}

function query(text, params) {
  if (!pool) throw new Error("DATABASE_URL no esta configurada");
  return pool.query(text, params);
}

// Crea las tablas si no existen. Se puede correr en cada arranque sin riesgo:
// no borra ni pisa datos existentes.
async function init() {
  if (!pool) return;

  await query(`
    CREATE TABLE IF NOT EXISTS product_stock (
      product_id TEXT PRIMARY KEY,
      stock INTEGER NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      customer JSONB NOT NULL,
      items JSONB NOT NULL,
      subtotal INTEGER NOT NULL,
      shipping INTEGER NOT NULL,
      total INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      wompi_transaction_id TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  // Migracion: agrega la columna si la tabla ya existia de antes.
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'card'`);
}

module.exports = { query, init, isConfigured };
