// ============================================================
// MISSATIR — In-Memory Database (Vercel compatible)
// ============================================================

const bcrypt = require('bcryptjs');

// In-memory store — serverless restartda default data qaytadi
// Production uchun MongoDB Atlas yoki PlanetScale ishlatish tavsiya etiladi

let store = {
  hero: {
    id: 1,
    tag: 'Dubai · Riyadh · Exclusive',
    title_line1: 'Sharqning',
    title_line2: 'nafis hidi',
    title_line3: 'siz uchun',
    subtitle: "Dubay va Saudiyadan keltirilgan original chet el atirlar. Har bir tomchi — bir hikoya.",
    btn_primary: "Katalogni ko'rish",
    btn_secondary: "Ko'proq bilish",
    updated_at: new Date().toISOString()
  },

  stats: [
    { id: 1, value: '500+', label: 'Atir turi', sort_order: 1 },
    { id: 2, value: 'Dubai', label: 'Original manbaa', sort_order: 2 },
    { id: 3, value: '1-3 kun', label: 'Yetkazib berish', sort_order: 3 },
    { id: 4, value: '100%', label: 'Original kafolat', sort_order: 4 },
  ],

  products: [
    { id: 1, brand: 'Dubai Luxury', name: 'Oud Royale', notes: 'Oud · Amber · Sandal daraxti', price: 320000, old_price: 400000, category: 'dubai', description: "Oud Royale — bu Dubayning qadimiy bog'laridan ilhom olingan, asil oud va amberning uyg'un aralashmasi.", sizes: '30ml,50ml,100ml', badge: 'Yangi', active: 1, sort_order: 1 },
    { id: 2, brand: 'Saudi Rose', name: 'Taif Rose Elixir', notes: "Taif atirguli · Musk · Qo'ziqorin", price: 480000, old_price: null, category: 'saudi', description: "Saudiya Arabistonining Taif shahridan keltirilgan eng nozik atirgul hidi.", sizes: '50ml,100ml', badge: 'Bestseller', active: 1, sort_order: 2 },
    { id: 3, brand: 'Flora Dubai', name: 'Jasmine Noir', notes: 'Jasmin · Bergamot · Vetiver', price: 280000, old_price: 375000, category: 'floral', description: "Tungi yasmin va bergamotning sehrli uyg'unligi.", sizes: '30ml,50ml,100ml', badge: 'sale', active: 1, sort_order: 3 },
    { id: 4, brand: 'Arabian Oud', name: 'Black Oud Intense', notes: "Qora Oud · Tutatqi · Qo'ziqorin", price: 650000, old_price: null, category: 'oud', description: "Arabiston yarim orolining eng qadimiy oud daraxtlaridan olingan qora oud.", sizes: '100ml', badge: 'Eksklyuziv', active: 1, sort_order: 4 },
    { id: 5, brand: 'Amouage Dubai', name: 'Gold Crystal', notes: 'Oltin Oud · Frankincense · Gulab', price: 520000, old_price: null, category: 'dubai', description: "Amouage brendining oltin kolleksiyasidan.", sizes: '50ml,100ml', badge: null, active: 1, sort_order: 5 },
    { id: 6, brand: 'Rasasi', name: 'Tropical Garden', notes: "Lemon · Barg · Yog'och", price: 195000, old_price: 250000, category: 'floral', description: "Yashil va yangi, tropik bog'ni eslatuvchi engil atir.", sizes: '30ml,50ml,100ml', badge: 'Tavsiya', active: 1, sort_order: 6 },
  ],

  brands: [
    { id: 1, name: 'Arabian Oud', active: 1, sort_order: 1 },
    { id: 2, name: 'Amouage', active: 1, sort_order: 2 },
    { id: 3, name: 'Rasasi', active: 1, sort_order: 3 },
    { id: 4, name: 'Al Haramain', active: 1, sort_order: 4 },
    { id: 5, name: 'Lattafa', active: 1, sort_order: 5 },
    { id: 6, name: 'Ajmal', active: 1, sort_order: 6 },
    { id: 7, name: 'Swiss Arabian', active: 1, sort_order: 7 },
    { id: 8, name: 'Nabeel', active: 1, sort_order: 8 },
  ],

  steps: [
    { id: 1, number: '01', icon: '🔍', title: 'Tanlang', description: "Katalogdan o'zingizga yoqqan atirni tanlang", sort_order: 1 },
    { id: 2, number: '02', icon: '📋', title: 'Buyurtma bering', description: "Savatchaga qo'shing va ma'lumotlaringizni kiriting", sort_order: 2 },
    { id: 3, number: '03', icon: '💳', title: "To'lang", description: "Click, Payme yoki naqd pul orqali to'lang", sort_order: 3 },
    { id: 4, number: '04', icon: '🚚', title: 'Qabul qiling', description: "1-3 kun ichida eshigingizga yetkazib beramiz", sort_order: 4 },
  ],

  reviews: [
    { id: 1, stars: 5, text: '"Oud Royale atiri juda ajoyib! Dubai dan keltirilgani seziladi, haqiqiy Sharq hidi. Paketlash ham zo\'r edi."', author_name: 'Malika Yusupova', author_city: 'Toshkent', author_initial: 'M', author_color: '#d4a96a', active: 1, sort_order: 1 },
    { id: 2, stars: 5, text: '"Taif Rose Elixirni online sotib oldim, 2 kunda yetib keldi. Hidi juda uzoq turadi. Albatta yana buyurtma beraman!"', author_name: 'Zilola Rahimova', author_city: 'Samarqand', author_initial: 'Z', author_color: '#c9a96e', active: 1, sort_order: 2 },
    { id: 3, stars: 5, text: '"Original mahsulot, narx ham juda qulay. Dubaydan do\'stimga ham sotib berishni so\'radilar. Hammaga tavsiya qilaman!"', author_name: 'Nilufar Karimova', author_city: "Farg'ona", author_initial: 'N', author_color: '#a8d8a8', active: 1, sort_order: 3 },
  ],

  contact: {
    id: 1,
    section_tag: "Bog'laning",
    title: "Buyurtma bering\nyoki savol bering",
    description: "Toshkent bo'yicha kurerlik yetkazish.\nViloyatlarga pochta orqali.",
    telegram: '@missatir_uz',
    phone: '+998 90 123 45 67',
    instagram: '@missatir_uz',
    updated_at: new Date().toISOString()
  },

  footer: {
    id: 1,
    logo_ar: 'مسعطر',
    logo_uz: 'MISSATIR',
    description: 'Dubay va Saudiyadan keltirilgan original chet el atirlar. Sharqning nafis hidlari siz uchun.',
    copyright: '© 2025 MISSATIR. Barcha huquqlar himoyalangan.',
    address: "Toshkent, O'zbekiston",
    updated_at: new Date().toISOString()
  },

  orders: [],
  admins: [
    { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 10) }
  ],

  _nextId: { stats: 10, products: 10, brands: 10, steps: 10, reviews: 10, orders: 1 }
};

function nextId(table) {
  store._nextId[table] = (store._nextId[table] || 1) + 1;
  return store._nextId[table];
}

module.exports = { store, nextId };
