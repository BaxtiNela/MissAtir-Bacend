// ============================================================
// MISSATIR — Backend API (MongoDB Atlas)
// ============================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'missatir_secret_2025_xyz';
const MONGO_URI = process.env.MONGO_URI;

// ===== CLOUDFLARE R2 =====
const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const R2_BUCKET = process.env.R2_BUCKET || 'missatir';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Faqat rasm fayllari qabul qilinadi'));
  }
});

app.use(cors());
app.use(express.json());

// ===== MONGODB =====
let db;
async function getDb() {
  if (db) return db;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db('missatir');
  await initDb(db);
  return db;
}

// Default ma'lumotlar (birinchi marta)
async function initDb(db) {
  const hero = await db.collection('hero').findOne({});
  if (!hero) {
    await db.collection('hero').insertOne({
      tag: 'Dubai · Riyadh · Exclusive',
      title_line1: 'Sharqning',
      title_line2: 'nafis hidi',
      title_line3: 'siz uchun',
      subtitle: "Dubay va Saudiyadan keltirilgan original chet el atirlar. Har bir tomchi — bir hikoya.",
      btn_primary: "Katalogni ko'rish",
      btn_secondary: "Ko'proq bilish",
      updated_at: new Date()
    });
  }

  const stats = await db.collection('stats').countDocuments();
  if (!stats) {
    await db.collection('stats').insertMany([
      { value: '500+', label: 'Atir turi', sort_order: 1 },
      { value: 'Dubai', label: 'Original manbaa', sort_order: 2 },
      { value: '1-3 kun', label: 'Yetkazib berish', sort_order: 3 },
      { value: '100%', label: 'Original kafolat', sort_order: 4 },
    ]);
  }

  const products = await db.collection('products').countDocuments();
  if (!products) {
    await db.collection('products').insertMany([
      { brand: 'Dubai Luxury', name: 'Oud Royale', notes: 'Oud · Amber · Sandal daraxti', price: 320000, old_price: 400000, category: 'dubai', description: "Oud Royale — bu Dubayning qadimiy bog'laridan ilhom olingan, asil oud va amberning uyg'un aralashmasi.", sizes: '30ml,50ml,100ml', badge: 'Yangi', active: true, sort_order: 1, image_url: null, created_at: new Date() },
      { brand: 'Saudi Rose', name: 'Taif Rose Elixir', notes: "Taif atirguli · Musk · Qo'ziqorin", price: 480000, old_price: null, category: 'saudi', description: "Saudiya Arabistonining Taif shahridan keltirilgan eng nozik atirgul hidi.", sizes: '50ml,100ml', badge: 'Bestseller', active: true, sort_order: 2, image_url: null, created_at: new Date() },
      { brand: 'Flora Dubai', name: 'Jasmine Noir', notes: 'Jasmin · Bergamot · Vetiver', price: 280000, old_price: 375000, category: 'floral', description: "Tungi yasmin va bergamotning sehrli uyg'unligi.", sizes: '30ml,50ml,100ml', badge: 'sale', active: true, sort_order: 3, image_url: null, created_at: new Date() },
      { brand: 'Arabian Oud', name: 'Black Oud Intense', notes: "Qora Oud · Tutatqi · Qo'ziqorin", price: 650000, old_price: null, category: 'oud', description: "Arabiston yarim orolining eng qadimiy oud daraxtlaridan olingan qora oud.", sizes: '100ml', badge: 'Eksklyuziv', active: true, sort_order: 4, image_url: null, created_at: new Date() },
      { brand: 'Amouage Dubai', name: 'Gold Crystal', notes: 'Oltin Oud · Frankincense · Gulab', price: 520000, old_price: null, category: 'dubai', description: "Amouage brendining oltin kolleksiyasidan.", sizes: '50ml,100ml', badge: null, active: true, sort_order: 5, image_url: null, created_at: new Date() },
      { brand: 'Rasasi', name: 'Tropical Garden', notes: "Lemon · Barg · Yog'och", price: 195000, old_price: 250000, category: 'floral', description: "Yashil va yangi, tropik bog'ni eslatuvchi engil atir.", sizes: '30ml,50ml,100ml', badge: 'Tavsiya', active: true, sort_order: 6, image_url: null, created_at: new Date() },
    ]);
  }

  const brands = await db.collection('brands').countDocuments();
  if (!brands) {
    await db.collection('brands').insertMany([
      { name: 'Arabian Oud', active: true, sort_order: 1 },
      { name: 'Amouage', active: true, sort_order: 2 },
      { name: 'Rasasi', active: true, sort_order: 3 },
      { name: 'Al Haramain', active: true, sort_order: 4 },
      { name: 'Lattafa', active: true, sort_order: 5 },
      { name: 'Ajmal', active: true, sort_order: 6 },
      { name: 'Swiss Arabian', active: true, sort_order: 7 },
      { name: 'Nabeel', active: true, sort_order: 8 },
    ]);
  }

  const steps = await db.collection('steps').countDocuments();
  if (!steps) {
    await db.collection('steps').insertMany([
      { number: '01', icon: '🔍', title: 'Tanlang', description: "Katalogdan o'zingizga yoqqan atirni tanlang", sort_order: 1 },
      { number: '02', icon: '📋', title: 'Buyurtma bering', description: "Savatchaga qo'shing va ma'lumotlaringizni kiriting", sort_order: 2 },
      { number: '03', icon: '💳', title: "To'lang", description: "Click, Payme yoki naqd pul orqali to'lang", sort_order: 3 },
      { number: '04', icon: '🚚', title: 'Qabul qiling', description: "1-3 kun ichida eshigingizga yetkazib beramiz", sort_order: 4 },
    ]);
  }

  const reviews = await db.collection('reviews').countDocuments();
  if (!reviews) {
    await db.collection('reviews').insertMany([
      { stars: 5, text: '"Oud Royale atiri juda ajoyib! Dubai dan keltirilgani seziladi, haqiqiy Sharq hidi. Paketlash ham zo\'r edi."', author_name: 'Malika Yusupova', author_city: 'Toshkent', author_initial: 'M', author_color: '#d4a96a', active: true, sort_order: 1 },
      { stars: 5, text: '"Taif Rose Elixirni online sotib oldim, 2 kunda yetib keldi. Hidi juda uzoq turadi. Albatta yana buyurtma beraman!"', author_name: 'Zilola Rahimova', author_city: 'Samarqand', author_initial: 'Z', author_color: '#c9a96e', active: true, sort_order: 2 },
      { stars: 5, text: '"Original mahsulot, narx ham juda qulay. Dubaydan do\'stimga ham sotib berishni so\'radilar. Hammaga tavsiya qilaman!"', author_name: 'Nilufar Karimova', author_city: "Farg'ona", author_initial: 'N', author_color: '#a8d8a8', active: true, sort_order: 3 },
    ]);
  }

  const contact = await db.collection('contact').findOne({});
  if (!contact) {
    await db.collection('contact').insertOne({
      section_tag: "Bog'laning",
      title: "Buyurtma bering\nyoki savol bering",
      description: "Toshkent bo'yicha kurerlik yetkazish.\nViloyatlarga pochta orqali.",
      telegram: '@missatir_uz',
      phone: '+998 90 123 45 67',
      instagram: '@missatir_uz',
      updated_at: new Date()
    });
  }

  const footer = await db.collection('footer').findOne({});
  if (!footer) {
    await db.collection('footer').insertOne({
      logo_ar: 'مسعطر',
      logo_uz: 'MISSATIR',
      description: 'Dubay va Saudiyadan keltirilgan original chet el atirlar. Sharqning nafis hidlari siz uchun.',
      copyright: '© 2025 MISSATIR. Barcha huquqlar himoyalangan.',
      address: "Toshkent, O'zbekiston",
      updated_at: new Date()
    });
  }

  const admins = await db.collection('admins').countDocuments();
  if (!admins) {
    await db.collection('admins').insertOne({
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10)
    });
  }
}

