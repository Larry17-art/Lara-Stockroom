const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'dashboard.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    sku        TEXT NOT NULL UNIQUE,
    category   TEXT NOT NULL DEFAULT 'General',
    price      REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
    stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed sample data on first run
if (db.prepare('SELECT COUNT(*) AS n FROM products').get().n === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, sku, category, price, stock) VALUES (?, ?, ?, ?, ?)'
  );
  const seed = [
    ['Walnut desk organizer', 'DSK-001', 'Office', 34.5, 42],
    ['Ceramic pour-over set', 'KIT-014', 'Kitchen', 48, 18],
    ['Linen apron', 'KIT-022', 'Kitchen', 26, 7],
    ['Brass desk lamp', 'LGT-005', 'Lighting', 89, 12],
    ['Notebook, dot grid (3-pack)', 'OFF-031', 'Office', 15, 130],
    ['Wool throw blanket', 'HOM-009', 'Home', 72, 5],
    ['Stoneware mug', 'KIT-030', 'Kitchen', 14, 64],
    ['Cork yoga mat', 'FIT-002', 'Fitness', 58, 0],
  ];
  db.exec('BEGIN');
  try {
    seed.forEach((row) => insert.run(...row));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = db;
