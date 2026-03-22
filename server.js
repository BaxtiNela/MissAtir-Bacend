// ============================================================
// MISSATIR — Backend API (Vercel compatible, in-memory)
// ============================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { store, nextId } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'missatir_secret_2025_xyz';

// ===== CLOUDFLARE R2 =====
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://d3d889074843cb9d58cb905250d20d27.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const R2_BUCKET = process.env.R2_BUCKET || 'd3d889074843cb9d58cb905250d20d27';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-d3d889074843cb9d58cb905250d20d27.r2.dev';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Faqat rasm fayllari qabul qilinadi'));
  }
});

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

// ============================================================
// PUBLIC API
// ============================================================

app.get('/api/hero', (req, res) => {
  res.json(store.hero);
});

app.get('/api/stats', (req, res) => {
  res.json([...store.stats].sort((a, b) => a.sort_order - b.sort_order));
});

app.get('/api/products', (req, res) => {
  res.json(store.products.filter(p => p.active).sort((a, b) => a.sort_order - b.sort_order));
});

app.get('/api/brands', (req, res) => {
  res.json(store.brands.filter(b => b.active).sort((a, b) => a.sort_order - b.sort_order));
});

app.get('/api/steps', (req, res) => {
  res.json([...store.steps].sort((a, b) => a.sort_order - b.sort_order));
});

app.get('/api/reviews', (req, res) => {
  res.json(store.reviews.filter(r => r.active).sort((a, b) => a.sort_order - b.sort_order));
});

app.get('/api/contact', (req, res) => {
  res.json(store.contact);
});

app.get('/api/footer', (req, res) => {
  res.json(store.footer);
});

app.post('/api/orders', (req, res) => {
  const { full_name, phone, address, product, note } = req.body;
  if (!full_name || !phone || !address) {
    return res.status(400).json({ error: 'Ism, telefon va manzil majburiy' });
  }
  const order = {
    id: nextId('orders'),
    full_name, phone, address,
    product: product || '',
    note: note || '',
    status: 'new',
    created_at: new Date().toISOString()
  };
  store.orders.unshift(order);
  res.json({ success: true, id: order.id });
});

// ============================================================
// ADMIN AUTH
// ============================================================

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = store.admins.find(a => a.username === username);
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }
  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: admin.username });
});