// ObjectId ni oddiy id ga aylantirish
function fmt(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}
function fmtArr(arr) { return arr.map(fmt); }

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

app.get('/api/hero', async (req, res) => {
  const db = await getDb();
  const doc = await db.collection('hero').findOne({});
  res.json(fmt(doc));
});

app.get('/api/stats', async (req, res) => {
  const db = await getDb();
  const data = await db.collection('stats').find({}).sort({ sort_order: 1 }).toArray();
  res.json(fmtArr(data));
});

app.get('/api/products', async (req, res) => {
  const db = await getDb();
  const data = await db.collection('products').find({ active: true }).sort({ sort_order: 1 }).toArray();
  res.json(fmtArr(data));
});

app.get('/api/brands', async (req, res) => {
  const db = await getDb();
  const data = await db.collection('brands').find({ active: true }).sort({ sort_order: 1 }).toArray();
  res.json(fmtArr(data));
});

app.get('/api/steps', async (req, res) => {
  const db = await getDb();
  const data = await db.collection('steps').find({}).sort({ sort_order: 1 }).toArray();
  res.json(fmtArr(data));
});

app.get('/api/reviews', async (req, res) => {
  const db = await getDb();
  const data = await db.collection('reviews').find({ active: true }).sort({ sort_order: 1 }).toArray();
  res.json(fmtArr(data));
});

