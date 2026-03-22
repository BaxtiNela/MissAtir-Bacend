const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDb, run, all, get, runInsert } = require('./db');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'missatir_secret_2025_xyz';

app.use(cors());
app.use(express.json());

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token noto'g'ri" });
  }
}

// ===== START =====
initDb().then(() => {
  // Seed default admin
  const existingAdmin = get('SELECT id FROM admins WHERE username = ?', ['admin']);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin123', 10);
    run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hash]);
    console.log('Admin yaratildi: admin / admin123');
  }

  app.listen(PORT, () => {
    console.log(`MISSATIR Backend: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('DB xatosi:', err);
  process.exit(1);
});

// ============================================================
// PUBLIC API
// ============================================================

app.get('/api/hero', (req, res) => {
  res.json(get('SELECT * FROM hero WHERE id = 1') || {});
});

app.get('/api/stats', (req, res) => {
  res.json(all('SELECT * FROM stats ORDER BY sort_order'));
});

app.get('/api/products', (req, res) => {
  res.json(all('SELECT * FROM products WHERE active = 1 ORDER BY sort_order'));
});

app.get('/api/brands', (req, res) => {
  res.json(all('SELECT * FROM brands WHERE active = 1 ORDER BY sort_order'));
});

app.get('/api/steps', (req, res) => {
  res.json(all('SELECT * FROM steps ORDER BY sort_order'));
});

app.get('/api/reviews', (req, res) => {
  res.json(all('SELECT * FROM reviews WHERE active = 1 ORDER BY sort_order'));
});

app.get('/api/contact', (req, res) => {
  res.json(get('SELECT * FROM contact WHERE id = 1') || {});
});

app.get('/api/footer', (req, res) => {
  res.json(get('SELECT * FROM footer WHERE id = 1') || {});
});

app.post('/api/orders', (req, res) => {
  const { full_name, phone, address, product, note } = req.body;
  if (!full_name || !phone || !address) {
    return res.status(400).json({ error: 'Ism, telefon va manzil majburiy' });
  }
  const id = runInsert(
    'INSERT INTO orders (full_name, phone, address, product, note) VALUES (?, ?, ?, ?, ?)',
    [full_name, phone, address, product || '', note || '']
  );
  res.json({ success: true, id });
});

// ============================================================
// ADMIN AUTH
// ============================================================

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = get('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }
  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: admin.username });
});

app.post('/api/admin/change-password', auth, (req, res) => {
  const { old_password, new_password } = req.body;
  const admin = get('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
  if (!bcrypt.compareSync(old_password, admin.password)) {
    return res.status(400).json({ error: "Eski parol noto'g'ri" });
  }
  run('UPDATE admins SET password = ? WHERE id = ?', [bcrypt.hashSync(new_password, 10), req.admin.id]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Hero
// ============================================================

app.get('/api/admin/hero', auth, (req, res) => {
  res.json(get('SELECT * FROM hero WHERE id = 1') || {});
});

app.put('/api/admin/hero', auth, (req, res) => {
  const { tag, title_line1, title_line2, title_line3, subtitle, btn_primary, btn_secondary } = req.body;
  run(`UPDATE hero SET tag=?,title_line1=?,title_line2=?,title_line3=?,subtitle=?,btn_primary=?,btn_secondary=?,updated_at=datetime('now') WHERE id=1`,
    [tag, title_line1, title_line2, title_line3, subtitle, btn_primary, btn_secondary]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Stats
// ============================================================

app.get('/api/admin/stats', auth, (req, res) => {
  res.json(all('SELECT * FROM stats ORDER BY sort_order'));
});

app.post('/api/admin/stats', auth, (req, res) => {
  const { value, label } = req.body;
  const maxRow = get('SELECT MAX(sort_order) as m FROM stats');
  const maxOrder = (maxRow?.m || 0) + 1;
  const id = runInsert('INSERT INTO stats (value, label, sort_order) VALUES (?, ?, ?)', [value, label, maxOrder]);
  res.json({ success: true, id });
});

app.put('/api/admin/stats/:id', auth, (req, res) => {
  const { value, label, sort_order } = req.body;
  run('UPDATE stats SET value=?, label=?, sort_order=? WHERE id=?', [value, label, sort_order || 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/stats/:id', auth, (req, res) => {
  run('DELETE FROM stats WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Products
// ============================================================

app.get('/api/admin/products', auth, (req, res) => {
  res.json(all('SELECT * FROM products ORDER BY sort_order'));
});

app.post('/api/admin/products', auth, (req, res) => {
  const { brand, name, notes, price, old_price, category, description, sizes, badge, active } = req.body;
  const maxRow = get('SELECT MAX(sort_order) as m FROM products');
  const maxOrder = (maxRow?.m || 0) + 1;
  const id = runInsert(
    `INSERT INTO products (brand,name,notes,price,old_price,category,description,sizes,badge,active,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [brand, name, notes, price, old_price || null, category, description || '', sizes || '50ml,100ml', badge || null, active !== false ? 1 : 0, maxOrder]
  );
  res.json({ success: true, id });
});

app.put('/api/admin/products/:id', auth, (req, res) => {
  const { brand, name, notes, price, old_price, category, description, sizes, badge, active, sort_order } = req.body;
  run(`UPDATE products SET brand=?,name=?,notes=?,price=?,old_price=?,category=?,description=?,sizes=?,badge=?,active=?,sort_order=? WHERE id=?`,
    [brand, name, notes, price, old_price || null, category, description || '', sizes || '50ml,100ml', badge || null, active ? 1 : 0, sort_order || 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, (req, res) => {
  run('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Brands
// ============================================================

app.get('/api/admin/brands', auth, (req, res) => {
  res.json(all('SELECT * FROM brands ORDER BY sort_order'));
});

app.post('/api/admin/brands', auth, (req, res) => {
  const { name } = req.body;
  const maxRow = get('SELECT MAX(sort_order) as m FROM brands');
  const id = runInsert('INSERT INTO brands (name, active, sort_order) VALUES (?, 1, ?)', [name, (maxRow?.m || 0) + 1]);
  res.json({ success: true, id });
});

app.put('/api/admin/brands/:id', auth, (req, res) => {
  const { name, active, sort_order } = req.body;
  run('UPDATE brands SET name=?, active=?, sort_order=? WHERE id=?', [name, active ? 1 : 0, sort_order || 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/brands/:id', auth, (req, res) => {
  run('DELETE FROM brands WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Steps
// ============================================================

app.get('/api/admin/steps', auth, (req, res) => {
  res.json(all('SELECT * FROM steps ORDER BY sort_order'));
});

app.post('/api/admin/steps', auth, (req, res) => {
  const { number, icon, title, description } = req.body;
  const maxRow = get('SELECT MAX(sort_order) as m FROM steps');
  const id = runInsert('INSERT INTO steps (number,icon,title,description,sort_order) VALUES (?,?,?,?,?)',
    [number, icon, title, description, (maxRow?.m || 0) + 1]);
  res.json({ success: true, id });
});

app.put('/api/admin/steps/:id', auth, (req, res) => {
  const { number, icon, title, description, sort_order } = req.body;
  run('UPDATE steps SET number=?,icon=?,title=?,description=?,sort_order=? WHERE id=?',
    [number, icon, title, description, sort_order || 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/steps/:id', auth, (req, res) => {
  run('DELETE FROM steps WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Reviews
// ============================================================

app.get('/api/admin/reviews', auth, (req, res) => {
  res.json(all('SELECT * FROM reviews ORDER BY sort_order'));
});

app.post('/api/admin/reviews', auth, (req, res) => {
  const { stars, text, author_name, author_city, author_initial, author_color } = req.body;
  const maxRow = get('SELECT MAX(sort_order) as m FROM reviews');
  const id = runInsert(`INSERT INTO reviews (stars,text,author_name,author_city,author_initial,author_color,active,sort_order) VALUES (?,?,?,?,?,?,1,?)`,
    [stars || 5, text, author_name, author_city, author_initial, author_color || '#d4a96a', (maxRow?.m || 0) + 1]);
  res.json({ success: true, id });
});

app.put('/api/admin/reviews/:id', auth, (req, res) => {
  const { stars, text, author_name, author_city, author_initial, author_color, active, sort_order } = req.body;
  run(`UPDATE reviews SET stars=?,text=?,author_name=?,author_city=?,author_initial=?,author_color=?,active=?,sort_order=? WHERE id=?`,
    [stars, text, author_name, author_city, author_initial, author_color, active ? 1 : 0, sort_order || 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/reviews/:id', auth, (req, res) => {
  run('DELETE FROM reviews WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Contact
// ============================================================

app.get('/api/admin/contact', auth, (req, res) => {
  res.json(get('SELECT * FROM contact WHERE id = 1') || {});
});

app.put('/api/admin/contact', auth, (req, res) => {
  const { section_tag, title, description, telegram, phone, instagram } = req.body;
  run(`UPDATE contact SET section_tag=?,title=?,description=?,telegram=?,phone=?,instagram=?,updated_at=datetime('now') WHERE id=1`,
    [section_tag, title, description, telegram, phone, instagram]);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Footer
// ============================================================

app.get('/api/admin/footer', auth, (req, res) => {
  res.json(get('SELECT * FROM footer WHERE id = 1') || {});
});

app.put('/api/admin/footer', auth, (req, res) => {
  const { logo_ar, logo_uz, description, copyright, address } = req.body;
  run(`UPDATE footer SET logo_ar=?,logo_uz=?,description=?,copyright=?,address=?,updated_at=datetime('now') WHERE id=1`,
    [logo_ar, logo_uz, description, copyright, address]);
  res.json({ success: true });
});

// ============================================================
// ADMIN — Orders
// ============================================================

app.get('/api/admin/orders', auth, (req, res) => {
  res.json(all("SELECT * FROM orders ORDER BY created_at DESC"));
});

app.put('/api/admin/orders/:id/status', auth, (req, res) => {
  run('UPDATE orders SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/orders/:id', auth, (req, res) => {
  run('DELETE FROM orders WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// ADMIN — Dashboard
// ============================================================

app.get('/api/admin/dashboard', auth, (req, res) => {
  const totalOrders  = get("SELECT COUNT(*) as cnt FROM orders").cnt;
  const newOrders    = get("SELECT COUNT(*) as cnt FROM orders WHERE status='new'").cnt;
  const totalProducts= get("SELECT COUNT(*) as cnt FROM products WHERE active=1").cnt;
  const totalReviews = get("SELECT COUNT(*) as cnt FROM reviews WHERE active=1").cnt;
  const recentOrders = all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5");
  res.json({ totalOrders, newOrders, totalProducts, totalReviews, recentOrders });
});
