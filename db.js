const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'missatir.db');

let db;

function getDb() { return db; }

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Save to disk helper
  db.save = function () {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  createTables();
  seedData();
  db.save();

  return db;
}

function run(sql, params = []) {
  db.run(sql, params);
  db.save();
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  stmt.bind(params);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

function runInsert(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
  db.save();
  return lastId;
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS hero (
    id INTEGER PRIMARY KEY DEFAULT 1,
    tag TEXT NOT NULL DEFAULT 'Dubai · Riyadh · Exclusive',
    title_line1 TEXT NOT NULL DEFAULT 'Sharqning',
    title_line2 TEXT NOT NULL DEFAULT 'nafis hidi',
    title_line3 TEXT NOT NULL DEFAULT 'siz uchun',
    subtitle TEXT NOT NULL DEFAULT 'Dubay va Saudiyadan keltirilgan original chet el atirlar.',
    btn_primary TEXT NOT NULL DEFAULT 'Katalogni korish',
    btn_secondary TEXT NOT NULL DEFAULT 'Koprok bilish',
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    name TEXT NOT NULL,
    notes TEXT NOT NULL,
    price INTEGER NOT NULL,
    old_price INTEGER,
    category TEXT NOT NULL DEFAULT 'dubai',
    description TEXT,
    sizes TEXT DEFAULT '30ml,50ml,100ml',
    badge TEXT,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL,
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stars INTEGER DEFAULT 5,
    text TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_city TEXT NOT NULL,
    author_initial TEXT NOT NULL,
    author_color TEXT DEFAULT '#d4a96a',
    active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS contact (
    id INTEGER PRIMARY KEY DEFAULT 1,
    section_tag TEXT DEFAULT 'Bog''laning',
    title TEXT DEFAULT 'Buyurtma bering yoki savol bering',
    description TEXT DEFAULT 'Toshkent buyicha kurerlik yetkazish.',
    telegram TEXT DEFAULT '@missatir_uz',
    phone TEXT DEFAULT '+998 90 123 45 67',
    instagram TEXT DEFAULT '@missatir_uz',
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS footer (
    id INTEGER PRIMARY KEY DEFAULT 1,
    logo_ar TEXT DEFAULT 'مسعطر',
    logo_uz TEXT DEFAULT 'MISSATIR',
    description TEXT DEFAULT 'Dubay va Saudiyadan keltirilgan original chet el atirlar.',
    copyright TEXT DEFAULT '2025 MISSATIR. Barcha huquqlar himoyalangan.',
    address TEXT DEFAULT 'Toshkent, Ozbekiston',
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    product TEXT,
    note TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

function seedData() {
  const heroCount = get('SELECT COUNT(*) as cnt FROM hero').cnt;
  if (!heroCount) db.run(`INSERT OR IGNORE INTO hero (id) VALUES (1)`);

  const statsCount = get('SELECT COUNT(*) as cnt FROM stats').cnt;
  if (!statsCount) {
    db.run(`INSERT INTO stats (value,label,sort_order) VALUES ('500+','Atir turi',1)`);
    db.run(`INSERT INTO stats (value,label,sort_order) VALUES ('Dubai','Original manbaa',2)`);
    db.run(`INSERT INTO stats (value,label,sort_order) VALUES ('1-3 kun','Yetkazib berish',3)`);
    db.run(`INSERT INTO stats (value,label,sort_order) VALUES ('100%','Original kafolat',4)`);
  }

  const productsCount = get('SELECT COUNT(*) as cnt FROM products').cnt;
  if (!productsCount) {
    db.run(`INSERT INTO products (brand,name,notes,price,old_price,category,description,sizes,badge,sort_order) VALUES ('Dubai Luxury','Oud Royale','Oud · Amber · Sandal daraxti',320000,400000,'dubai','Oud Royale — bu Dubayning qadimiy boglaridan ilhom olingan.','30ml,50ml,100ml','Yangi',1)`);
    db.run(`INSERT INTO products (brand,name,notes,price,old_price,category,description,sizes,badge,sort_order) VALUES ('Saudi Rose','Taif Rose Elixir','Taif atirguli · Musk · Qoziqorin',480000,null,'saudi','Saudiya Arabistonining Taif shahridan keltirilgan.','50ml,100ml','Bestseller',2)`);
    db.run(`INSERT INTO products (brand,name,notes,price,old_price,category,description,sizes,badge,sort_order) VALUES ('Flora Dubai','Jasmine Noir','Jasmin · Bergamot · Vetiver',280000,375000,'floral','Tungi yasmin va bergamotning sehrli uygúnligi.','30ml,50ml,100ml','sale',3)`);
    db.run(`INSERT INTO products (brand,name,notes,price,old_price,category,description,sizes,badge,sort_order) VALUES ('Arabian Oud','Black Oud Intense','Qora Oud · Tutatqi · Qoziqorin',650000,null,'oud','Arabiston yarim orolining eng qadimiy oud daraxtlaridan.','100ml','Eksklyuziv',4)`);
    db.run(`INSERT INTO products (brand,name,notes,price,old_price,category,description,sizes,badge,sort_order) VALUES ('Amouage Dubai','Gold Crystal','Oltin Oud · Frankincense · Gulab',520000,null,'dubai','Amouage brendining oltin kolleksiyasidan.','50ml,100ml',null,5)`);
    db.run(`INSERT INTO products (brand,name,notes,price,old_price,category,description,sizes,badge,sort_order) VALUES ('Rasasi','Tropical Garden','Lemon · Barg · Yogoch',195000,250000,'floral','Yashil va yangi, tropik bogni eslatuvchi engil atir.','30ml,50ml,100ml','Tavsiya',6)`);
  }

  const brandsCount = get('SELECT COUNT(*) as cnt FROM brands').cnt;
  if (!brandsCount) {
    ['Arabian Oud','Amouage','Rasasi','Al Haramain','Lattafa','Ajmal','Swiss Arabian','Nabeel'].forEach((b,i) => {
      db.run(`INSERT INTO brands (name,active,sort_order) VALUES (?,1,?)`, [b, i+1]);
    });
  }

  const stepsCount = get('SELECT COUNT(*) as cnt FROM steps').cnt;
  if (!stepsCount) {
    db.run(`INSERT INTO steps (number,icon,title,description,sort_order) VALUES ('01','🔍','Tanlang','Katalogdan ozingizga yogqan atirni tanlang',1)`);
    db.run(`INSERT INTO steps (number,icon,title,description,sort_order) VALUES ('02','📋','Buyurtma bering','Savatchaga qoshing va malumotlaringizni kiriting',2)`);
    db.run(`INSERT INTO steps (number,icon,title,description,sort_order) VALUES ('03','💳','Toylang','Click, Payme yoki naqd pul orqali toylang',3)`);
    db.run(`INSERT INTO steps (number,icon,title,description,sort_order) VALUES ('04','🚚','Qabul qiling','1-3 kun ichida eshigingizga yetkazib beramiz',4)`);
  }

  const reviewsCount = get('SELECT COUNT(*) as cnt FROM reviews').cnt;
  if (!reviewsCount) {
    db.run(`INSERT INTO reviews (stars,text,author_name,author_city,author_initial,author_color,sort_order) VALUES (5,'"Oud Royale atiri juda ajoyib! Haqiqiy Sharq hidi."','Malika Yusupova','Toshkent','M','#d4a96a',1)`);
    db.run(`INSERT INTO reviews (stars,text,author_name,author_city,author_initial,author_color,sort_order) VALUES (5,'"Taif Rose Elixirni online sotib oldim, 2 kunda yetib keldi."','Zilola Rahimova','Samarqand','Z','#c9a96e',2)`);
    db.run(`INSERT INTO reviews (stars,text,author_name,author_city,author_initial,author_color,sort_order) VALUES (5,'"Original mahsulot, narx ham juda qulay. Hammaga tavsiya qilaman!"','Nilufar Karimova','Fargona','N','#a8d8a8',3)`);
  }

  const contactCount = get('SELECT COUNT(*) as cnt FROM contact').cnt;
  if (!contactCount) db.run(`INSERT OR IGNORE INTO contact (id) VALUES (1)`);

  const footerCount = get('SELECT COUNT(*) as cnt FROM footer').cnt;
  if (!footerCount) db.run(`INSERT OR IGNORE INTO footer (id) VALUES (1)`);
}

module.exports = { initDb, getDb, run, all, get, runInsert };