app.get('/api/contact', async (req, res) => {
  const db = await getDb();
  const doc = await db.collection('contact').findOne({});
  res.json(fmt(doc));
});

app.get('/api/footer', async (req, res) => {
  const db = await getDb();
  const doc = await db.collection('footer').findOne({});
  res.json(fmt(doc));
});

app.post('/api/orders', async (req, res) => {
  const { full_name, phone, address, product, note } = req.body;
  if (!full_name || !phone || !address) {
    return res.status(400).json({ error: 'Ism, telefon va manzil majburiy' });
  }
  const db = await getDb();
  const result = await db.collection('orders').insertOne({
    full_name, phone, address,
    product: product || '',
    note: note || '',
    status: 'new',
    created_at: new Date()
  });
  res.json({ success: true, id: result.insertedId.toString() });
});

// ============================================================
// ADMIN AUTH
// ============================================================

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await getDb();
  const admin = await db.collection('admins').findOne({ username });
  if (!admin || !bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }
  const token = jwt.sign({ id: admin._id.toString(), username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: admin.username });
});

app.post('/api/admin/change-password', auth, async (req, res) => {
  const { old_password, new_password } = req.body;
  const db = await getDb();
  const admin = await db.collection('admins').findOne({ _id: new ObjectId(req.admin.id) });
  if (!bcrypt.compareSync(old_password, admin.password)) {
    return res.status(400).json({ error: "Eski parol noto'g'ri" });
  }
  await db.collection('admins').updateOne({ _id: admin._id }, { $set: { password: bcrypt.hashSync(new_password, 10) } });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Hero
// ============================================================

app.get('/api/admin/hero', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmt(await db.collection('hero').findOne({})));
});

app.put('/api/admin/hero', auth, async (req, res) => {
  const { tag, title_line1, title_line2, title_line3, subtitle, btn_primary, btn_secondary } = req.body;
  const db = await getDb();
  await db.collection('hero').updateOne({}, { $set: { tag, title_line1, title_line2, title_line3, subtitle, btn_primary, btn_secondary, updated_at: new Date() } });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Stats
// ============================================================

app.get('/api/admin/stats', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmtArr(await db.collection('stats').find({}).sort({ sort_order: 1 }).toArray()));
});