app.post('/api/admin/change-password', auth, (req, res) => {
  const { old_password, new_password } = req.body;
  const admin = store.admins.find(a => a.id === req.admin.id);
  if (!bcrypt.compareSync(old_password, admin.password)) {
    return res.status(400).json({ error: "Eski parol noto'g'ri" });
  }
  admin.password = bcrypt.hashSync(new_password, 10);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Hero
// ============================================================

app.get('/api/admin/hero', auth, (req, res) => {
  res.json(store.hero);
});

app.put('/api/admin/hero', auth, (req, res) => {
  const { tag, title_line1, title_line2, title_line3, subtitle, btn_primary, btn_secondary } = req.body;
  Object.assign(store.hero, { tag, title_line1, title_line2, title_line3, subtitle, btn_primary, btn_secondary, updated_at: new Date().toISOString() });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Stats
// ============================================================

app.get('/api/admin/stats', auth, (req, res) => {
  res.json([...store.stats].sort((a, b) => a.sort_order - b.sort_order));
});

app.post('/api/admin/stats', auth, (req, res) => {
  const { value, label } = req.body;
  const maxOrder = Math.max(0, ...store.stats.map(s => s.sort_order)) + 1;
  const item = { id: nextId('stats'), value, label, sort_order: maxOrder };
  store.stats.push(item);
  res.json({ success: true, id: item.id });
});

app.put('/api/admin/stats/:id', auth, (req, res) => {
  const item = store.stats.find(s => s.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'Topilmadi' });
  const { value, label, sort_order } = req.body;
  Object.assign(item, { value, label, sort_order: sort_order || item.sort_order });
  res.json({ success: true });
});

app.delete('/api/admin/stats/:id', auth, (req, res) => {
  store.stats = store.stats.filter(s => s.id != req.params.id);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Products
// ============================================================

app.get('/api/admin/products', auth, (req, res) => {
  res.json([...store.products].sort((a, b) => a.sort_order - b.sort_order));
});

app.post('/api/admin/products', auth, (req, res) => {
  const { brand, name, notes, price, old_price, category, description, sizes, badge, active } = req.body;
  const maxOrder = Math.max(0, ...store.products.map(p => p.sort_order)) + 1;
  const item = {
    id: nextId('products'), brand, name, notes, price: +price,
    old_price: old_price ? +old_price : null, category,
    description: description || '', sizes: sizes || '50ml,100ml',
    badge: badge || null, active: active !== false ? 1 : 0,
    sort_order: maxOrder, created_at: new Date().toISOString()
  };
  store.products.push(item);
  res.json({ success: true, id: item.id });
});

app.put('/api/admin/products/:id', auth, (req, res) => {
  const item = store.products.find(p => p.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'Topilmadi' });
  const { brand, name, notes, price, old_price, category, description, sizes, badge, active, sort_order } = req.body;
  Object.assign(item, {
    brand, name, notes, price: +price,
    old_price: old_price ? +old_price : null,
    category, description: description || '',
    sizes: sizes || '50ml,100ml', badge: badge || null,
    active: active ? 1 : 0, sort_order: sort_order || item.sort_order
  });
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, (req, res) => {
  store.products = store.products.filter(p => p.id != req.params.id);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Brands
// ============================================================

app.get('/api/admin/brands', auth, (req, res) => {
  res.json([...store.brands].sort((a, b) => a.sort_order - b.sort_order));
});

app.post('/api/admin/brands', auth, (req, res) => {
  const { name } = req.body;
  const maxOrder = Math.max(0, ...store.brands.map(b => b.sort_order)) + 1;
  const item = { id: nextId('brands'), name, active: 1, sort_order: maxOrder };
  store.brands.push(item);
  res.json({ success: true, id: item.id });
});

app.put('/api/admin/brands/:id', auth, (req, res) => {
  const item = store.brands.find(b => b.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'Topilmadi' });
  const { name, active, sort_order } = req.body;
  Object.assign(item, { name, active: active ? 1 : 0, sort_order: sort_order || item.sort_order });
  res.json({ success: true });
});

app.delete('/api/admin/brands/:id', auth, (req, res) => {
  store.brands = store.brands.filter(b => b.id != req.params.id);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Steps
// ============================================================

app.get('/api/admin/steps', auth, (req, res) => {
  res.json([...store.steps].sort((a, b) => a.sort_order - b.sort_order));
});

app.post('/api/admin/steps', auth, (req, res) => {
  const { number, icon, title, description } = req.body;
  const maxOrder = Math.max(0, ...store.steps.map(s => s.sort_order)) + 1;
  const item = { id: nextId('steps'), number, icon, title, description, sort_order: maxOrder };
  store.steps.push(item);
  res.json({ success: true, id: item.id });
});

app.put('/api/admin/steps/:id', auth, (req, res) => {
  const item = store.steps.find(s => s.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'Topilmadi' });
  const { number, icon, title, description, sort_order } = req.body;
  Object.assign(item, { number, icon, title, description, sort_order: sort_order || item.sort_order });
  res.json({ success: true });
});

app.delete('/api/admin/steps/:id', auth, (req, res) => {
  store.steps = store.steps.filter(s => s.id != req.params.id);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Reviews
// ============================================================

app.get('/api/admin/reviews', auth, (req, res) => {
  res.json([...store.reviews].sort((a, b) => a.sort_order - b.sort_order));
});

app.post('/api/admin/reviews', auth, (req, res) => {
  const { stars, text, author_name, author_city, author_initial, author_color } = req.body;
  const maxOrder = Math.max(0, ...store.reviews.map(r => r.sort_order)) + 1;
  const item = {
    id: nextId('reviews'), stars: stars || 5, text,
    author_name, author_city, author_initial,
    author_color: author_color || '#d4a96a',
    active: 1, sort_order: maxOrder
  };
  store.reviews.push(item);
  res.json({ success: true, id: item.id });
});

app.put('/api/admin/reviews/:id', auth, (req, res) => {
  const item = store.reviews.find(r => r.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'Topilmadi' });
  const { stars, text, author_name, author_city, author_initial, author_color, active, sort_order } = req.body;
  Object.assign(item, { stars, text, author_name, author_city, author_initial, author_color, active: active ? 1 : 0, sort_order: sort_order || item.sort_order });
  res.json({ success: true });
});

app.delete('/api/admin/reviews/:id', auth, (req, res) => {
  store.reviews = store.reviews.filter(r => r.id != req.params.id);
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Contact
// ============================================================

app.get('/api/admin/contact', auth, (req, res) => {
  res.json(store.contact);
});

app.put('/api/admin/contact', auth, (req, res) => {
  const { section_tag, title, description, telegram, phone, instagram } = req.body;
  Object.assign(store.contact, { section_tag, title, description, telegram, phone, instagram, updated_at: new Date().toISOString() });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Footer
// ============================================================

app.get('/api/admin/footer', auth, (req, res) => {
  res.json(store.footer);
});

app.put('/api/admin/footer', auth, (req, res) => {
  const { logo_ar, logo_uz, description, copyright, address } = req.body;
  Object.assign(store.footer, { logo_ar, logo_uz, description, copyright, address, updated_at: new Date().toISOString() });
  res.json({ success: true });
});

// ============================================================
// ADMIN — Orders
// ============================================================

app.get('/api/admin/orders', auth, (req, res) => {
  res.json([...store.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

app.put('/api/admin/orders/:id/status', auth, (req, res) => {
  const order = store.orders.find(o => o.id == req.params.id);
  if (!order) return res.status(404).json({ error: 'Topilmadi' });
  order.status = req.body.status;
  res.json({ success: true });
});

app.delete('/api/admin/orders/:id', auth, (req, res) => {
  store.orders = store.orders.filter(o => o.id != req.params.id);
  res.json({ success: true });
});

// ============================================================
// ADMIN — Dashboard
// ============================================================

app.get('/api/admin/dashboard', auth, (req, res) => {
  res.json({
    totalOrders: store.orders.length,
    newOrders: store.orders.filter(o => o.status === 'new').length,
    totalProducts: store.products.filter(p => p.active).length,
    totalReviews: store.reviews.filter(r => r.active).length,
    recentOrders: [...store.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)
  });
});

// ============================================================
// IMAGE UPLOAD — Cloudflare R2
// ============================================================

app.post('/api/admin/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Rasm yuklanmadi' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await R2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const url = `${R2_PUBLIC_URL}/${fileName}`;
    res.json({ success: true, url });
  } catch (err) {
    console.error('Upload xatosi:', err);
    res.status(500).json({ error: 'Rasm yuklanmadi: ' + err.message });
  }
});

app.delete('/api/admin/upload', auth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL kerak' });
    const key = url.replace(R2_PUBLIC_URL + '/', '');
    await R2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`MISSATIR Backend: http://localhost:${PORT}`);
});

module.exports = app;
