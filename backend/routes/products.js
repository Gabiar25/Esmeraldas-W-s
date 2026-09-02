const express = require("express");
const store = require("../services/store");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    let products = await store.getProducts();
    if (category) products = products.filter((p) => p.category === category);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo cargar el catalogo" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await store.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo cargar el producto" });
  }
});

module.exports = router;