app.post('/api/admin/stats', auth, async (req, res) => {
  const { value, label } = req.body;
  const db = await getDb();
  const last = await db.collection('stats').findOne({}, { sort: { sort_order: -1 } });
  const sort_order = (last?.sort_order || 0) + 1;
  const result = await db.collection('stats').insertOne({ value, label, sort_order });
  res.json({ success: true, id: result.insertedId.toString() });
});

app.put('/api/admin/stats/:id', auth, async (req, res) => {
  const { value, label, sort_order } = req.body;
  const db = await getDb();
  await db.collection('stats').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { value, label, ...(sort_order && { sort_order }) } });
  res.json({ success: true });
});

app.delete('/api/admin/stats/:id', auth, async (req, res) => {
  const db = await getDb();
  await db.collection('stats').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Products
// ============================================================

app.get('/api/admin/products', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmtArr(await db.collection('products').find({}).sort({ sort_order: 1 }).toArray()));
});

app.post('/api/admin/products', auth, async (req, res) => {
  const { brand, name, notes, price, old_price, category, description, sizes, badge, active, image_url } = req.body;
  const db = await getDb();
  const last = await db.collection('products').findOne({}, { sort: { sort_order: -1 } });
  const sort_order = (last?.sort_order || 0) + 1;
  const result = await db.collection('products').insertOne({
    brand, name, notes, price: +price,
    old_price: old_price ? +old_price : null,
    category, description: description || '',
    sizes: sizes || '50ml,100ml',
    badge: badge || null,
    active: active !== false,
    image_url: image_url || null,
    sort_order, created_at: new Date()
  });
  res.json({ success: true, id: result.insertedId.toString() });
});

app.put('/api/admin/products/:id', auth, async (req, res) => {
  const { brand, name, notes, price, old_price, category, description, sizes, badge, active, sort_order, image_url } = req.body;
  const db = await getDb();
  await db.collection('products').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: {
      brand, name, notes, price: +price,
      old_price: old_price ? +old_price : null,
      category, description: description || '',
      sizes: sizes || '50ml,100ml',
      badge: badge || null,
      active: !!active,
      image_url: image_url || null,
      ...(sort_order && { sort_order })
    }}
  );
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, async (req, res) => {
  const db = await getDb();
  await db.collection('products').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Brands
// ============================================================

app.get('/api/admin/brands', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmtArr(await db.collection('brands').find({}).sort({ sort_order: 1 }).toArray()));
});

app.post('/api/admin/brands', auth, async (req, res) => {
  const { name } = req.body;
  const db = await getDb();
  const last = await db.collection('brands').findOne({}, { sort: { sort_order: -1 } });
  const sort_order = (last?.sort_order || 0) + 1;
  const result = await db.collection('brands').insertOne({ name, active: true, sort_order });
  res.json({ success: true, id: result.insertedId.toString() });
});

app.put('/api/admin/brands/:id', auth, async (req, res) => {
  const { name, active, sort_order } = req.body;
  const db = await getDb();
  await db.collection('brands').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { name, active: !!active, ...(sort_order && { sort_order }) } }
  );
  res.json({ success: true });
});

app.delete('/api/admin/brands/:id', auth, async (req, res) => {
  const db = await getDb();
  await db.collection('brands').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Steps
// ============================================================

app.get('/api/admin/steps', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmtArr(await db.collection('steps').find({}).sort({ sort_order: 1 }).toArray()));
});

app.post('/api/admin/steps', auth, async (req, res) => {
  const { number, icon, title, description } = req.body;
  const db = await getDb();
  const last = await db.collection('steps').findOne({}, { sort: { sort_order: -1 } });
  const sort_order = (last?.sort_order || 0) + 1;
  const result = await db.collection('steps').insertOne({ number, icon, title, description, sort_order });
  res.json({ success: true, id: result.insertedId.toString() });
});

