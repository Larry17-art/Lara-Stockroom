const express = require('express');
const path = require('path');
const db = require('./db');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;
const LOW_STOCK = 10;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', productsRouter);

// Dashboard summary numbers
app.get('/api/stats', (req, res) => {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS products,
              COALESCE(SUM(stock), 0) AS units,
              COALESCE(SUM(price * stock), 0) AS value,
              COALESCE(SUM(CASE WHEN stock <= ? THEN 1 ELSE 0 END), 0) AS lowStock
       FROM products`
    )
    .get(LOW_STOCK);
  const categories = db
    .prepare(
      `SELECT category, COUNT(*) AS products, SUM(stock) AS units
       FROM products GROUP BY category ORDER BY units DESC`
    )
    .all();
  res.json({ ...totals, lowStockThreshold: LOW_STOCK, categories });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => console.log(`Stockroom running at http://localhost:${PORT}`));
