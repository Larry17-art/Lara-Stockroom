# Stockroom

An inventory dashboard with full CRUD. Express.js backend, SQLite database (Node's built-in `node:sqlite`, no native build needed), and a dependency-free vanilla JS frontend.

## Features

- Create, read, update and delete products
- Live summary: product count, units in stock, inventory value, low-stock count
- Units-by-category breakdown
- Search by name or SKU, filter by category
- Server-side validation, unique SKUs, light and dark themes

## Requirements

Node.js 22.13 or newer.

## Quick start

```bash
npm install
npm start
```

Open http://localhost:3000. The SQLite file is created at `data/dashboard.db` and seeded with sample products on first run.

Configuration (optional): copy `.env.example` and set `PORT` or `DB_PATH` as environment variables.

## API

| Method | Endpoint             | Description                                   |
|--------|----------------------|-----------------------------------------------|
| GET    | `/api/products`      | List products (`?search=` and `?category=`)   |
| GET    | `/api/products/:id`  | Get one product                               |
| POST   | `/api/products`      | Create a product                              |
| PUT    | `/api/products/:id`  | Update a product                              |
| DELETE | `/api/products/:id`  | Delete a product                              |
| GET    | `/api/stats`         | Dashboard totals and category breakdown       |

Product body: `{ "name": "Mug", "sku": "KIT-030", "category": "Kitchen", "price": 14, "stock": 64 }`

## Project structure

```
server.js            Express app and /api/stats
db.js                SQLite connection, schema and seed data
routes/products.js   CRUD routes and validation
public/              Dashboard UI (HTML, CSS, JS)
```

## Switching to MySQL

Only `db.js` and the queries in `routes/products.js` and `server.js` touch the database. Swap in `mysql2` and adjust the SQL (`AUTO_INCREMENT`, `NOW()`) if you need MySQL.