app.put('/api/admin/steps/:id', auth, async (req, res) => {
  const { number, icon, title, description, sort_order } = req.body;
  const db = await getDb();
  await db.collection('steps').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { number, icon, title, description, ...(sort_order && { sort_order }) } }
  );
  res.json({ success: true });
});

app.delete('/api/admin/steps/:id', auth, async (req, res) => {
  const db = await getDb();
  await db.collection('steps').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Reviews
// ============================================================

app.get('/api/admin/reviews', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmtArr(await db.collection('reviews').find({}).sort({ sort_order: 1 }).toArray()));
});

app.post('/api/admin/reviews', auth, async (req, res) => {
  const { stars, text, author_name, author_city, author_initial, author_color } = req.body;
  const db = await getDb();
  const last = await db.collection('reviews').findOne({}, { sort: { sort_order: -1 } });
  const sort_order = (last?.sort_order || 0) + 1;
  const result = await db.collection('reviews').insertOne({
    stars: stars || 5, text, author_name, author_city, author_initial,
    author_color: author_color || '#d4a96a', active: true, sort_order
  });
  res.json({ success: true, id: result.insertedId.toString() });
});

app.put('/api/admin/reviews/:id', auth, async (req, res) => {
  const { stars, text, author_name, author_city, author_initial, author_color, active, sort_order } = req.body;
  const db = await getDb();
  await db.collection('reviews').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { stars, text, author_name, author_city, author_initial, author_color, active: !!active, ...(sort_order && { sort_order }) } }
  );
  res.json({ success: true });
});

app.delete('/api/admin/reviews/:id', auth, async (req, res) => {
  const db = await getDb();
  await db.collection('reviews').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Contact
// ============================================================

app.get('/api/admin/contact', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmt(await db.collection('contact').findOne({})));
});

app.put('/api/admin/contact', auth, async (req, res) => {
  const { section_tag, title, description, telegram, phone, instagram } = req.body;
  const db = await getDb();
  await db.collection('contact').updateOne({}, { $set: { section_tag, title, description, telegram, phone, instagram, updated_at: new Date() } });
  res.json({ success: true });
});

// ============================================================
// ADMIN CRUD — Footer
// ============================================================

app.get('/api/admin/footer', auth, async (req, res) => {
  const db = await getDb();
  res.json(fmt(await db.collection('footer').findOne({})));
});

app.put('/api/admin/footer', auth, async (req, res) => {
  const { logo_ar, logo_uz, description, copyright, address } = req.body;
  const db = await getDb();
  await db.collection('footer').updateOne({}, { $set: { logo_ar, logo_uz, description, copyright, address, updated_at: new Date() } });
  res.json({ success: true });
});

// ============================================================
// ADMIN — Orders
// ============================================================

app.get('/api/admin/orders', auth, async (req, res) => {
  const db = await getDb();
  const data = await db.collection('orders').find({}).sort({ created_at: -1 }).toArray();
  res.json(fmtArr(data));
});

app.put('/api/admin/orders/:id/status', auth, async (req, res) => {
  const db = await getDb();
  await db.collection('orders').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: req.body.status } });
  res.json({ success: true });
});

app.delete('/api/admin/orders/:id', auth, async (req, res) => {
  const db = await getDb();
  await db.collection('orders').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// ============================================================
// ADMIN — Dashboard
// ============================================================

app.get('/api/admin/dashboard', auth, async (req, res) => {
  const db = await getDb();
  const [totalOrders, newOrders, totalProducts, totalReviews, recentOrders] = await Promise.all([
    db.collection('orders').countDocuments(),
    db.collection('orders').countDocuments({ status: 'new' }),
    db.collection('products').countDocuments({ active: true }),
    db.collection('reviews').countDocuments({ active: true }),
    db.collection('orders').find({}).sort({ created_at: -1 }).limit(5).toArray()
  ]);
  res.json({ totalOrders, newOrders, totalProducts, totalReviews, recentOrders: fmtArr(recentOrders) });
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
