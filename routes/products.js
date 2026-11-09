const express = require('express');
const db = require('../db');

const router = express.Router();

function validate(body) {
  const errors = [];
  const name = String(body.name ?? '').trim();
  const sku = String(body.sku ?? '').trim();
  const category = String(body.category ?? '').trim() || 'General';
  const price = Number(body.price);
  const stock = Number(body.stock);

  if (!name) errors.push('Name is required.');
  if (!sku) errors.push('SKU is required.');
  if (!Number.isFinite(price) || price < 0) errors.push('Price must be 0 or more.');
  if (!Number.isInteger(stock) || stock < 0) errors.push('Stock must be a whole number, 0 or more.');

  return { errors, value: { name, sku, category, price, stock } };
}

// List (supports ?search= and ?category=)
router.get('/', (req, res) => {
  const { search = '', category = '' } = req.query;
  const rows = db
    .prepare(
      `SELECT * FROM products
       WHERE (name LIKE @q OR sku LIKE @q)
         AND (@category = '' OR category = @category)
       ORDER BY updated_at DESC, id DESC`
    )
    .all({ q: `%${search}%`, category });
  res.json(rows);
});

// Read one
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found.' });
  res.json(row);
});

// Create
router.post('/', (req, res) => {
  const { errors, value } = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  try {
    const info = db
      .prepare(
        'INSERT INTO products (name, sku, category, price, stock) VALUES (@name, @sku, @category, @price, @stock)'
      )
      .run(value);
    res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.status(409).json({ error: `SKU "${value.sku}" is already in use.` });
    throw err;
  }
});

// Update
router.put('/:id', (req, res) => {
  const { errors, value } = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  try {
    const info = db
      .prepare(
        `UPDATE products
         SET name=@name, sku=@sku, category=@category, price=@price, stock=@stock,
             updated_at=datetime('now')
         WHERE id=@id`
      )
      .run({ ...value, id: req.params.id });
    if (!info.changes) return res.status(404).json({ error: 'Product not found.' });
    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.status(409).json({ error: `SKU "${value.sku}" is already in use.` });
    throw err;
  }
});

// Delete
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Product not found.' });
  res.status(204).end();
});

module.exports = router;
