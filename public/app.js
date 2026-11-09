const $ = (sel) => document.querySelector(sel);
const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat();

let products = [];
let editingId = null;
let deleteId = null;
let lowThreshold = 10;

// ---------- API ----------
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

// ---------- Rendering ----------
function esc(value) {
  const el = document.createElement('div');
  el.textContent = value;
  return el.innerHTML;
}

function stockPill(stock) {
  if (stock === 0) return '<span class="pill out">Out of stock</span>';
  if (stock <= lowThreshold) return `<span class="pill low">${stock} left</span>`;
  return `<span class="pill ok">${number.format(stock)}</span>`;
}

function renderRows() {
  $('#rows').innerHTML = products
    .map(
      (p) => `
      <tr>
        <td class="name">${esc(p.name)}<small>${esc(p.sku)}</small></td>
        <td>${esc(p.category)}</td>
        <td class="num">${money.format(p.price)}</td>
        <td class="num">${stockPill(p.stock)}</td>
        <td class="actions">
          <button class="btn small" data-edit="${p.id}">Edit</button>
          <button class="btn small del" data-delete="${p.id}">Delete</button>
        </td>
      </tr>`
    )
    .join('');
  $('#empty').hidden = products.length > 0;
}

function renderStats(s) {
  lowThreshold = s.lowStockThreshold;
  $('#sProducts').textContent = number.format(s.products);
  $('#sUnits').textContent = number.format(s.units);
  $('#sValue').textContent = money.format(s.value);
  $('#sLow').textContent = number.format(s.lowStock);
  $('#sLowLabel').textContent = `Low stock (${lowThreshold} or fewer)`;

  const max = Math.max(1, ...s.categories.map((c) => c.units));
  $('#catBars').innerHTML = s.categories
    .map(
      (c) => `
      <li>
        <div class="cat-top"><span>${esc(c.category)}</span><span>${number.format(c.units)} units</span></div>
        <div class="cat-track"><div class="cat-fill" style="width:${(c.units / max) * 100}%"></div></div>
      </li>`
    )
    .join('');

  // Category filter + form suggestions
  const current = $('#categoryFilter').value;
  $('#categoryFilter').innerHTML =
    '<option value="">All categories</option>' +
    s.categories.map((c) => `<option>${esc(c.category)}</option>`).join('');
  $('#categoryFilter').value = s.categories.some((c) => c.category === current) ? current : '';
  $('#catList').innerHTML = s.categories.map((c) => `<option value="${esc(c.category)}">`).join('');
}

// ---------- Data loading ----------
async function loadProducts() {
  const q = new URLSearchParams({ search: $('#search').value.trim(), category: $('#categoryFilter').value });
  products = await api(`/products?${q}`);
  renderRows();
}

async function loadAll() {
  const stats = await api('/stats');
  renderStats(stats);
  await loadProducts();
}

// ---------- Toast ----------
let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

// ---------- Create / Update ----------
function openForm(product) {
  editingId = product ? product.id : null;
  $('#formTitle').textContent = product ? 'Edit product' : 'Add product';
  const f = $('#form');
  f.reset();
  $('#formError').hidden = true;
  for (const key of ['name', 'sku', 'category', 'price', 'stock']) {
    f.elements[key].value = product ? product[key] : '';
  }
  $('#formDialog').showModal();
  f.elements.name.focus();
}

$('#addBtn').addEventListener('click', () => openForm(null));
$('#cancelBtn').addEventListener('click', () => $('#formDialog').close());

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = Object.fromEntries(new FormData(f));
  $('#saveBtn').disabled = true;
  try {
    if (editingId) {
      await api(`/products/${editingId}`, { method: 'PUT', body });
      toast('Product updated');
    } else {
      await api('/products', { method: 'POST', body });
      toast('Product added');
    }
    $('#formDialog').close();
    await loadAll();
  } catch (err) {
    $('#formError').textContent = err.message;
    $('#formError').hidden = false;
  } finally {
    $('#saveBtn').disabled = false;
  }
});

// ---------- Edit / Delete buttons ----------
$('#rows').addEventListener('click', (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) openForm(products.find((p) => p.id === Number(editId)));
  if (delId) {
    deleteId = Number(delId);
    const p = products.find((x) => x.id === deleteId);
    $('#deleteText').textContent = `"${p.name}" (${p.sku}) will be removed permanently.`;
    $('#deleteDialog').showModal();
  }
});

$('#deleteCancel').addEventListener('click', () => $('#deleteDialog').close());
$('#deleteConfirm').addEventListener('click', async () => {
  try {
    await api(`/products/${deleteId}`, { method: 'DELETE' });
    $('#deleteDialog').close();
    toast('Product deleted');
    await loadAll();
  } catch (err) {
    toast(err.message);
  }
});

// ---------- Filters ----------
let searchTimer;
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 200);
});
$('#categoryFilter').addEventListener('change', loadProducts);

loadAll().catch((err) => toast(err.message));
