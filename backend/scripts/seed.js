// backend/scripts/seed.js
// Run: node scripts/seed.js
// ⚠️  WARNING: Ye script existing data CLEAR kar dega!

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

dotenv.config();

// ─── Helpers ────────────────────────────────────────────────────────────────

const img = (keyword, w = 400, h = 400) =>
  `https://picsum.photos/seed/${encodeURIComponent(keyword + Math.floor(Math.random() * 100))}/${w}/${h}`;

const imgSet = (keyword, count = 4) =>
  Array.from({ length: count }, (_, i) =>
    `https://picsum.photos/seed/${encodeURIComponent(keyword + i)}/${400}/${400}`
  );

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── Mongoose Schemas (inline — adjust imports to match your actual models) ─

// If you have separate model files, replace these with:
// import Category from '../models/Category.js'
// import Product  from '../models/Product.js'  ... etc.

const categorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  image: String,
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  shortDescription: String,
  price: Number,
  comparePrice: Number,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  images: [String],
  thumbnail: String,
  stock: Number,
  sku: String,
  tags: [String],
  specifications: mongoose.Schema.Types.Mixed,
  ratings: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  brand: String,
  weight: Number,
  dimensions: { length: Number, width: Number, height: Number },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
  isVerified: { type: Boolean, default: true },
  loyaltyPoints: { type: Number, default: 0 },
  avatar: String,
  addresses: [{
    name: String, phone: String, line1: String, line2: String,
    city: String, state: String, pincode: String, isDefault: Boolean,
  }],
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderId: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String, price: Number, quantity: Number, image: String,
  }],
  shippingAddress: {
    name: String, phone: String, line1: String,
    city: String, state: String, pincode: String,
  },
  subtotal: Number,
  discount: Number,
  deliveryCharge: Number,
  total: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },
  paymentMethod: { type: String, enum: ['razorpay', 'stripe', 'cod'] },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentId: String,
  timeline: [{ status: String, message: String, time: Date }],
  coupon: String,
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, min: 1, max: 5 },
  title: String,
  comment: String,
  isVerified: { type: Boolean, default: true },
  helpfulCount: { type: Number, default: 0 },
}, { timestamps: true });

const couponSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  description: String,
  type: { type: String, enum: ['percentage', 'fixed'] },
  value: Number,
  minOrderAmount: Number,
  maxDiscount: Number,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: Date,
}, { timestamps: true });

const bannerSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  image: String,
  mobileImage: String,
  link: String,
  type: { type: String, enum: ['hero', 'promotional', 'category'] },
  position: Number,
  isActive: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
}, { timestamps: true });

// Register models
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Product   = mongoose.models.Product  || mongoose.model('Product',  productSchema);
const User      = mongoose.models.User     || mongoose.model('User',      userSchema);
const Order     = mongoose.models.Order    || mongoose.model('Order',     orderSchema);
const Review    = mongoose.models.Review   || mongoose.model('Review',    reviewSchema);
const Coupon    = mongoose.models.Coupon   || mongoose.model('Coupon',    couponSchema);
const Banner    = mongoose.models.Banner   || mongoose.model('Banner',    bannerSchema);

// ─── Category Data ───────────────────────────────────────────────────────────

const CATEGORY_TREE = [
  {
    name: 'Electronics', slug: 'electronics', desc: 'Latest gadgets and electronic devices',
    image: img('electronics'),
    children: [
      { name: 'Mobile Phones',  slug: 'mobile-phones',           keywords: ['iphone','samsung','smartphone'] },
      { name: 'Laptops',        slug: 'laptops',                  keywords: ['laptop','macbook','notebook'] },
      { name: 'Tablets',        slug: 'tablets',                  keywords: ['ipad','tablet','android-tablet'] },
      { name: 'Accessories',    slug: 'electronics-accessories',  keywords: ['charger','earphone','cable'] },
    ],
  },
  {
    name: 'Fashion', slug: 'fashion', desc: 'Trending fashion for all',
    image: img('fashion'),
    children: [
      { name: "Men's Fashion",   slug: 'mens-fashion',   keywords: ['shirt','jeans','mens-wear'] },
      { name: "Women's Fashion", slug: 'womens-fashion', keywords: ['dress','kurti','womens-wear'] },
      { name: "Kids' Fashion",   slug: 'kids-fashion',   keywords: ['kids-clothes','children-wear'] },
    ],
  },
  {
    name: 'Home & Kitchen', slug: 'home-kitchen', desc: 'Everything for your home',
    image: img('kitchen'),
    children: [
      { name: 'Kitchen',    slug: 'kitchen',    keywords: ['cookware','utensils','kitchen'] },
      { name: 'Home Decor', slug: 'home-decor', keywords: ['decor','furniture','lamp'] },
    ],
  },
  {
    name: 'Books', slug: 'books', desc: 'Books for every reader',
    image: img('books'),
    children: [
      { name: 'Fiction',     slug: 'fiction',     keywords: ['novel','fiction','story'] },
      { name: 'Non-Fiction', slug: 'non-fiction', keywords: ['biography','self-help','business'] },
    ],
  },
  {
    name: 'Sports', slug: 'sports', desc: 'Sports and outdoor equipment',
    image: img('sports'),
    children: [
      { name: 'Fitness',       slug: 'fitness',       keywords: ['gym','dumbbell','yoga'] },
      { name: 'Outdoor Sports',slug: 'outdoor-sports',keywords: ['cricket','football','badminton'] },
    ],
  },
  {
    name: 'Beauty', slug: 'beauty', desc: 'Beauty and personal care',
    image: img('beauty'),
    children: [
      { name: 'Skincare',  slug: 'skincare',  keywords: ['face-cream','moisturizer','sunscreen'] },
      { name: 'Haircare',  slug: 'haircare',  keywords: ['shampoo','hair-oil','conditioner'] },
    ],
  },
];

// ─── Product Templates ────────────────────────────────────────────────────────

const PRODUCT_TEMPLATES = {
  'mobile-phones': [
    { name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', price: 129999, compare: 139999, specs: { Display: '6.8" QHD+ AMOLED', Processor: 'Snapdragon 8 Gen 3', RAM: '12GB', Storage: '256GB', Battery: '5000mAh', Camera: '200MP' } },
    { name: 'iPhone 15 Pro Max', brand: 'Apple', price: 159900, compare: 169900, specs: { Display: '6.7" Super Retina XDR', Chip: 'A17 Pro', RAM: '8GB', Storage: '256GB', Battery: '4422mAh', Camera: '48MP Main' } },
    { name: 'OnePlus 12', brand: 'OnePlus', price: 64999, compare: 69999, specs: { Display: '6.82" LTPO AMOLED', Processor: 'Snapdragon 8 Gen 3', RAM: '12GB', Storage: '256GB', Battery: '5400mAh', Charging: '100W' } },
    { name: 'Redmi Note 13 Pro+', brand: 'Xiaomi', price: 29999, compare: 34999, specs: { Display: '6.67" AMOLED', Processor: 'MediaTek Dimensity 7200', RAM: '8GB', Storage: '128GB', Battery: '5000mAh', Camera: '200MP' } },
    { name: 'Realme 12 Pro+', brand: 'Realme', price: 26999, compare: 29999, specs: { Display: '6.7" AMOLED', Processor: 'Snapdragon 7s Gen 2', RAM: '8GB', Storage: '128GB', Battery: '5000mAh' } },
    { name: 'Vivo V30 Pro', brand: 'Vivo', price: 39999, compare: 44999, specs: { Display: '6.78" AMOLED', Processor: 'Snapdragon 7 Gen 3', RAM: '12GB', Storage: '256GB', Battery: '5000mAh' } },
    { name: 'Google Pixel 8', brand: 'Google', price: 75999, compare: 82999, specs: { Display: '6.2" OLED', Chip: 'Google Tensor G3', RAM: '8GB', Storage: '128GB', Battery: '4575mAh', Camera: '50MP' } },
    { name: 'Motorola Edge 50 Pro', brand: 'Motorola', price: 31999, compare: 35999, specs: { Display: '6.7" pOLED', Processor: 'Snapdragon 7 Gen 3', RAM: '12GB', Storage: '256GB', Battery: '4500mAh' } },
    { name: 'Nothing Phone 2a', brand: 'Nothing', price: 23999, compare: 26999, specs: { Display: '6.7" AMOLED', Processor: 'MediaTek Dimensity 7200 Pro', RAM: '8GB', Storage: '128GB', Battery: '5000mAh' } },
    { name: 'iQOO Neo 9 Pro', brand: 'iQOO', price: 36999, compare: 40999, specs: { Display: '6.78" AMOLED', Processor: 'Snapdragon 8 Gen 2', RAM: '12GB', Storage: '256GB', Battery: '4600mAh', Charging: '144W' } },
    { name: 'POCO X6 Pro', brand: 'Poco', price: 22999, compare: 25999, specs: { Display: '6.67" AMOLED', Processor: 'MediaTek Dimensity 8300', RAM: '8GB', Storage: '256GB', Battery: '5000mAh' } },
    { name: 'Samsung Galaxy A55', brand: 'Samsung', price: 34999, compare: 38999, specs: { Display: '6.6" Super AMOLED', Processor: 'Exynos 1480', RAM: '8GB', Storage: '128GB', Battery: '5000mAh' } },
    { name: 'Oppo Reno 12 Pro', brand: 'Oppo', price: 36999, compare: 40999, specs: { Display: '6.7" AMOLED', Processor: 'MediaTek Dimensity 7300', RAM: '12GB', Storage: '256GB', Battery: '5000mAh' } },
    { name: 'Infinix Note 40 Pro', brand: 'Infinix', price: 17999, compare: 20999, specs: { Display: '6.78" AMOLED', Processor: 'Helio G99 Ultimate', RAM: '12GB', Storage: '256GB', Battery: '5000mAh' } },
    { name: 'Honor 90', brand: 'Honor', price: 29999, compare: 33999, specs: { Display: '6.7" AMOLED', Processor: 'Snapdragon 7s Gen 2', RAM: '12GB', Storage: '256GB', Battery: '5000mAh' } },
  ],
  'laptops': [
    { name: 'MacBook Air M3 13"', brand: 'Apple', price: 114900, compare: 124900, specs: { Processor: 'Apple M3 8-core', RAM: '8GB Unified', Storage: '256GB SSD', Display: '13.6" Liquid Retina', Battery: '18hr', Weight: '1.24kg' } },
    { name: 'Dell XPS 15', brand: 'Dell', price: 189990, compare: 199990, specs: { Processor: 'Intel Core i7-13700H', RAM: '16GB DDR5', Storage: '512GB NVMe SSD', Display: '15.6" OLED 3.5K', GPU: 'NVIDIA RTX 4060' } },
    { name: 'ASUS ROG Strix G15', brand: 'ASUS', price: 124990, compare: 134990, specs: { Processor: 'AMD Ryzen 9 7945HX', RAM: '16GB DDR5', Storage: '1TB SSD', Display: '15.6" 240Hz', GPU: 'NVIDIA RTX 4070' } },
    { name: 'HP Pavilion 15', brand: 'HP', price: 54990, compare: 62990, specs: { Processor: 'Intel Core i5-1335U', RAM: '16GB DDR4', Storage: '512GB SSD', Display: '15.6" FHD IPS' } },
    { name: 'Lenovo IdeaPad Slim 5', brand: 'Lenovo', price: 62990, compare: 70990, specs: { Processor: 'AMD Ryzen 5 7530U', RAM: '16GB', Storage: '512GB SSD', Display: '15.6" FHD IPS' } },
    { name: 'Acer Aspire Lite', brand: 'Acer', price: 47990, compare: 54990, specs: { Processor: 'Intel Core i5-1235U', RAM: '16GB', Storage: '512GB SSD', Display: '15.6" FHD IPS' } },
    { name: 'MSI Thin GF63', brand: 'MSI', price: 59990, compare: 67990, specs: { Processor: 'Intel Core i5-12450H', RAM: '8GB', Storage: '512GB SSD', GPU: 'NVIDIA RTX 4050', Display: '15.6" 144Hz' } },
    { name: 'Realme Book Prime', brand: 'Realme', price: 44990, compare: 50990, specs: { Processor: 'Intel Core i5-11320H', RAM: '16GB LPDDR4X', Storage: '512GB SSD', Display: '14" 2K IPS' } },
    { name: 'Samsung Galaxy Book3 Pro', brand: 'Samsung', price: 119990, compare: 129990, specs: { Processor: 'Intel Core i7-1360P', RAM: '16GB LPDDR5', Storage: '512GB SSD', Display: '14" AMOLED' } },
    { name: 'LG Gram 16', brand: 'LG', price: 104990, compare: 114990, specs: { Processor: 'Intel Core i7-1360P', RAM: '16GB', Storage: '512GB SSD', Display: '16" WQXGA IPS', Weight: '1.19kg' } },
    { name: 'Mi Notebook Pro 14"', brand: 'Xiaomi', price: 54999, compare: 60999, specs: { Processor: 'Intel Core i5-12450H', RAM: '16GB LPDDR5', Storage: '512GB SSD', Display: '14" 2.8K OLED' } },
    { name: 'Asus Vivobook 16X', brand: 'ASUS', price: 65990, compare: 72990, specs: { Processor: 'AMD Ryzen 7 5800H', RAM: '16GB', Storage: '512GB SSD', Display: '16" WUXGA IPS', GPU: 'NVIDIA RTX 3050' } },
    { name: 'Lenovo ThinkPad X1 Carbon', brand: 'Lenovo', price: 159990, compare: 174990, specs: { Processor: 'Intel Core i7-1365U', RAM: '16GB LPDDR5', Storage: '512GB SSD', Display: '14" 2.8K OLED', Weight: '1.12kg' } },
    { name: 'HP Spectre x360 14"', brand: 'HP', price: 134990, compare: 149990, specs: { Processor: 'Intel Core i7-1355U', RAM: '16GB LPDDR5', Storage: '1TB SSD', Display: '14" 2.8K OLED Touch' } },
    { name: 'ASUS ZenBook 14 OLED', brand: 'ASUS', price: 87990, compare: 96990, specs: { Processor: 'Intel Core Ultra 5 125H', RAM: '16GB', Storage: '512GB SSD', Display: '14" 2.8K OLED' } },
  ],
  'tablets': [
    { name: 'iPad Air M2 11"', brand: 'Apple', price: 59900, compare: 65900, specs: { Chip: 'Apple M2', RAM: '8GB', Storage: '128GB', Display: '11" Liquid Retina', Battery: '10 hrs', Camera: '12MP' } },
    { name: 'Samsung Galaxy Tab S9+', brand: 'Samsung', price: 89999, compare: 99999, specs: { Processor: 'Snapdragon 8 Gen 2', RAM: '12GB', Storage: '256GB', Display: '12.4" Dynamic AMOLED 2X' } },
    { name: 'OnePlus Pad', brand: 'OnePlus', price: 37999, compare: 42999, specs: { Processor: 'MediaTek Dimensity 9000', RAM: '12GB', Storage: '256GB', Display: '11.61" LCD 144Hz' } },
    { name: 'Redmi Pad Pro', brand: 'Xiaomi', price: 27999, compare: 31999, specs: { Processor: 'Snapdragon 7s Gen 2', RAM: '8GB', Storage: '128GB', Display: '12.1" LCD 120Hz' } },
    { name: 'Realme Pad 2', brand: 'Realme', price: 19999, compare: 23999, specs: { Processor: 'Unisoc T616', RAM: '6GB', Storage: '128GB', Display: '11.5" LCD 90Hz' } },
    { name: 'POCO Pad', brand: 'POCO', price: 23999, compare: 27999, specs: { Processor: 'Snapdragon 7s Gen 2', RAM: '8GB', Storage: '256GB', Display: '12.1" LCD 120Hz' } },
    { name: 'Lenovo Tab M11', brand: 'Lenovo', price: 14999, compare: 18999, specs: { Processor: 'MediaTek Helio G88', RAM: '4GB', Storage: '128GB', Display: '11" LCD 90Hz' } },
    { name: 'Samsung Galaxy Tab A9+', brand: 'Samsung', price: 23999, compare: 27999, specs: { Processor: 'Snapdragon 695', RAM: '8GB', Storage: '128GB', Display: '11" LCD 90Hz' } },
  ],
  'electronics-accessories': [
    { name: 'Apple AirPods Pro 2nd Gen', brand: 'Apple', price: 24900, compare: 26900, specs: { Type: 'TWS Earbuds', ANC: 'Yes', Battery: '30hrs with case', Connectivity: 'Bluetooth 5.3', Water: 'IPX4' } },
    { name: 'Sony WH-1000XM5', brand: 'Sony', price: 28990, compare: 34990, specs: { Type: 'Over-ear Headphones', ANC: 'Yes', Battery: '30hrs', Connectivity: 'Bluetooth 5.2', Foldable: 'No' } },
    { name: 'Anker 65W USB-C GaN Charger', brand: 'Anker', price: 2499, compare: 3499, specs: { Power: '65W GaN', Ports: '2x USB-C + 1x USB-A', Compatibility: 'Universal', Size: 'Compact' } },
    { name: 'Samsung 25W Fast Charger', brand: 'Samsung', price: 999, compare: 1499, specs: { Power: '25W', Cable: 'USB-C to USB-C', Compatibility: 'Samsung + Universal' } },
    { name: 'Realme Buds Air 5 Pro', brand: 'Realme', price: 3999, compare: 5999, specs: { Type: 'TWS', ANC: '50dB', Battery: '38hrs with case', Connectivity: 'Bluetooth 5.3' } },
    { name: 'boAt Rockerz 450', brand: 'boAt', price: 1299, compare: 2999, specs: { Type: 'On-ear', Battery: '15hrs', Connectivity: 'Bluetooth 5.0 + 3.5mm', Mic: 'Built-in' } },
    { name: 'Mi Power Bank 20000mAh', brand: 'Xiaomi', price: 1999, compare: 2799, specs: { Capacity: '20000mAh', Output: '22.5W Fast Charge', Ports: '2x USB-A + 1x USB-C', Display: 'LED Indicator' } },
    { name: 'Logitech MX Master 3S', brand: 'Logitech', price: 8995, compare: 11995, specs: { Type: 'Wireless Mouse', DPI: '200-8000', Battery: '70 days', Connectivity: 'Bluetooth + USB Receiver' } },
    { name: 'Zebronics Zeb-Max Pro Wireless Mouse', brand: 'Zebronics', price: 999, compare: 1799, specs: { Type: 'Wireless Mouse', DPI: '1600', Battery: '3 months', Connectivity: 'Bluetooth + 2.4GHz' } },
    { name: 'Apple Watch Series 9 (41mm)', brand: 'Apple', price: 41900, compare: 45900, specs: { Chip: 'S9 SiP', Display: '1.9" OLED', Health: 'ECG, SpO2, Temperature', Battery: '18hrs', Water: '50m' } },
    { name: 'Samsung Galaxy Watch6', brand: 'Samsung', price: 24999, compare: 28999, specs: { Processor: 'Exynos W930', Display: '1.5" AMOLED', Health: 'ECG, Body Composition', Battery: '40hrs' } },
    { name: 'JBL Charge 5 Bluetooth Speaker', brand: 'JBL', price: 13999, compare: 17999, specs: { Type: 'Portable Speaker', Battery: '20hrs', Waterproof: 'IP67', Connectivity: 'Bluetooth 5.1' } },
    { name: 'Portronics Kronos X2 Smartwatch', brand: 'Portronics', price: 1299, compare: 2999, specs: { Display: '1.85" TFT', Health: 'SpO2, Heart Rate', Battery: '7 days', Water: 'IP67' } },
    { name: 'Belkin 3-in-1 MagSafe Charger', brand: 'Belkin', price: 7999, compare: 9999, specs: { Charges: 'iPhone + Watch + AirPods', MagSafe: '15W', Watch: '5W' } },
    { name: 'Syska Power Core 10000mAh', brand: 'Syska', price: 999, compare: 1799, specs: { Capacity: '10000mAh', Output: '18W Fast Charge', Ports: 'USB-A + USB-C', Weight: '215g' } },
  ],
  'mens-fashion': [
    { name: 'Allen Solly Slim Fit Formal Shirt', brand: 'Allen Solly', price: 1299, compare: 2599, specs: { Material: '60% Cotton 40% Polyester', Fit: 'Slim Fit', Occasion: 'Formal', Care: 'Machine Wash' } },
    { name: "Levi's 511 Slim Fit Jeans", brand: "Levi's", price: 2499, compare: 3999, specs: { Material: '99% Cotton 1% Elastane', Fit: 'Slim Fit', Rise: 'Mid Rise', Closure: 'Button + Zip' } },
    { name: 'Nike Dri-FIT Training T-Shirt', brand: 'Nike', price: 1699, compare: 2299, specs: { Material: '100% Polyester', Technology: 'Dri-FIT', Fit: 'Standard', Occasion: 'Sports/Casual' } },
    { name: 'Raymond Wool Blend Blazer', brand: 'Raymond', price: 4999, compare: 8999, specs: { Material: 'Wool Blend', Fit: 'Regular', Occasion: 'Formal', Lining: 'Fully Lined' } },
    { name: 'Peter England Stretch Chinos', brand: 'Peter England', price: 1499, compare: 2499, specs: { Material: '98% Cotton 2% Stretch', Fit: 'Slim', Rise: 'Mid', Closure: 'Hook + Zip' } },
    { name: 'H&M Basic Crew-neck T-Shirt', brand: 'H&M', price: 799, compare: 1299, specs: { Material: '100% Cotton', Fit: 'Regular', Neck: 'Crew', Care: 'Machine Wash 40deg' } },
    { name: 'Adidas Track Jacket', brand: 'Adidas', price: 3499, compare: 4999, specs: { Material: 'Recycled Polyester', Technology: 'Moisture Wicking', Fit: 'Regular', Pockets: '2 Side Zip' } },
    { name: 'Van Heusen Formal Trousers', brand: 'Van Heusen', price: 1799, compare: 2999, specs: { Material: 'Poly Viscose', Fit: 'Slim', Occasion: 'Formal', Closure: 'Hook + Zip' } },
    { name: 'U.S. Polo Assn. Polo T-Shirt', brand: 'U.S. Polo Assn.', price: 1299, compare: 1999, specs: { Material: 'Cotton Pique', Fit: 'Regular', Collar: 'Polo', Care: 'Machine Wash' } },
    { name: 'Tommy Hilfiger Hooded Sweatshirt', brand: 'Tommy Hilfiger', price: 3999, compare: 5999, specs: { Material: 'Cotton Blend', Fit: 'Regular', Hood: 'Adjustable Drawstring', Pockets: 'Kangaroo Pocket' } },
    { name: 'Zara Men Genuine Leather Belt', brand: 'Zara', price: 1499, compare: 2499, specs: { Material: 'Genuine Leather', Width: '3.5cm', Buckle: 'Metal Prong', Sizes: '28 to 42' } },
    { name: 'Woodland Leather Casual Shoes', brand: 'Woodland', price: 2999, compare: 4499, specs: { Material: 'Full Grain Leather', Sole: 'Rubber', Closure: 'Lace-up', Water: 'Water Resistant' } },
    { name: 'Fossil Grant Chronograph Watch', brand: 'Fossil', price: 8999, compare: 12999, specs: { Case: '44mm Stainless Steel', Band: 'Leather', Water: '50m', Movement: 'Chronograph Quartz' } },
    { name: 'Wildcraft Trekking Backpack 45L', brand: 'Wildcraft', price: 2999, compare: 4499, specs: { Capacity: '45 Litres', Material: 'Polyester', Frame: 'Internal', Water: 'Water Resistant' } },
    { name: 'Flying Machine Graphic Tee', brand: 'Flying Machine', price: 699, compare: 1199, specs: { Material: '100% Cotton', Fit: 'Regular', Print: 'Graphic Front', Neck: 'Round' } },
  ],
  'womens-fashion': [
    { name: 'W Women Floral Kurta', brand: 'W', price: 1299, compare: 2199, specs: { Material: 'Cotton', Pattern: 'Floral Print', Sleeve: '3/4 Sleeve', Occasion: 'Ethnic/Casual' } },
    { name: 'Fabindia Cotton Block Print Salwar Suit', brand: 'Fabindia', price: 2499, compare: 3999, specs: { Material: 'Pure Cotton', Set: 'Kurta + Salwar + Dupatta', Craft: 'Block Print', Care: 'Hand Wash' } },
    { name: 'H&M Floral Wrap Midi Dress', brand: 'H&M', price: 1499, compare: 2499, specs: { Material: 'Woven Fabric', Fit: 'Regular', Length: 'Midi', Closure: 'Wrap Tie' } },
    { name: 'Zara High-Waist Straight Trousers', brand: 'Zara', price: 2299, compare: 3499, specs: { Material: 'Polyester Blend', Waist: 'High Rise', Fit: 'Straight Leg', Closure: 'Hook + Zip' } },
    { name: 'Nike Women Dri-FIT Training Tights', brand: 'Nike', price: 1999, compare: 2999, specs: { Material: '75% Polyester 25% Spandex', Technology: 'Dri-FIT', Waist: 'Mid-Rise', Pockets: 'Side' } },
    { name: 'Libas Woven Zari Georgette Saree', brand: 'Libas', price: 1799, compare: 2999, specs: { Material: 'Georgette', Blouse: 'Included Unstitched', Occasion: 'Party/Festival', Work: 'Woven Zari' } },
    { name: 'Anouk A-Line Anarkali Ethnic Dress', brand: 'Anouk', price: 1499, compare: 2499, specs: { Material: 'Poly Georgette', Fit: 'A-Line', Length: 'Ankle', Occasion: 'Festive' } },
    { name: "Clarks Women's Block Heel Pumps", brand: 'Clarks', price: 3999, compare: 5999, specs: { Material: 'Leather', Heel: '5cm Block Heel', Closure: 'Slip On', Occasion: 'Formal/Casual' } },
    { name: 'Hidesign Leather Satchel Handbag', brand: 'Hidesign', price: 4999, compare: 7999, specs: { Material: 'Full Grain Leather', Pockets: '3 Compartments + 4 Card Slots', Closure: 'Magnetic Snap', Strap: 'Detachable' } },
    { name: 'Titan Raga Rose Gold Watch', brand: 'Titan', price: 5999, compare: 7999, specs: { Case: '28mm Rose Gold', Band: 'Metal Bracelet', Water: '30m', Movement: 'Quartz' } },
    { name: 'Lavie Large Tote Bag', brand: 'Lavie', price: 1499, compare: 2499, specs: { Material: 'PU Leather', Capacity: 'Large', Pockets: 'Multiple', Handles: 'Dual' } },
    { name: 'Biba Ethnic Print Tops', brand: 'Biba', price: 899, compare: 1499, specs: { Material: 'Rayon', Fit: 'Regular', Print: 'Ethnic Print', Occasion: 'Casual/Festive' } },
    { name: 'Marks & Spencer Linen Blazer', brand: 'Marks & Spencer', price: 4499, compare: 6999, specs: { Material: 'Linen Blend', Fit: 'Regular', Occasion: 'Smart Casual', Buttons: 'Single Breasted' } },
    { name: 'Lakme Sun Expert SPF 50 Compact', brand: 'Lakme', price: 349, compare: 499, specs: { SPF: '50 PA+++', Finish: 'Matte', Size: '10g', For: 'All Skin Types' } },
    { name: 'Tanishq 18K Gold Zirconia Earrings', brand: 'Tanishq', price: 9999, compare: 12999, specs: { Metal: '18K Gold', Stone: 'Cubic Zirconia', Closure: 'Push Back', Occasion: 'Festive/Wedding' } },
  ],
  'kids-fashion': [
    { name: 'H&M Kids Printed Cotton T-Shirt', brand: 'H&M', price: 599, compare: 999, specs: { Material: '100% Cotton', Fit: 'Regular', Age: '2-14 years', Care: 'Machine Wash 40deg' } },
    { name: 'Babyhug Denim Dungaree', brand: 'Babyhug', price: 799, compare: 1299, specs: { Material: '100% Cotton Denim', Pockets: 'Front + Back', Closure: 'Button', Age: '1-7 years' } },
    { name: 'Mothercare Organic Sleepsuit Set of 3', brand: 'Mothercare', price: 999, compare: 1599, specs: { Material: 'Organic Cotton', Pack: 'Set of 3', Snap: 'Front + Bottom', Age: '0-24 months' } },
    { name: 'Gini and Jony Girls Party Dress', brand: 'Gini & Jony', price: 1299, compare: 2199, specs: { Material: 'Net + Satin', Occasion: 'Party', Sleeve: 'Sleeveless', Age: '2-12 years' } },
    { name: 'Campus Kids Running Shoes', brand: 'Campus', price: 799, compare: 1499, specs: { Material: 'Mesh Upper', Sole: 'EVA', Closure: 'Velcro', Age: '5-12 years' } },
    { name: 'Hopscotch Boys Cargo Pants', brand: 'Hopscotch', price: 699, compare: 1199, specs: { Material: '100% Cotton', Fit: 'Regular', Pockets: '6 Cargo', Age: '3-12 years' } },
    { name: 'Allen Solly Junior Casual Shirt', brand: 'Allen Solly Junior', price: 799, compare: 1499, specs: { Material: 'Cotton Blend', Fit: 'Regular', Occasion: 'Casual', Age: '4-14 years' } },
    { name: 'Marks and Spencer Girls Slim Jeans', brand: 'Marks & Spencer', price: 999, compare: 1799, specs: { Material: 'Stretch Denim', Fit: 'Slim', Waist: 'Adjustable', Age: '3-16 years' } },
  ],
  'kitchen': [
    { name: 'Prestige Popular Pressure Cooker 5L', brand: 'Prestige', price: 1499, compare: 2199, specs: { Capacity: '5 Litres', Material: 'Aluminium', Flame: 'All Burners', ISI: 'Mark' } },
    { name: 'Bajaj Mixer Grinder 750W 3 Jars', brand: 'Bajaj', price: 2299, compare: 3499, specs: { Power: '750W', Jars: '3 Stainless Steel', Speed: '3-speed + Pulse', Warranty: '2 years' } },
    { name: 'Philips Air Fryer HD9200 4.1L', brand: 'Philips', price: 6499, compare: 8999, specs: { Capacity: '4.1L', Technology: 'Rapid Air', Temp: '80-200 deg C', Power: '1400W' } },
    { name: 'Milton Thermosteel Bottle 1L', brand: 'Milton', price: 699, compare: 1199, specs: { Capacity: '1 Litre', Material: 'Stainless Steel', Keeps: 'Hot 24hr / Cold 24hr', BPA: 'Free' } },
    { name: 'Borosil Glass Mixing Bowl Set of 3', brand: 'Borosil', price: 799, compare: 1299, specs: { Pack: 'Set of 3', Material: 'Borosilicate Glass', Oven: 'Safe', Microwave: 'Safe', Dishwasher: 'Safe' } },
    { name: 'Pigeon Non-Stick Tawa 28cm', brand: 'Pigeon', price: 499, compare: 849, specs: { Size: '28cm', Material: 'Aluminium', Coating: 'Non-Stick PTFE', Induction: 'Compatible', PFOA: 'Free' } },
    { name: 'Butterfly Smart Wet Grinder 2L', brand: 'Butterfly', price: 3999, compare: 5999, specs: { Capacity: '2 Litres', Power: '150W', Drum: 'Stainless Steel', Timer: 'Auto Timer 30 min' } },
    { name: 'Instant Pot Duo 7-in-1 Electric Cooker', brand: 'Instant Pot', price: 7499, compare: 9999, specs: { Functions: '7 functions', Capacity: '5.7L', Power: '1000W' } },
    { name: 'Wonderchef Granite Forged Kadhai 28cm', brand: 'Wonderchef', price: 1499, compare: 2499, specs: { Size: '28cm', Material: 'Forged Aluminium', Coating: 'Granite', Induction: 'Compatible' } },
    { name: 'Kent Cold Press Slow Juicer', brand: 'Kent', price: 4999, compare: 6999, specs: { Type: 'Cold Press / Slow Juicer', RPM: '45', Power: '150W', Yield: 'High', Noise: 'Low' } },
  ],
  'home-decor': [
    { name: 'Urban Ladder Scandinavian Bookshelf', brand: 'Urban Ladder', price: 8999, compare: 12999, specs: { Material: 'Engineered Wood', Shelves: '4', Dimensions: '90x30x150cm', Assembly: 'Required' } },
    { name: 'IKEA POANG Armchair with Cushion', brand: 'IKEA', price: 7999, compare: 10999, specs: { Material: 'Birch Veneer + Cushion', Load: 'Max 110kg', Assembly: 'Required', Cushion: 'Included' } },
    { name: 'Pepperfry Geometric Metal Table Lamp', brand: 'Pepperfry', price: 1499, compare: 2499, specs: { Material: 'Metal', Bulb: 'E27 Max 40W not included', Height: '45cm', Shade: 'Fabric' } },
    { name: 'FabIndia Hand-Woven Cotton Dhurrie Rug 5x8', brand: 'FabIndia', price: 3999, compare: 5999, specs: { Material: 'Cotton', Size: '5x8 feet', Weave: 'Flat Weave', Care: 'Dry Clean' } },
    { name: 'Godrej Interio Hydraulic Storage Bed Queen', brand: 'Godrej Interio', price: 24999, compare: 34999, specs: { Size: 'Queen 160x200cm', Material: 'Engineered Wood', Storage: 'Hydraulic Lift' } },
    { name: 'Philips Smart LED Bulb E27 9W Warm White', brand: 'Philips', price: 299, compare: 499, specs: { Power: '9W', Equivalent: '75W', Color: 'Warm White 2700K', Life: '15000 hours', Base: 'E27' } },
    { name: 'Home Centre Cushion Cover Set of 5', brand: 'Home Centre', price: 799, compare: 1299, specs: { Pack: 'Set of 5', Material: 'Polyester', Size: '40x40cm', Fill: 'Covers Only' } },
    { name: "D'Decor Abstract Canvas Print 24x36 inches", brand: "D'Decor", price: 1999, compare: 3499, specs: { Size: '24x36 inches', Material: 'Canvas + Wood Frame', Type: 'Stretched Canvas', Hanging: 'Ready to Hang' } },
    { name: 'Amazon Basics Microfibre King Bedsheet Set', brand: 'Amazon Basics', price: 699, compare: 1299, specs: { Size: 'King 270x270cm', Material: 'Microfibre', Includes: '1 Bedsheet + 2 Pillowcases' } },
    { name: 'Prestige Xclusive Round Wall Clock 30cm', brand: 'Prestige', price: 499, compare: 799, specs: { Size: '30cm', Movement: 'Quartz Silent Sweep', Battery: 'AA x1', Style: 'Modern Minimalist' } },
  ],
  'fiction': [
    { name: 'The Alchemist by Paulo Coelho', brand: 'HarperCollins', price: 299, compare: 399, specs: { Author: 'Paulo Coelho', Pages: '208', Language: 'English', Format: 'Paperback', Genre: 'Fiction/Inspirational' } },
    { name: 'The God of Small Things by Arundhati Roy', brand: 'Penguin India', price: 299, compare: 399, specs: { Author: 'Arundhati Roy', Pages: '333', Language: 'English', Format: 'Paperback', Genre: 'Indian Fiction' } },
    { name: 'The Kite Runner by Khaled Hosseini', brand: 'Bloomsbury', price: 399, compare: 549, specs: { Author: 'Khaled Hosseini', Pages: '372', Language: 'English', Format: 'Paperback', Genre: 'Fiction' } },
    { name: '2 States by Chetan Bhagat', brand: 'Rupa Publications', price: 175, compare: 250, specs: { Author: 'Chetan Bhagat', Pages: '288', Language: 'English', Format: 'Paperback', Genre: 'Indian Fiction/Romance' } },
    { name: 'The Immortals of Meluha by Amish Tripathi', brand: 'Westland', price: 299, compare: 399, specs: { Author: 'Amish Tripathi', Pages: '404', Language: 'English', Format: 'Paperback', Genre: 'Mythological Fiction' } },
    { name: 'Harry Potter Box Set All 7 Books', brand: 'Bloomsbury', price: 2999, compare: 4499, specs: { Author: 'J.K. Rowling', Books: '7', Language: 'English', Format: 'Paperback Box Set', Genre: 'Fantasy' } },
    { name: 'Wings of Fire by APJ Abdul Kalam', brand: 'Universities Press', price: 199, compare: 299, specs: { Author: 'APJ Abdul Kalam', Pages: '196', Language: 'English', Format: 'Paperback', Genre: 'Autobiography' } },
    { name: 'Five Point Someone by Chetan Bhagat', brand: 'Rupa Publications', price: 150, compare: 225, specs: { Author: 'Chetan Bhagat', Pages: '257', Language: 'English', Format: 'Paperback', Genre: 'Indian Fiction' } },
    { name: 'A Thousand Splendid Suns by Khaled Hosseini', brand: 'Bloomsbury', price: 399, compare: 549, specs: { Author: 'Khaled Hosseini', Pages: '432', Language: 'English', Format: 'Paperback', Genre: 'Fiction' } },
    { name: 'Malgudi Days by R.K. Narayan', brand: 'Penguin', price: 249, compare: 349, specs: { Author: 'R.K. Narayan', Pages: '280', Language: 'English', Format: 'Paperback', Genre: 'Indian Classic Fiction' } },
  ],
  'non-fiction': [
    { name: 'Atomic Habits by James Clear', brand: 'Penguin', price: 549, compare: 699, specs: { Author: 'James Clear', Pages: '320', Language: 'English', Format: 'Hardcover', Genre: 'Self-Help' } },
    { name: 'Rich Dad Poor Dad by Robert Kiyosaki', brand: 'Plata Publishing', price: 349, compare: 499, specs: { Author: 'Robert Kiyosaki', Pages: '336', Language: 'English', Format: 'Paperback', Genre: 'Personal Finance' } },
    { name: 'Sapiens by Yuval Noah Harari', brand: 'Harper Perennial', price: 499, compare: 699, specs: { Author: 'Yuval Noah Harari', Pages: '512', Language: 'English', Format: 'Paperback', Genre: 'History/Non-Fiction' } },
    { name: 'Psychology of Money by Morgan Housel', brand: 'Jaico Publishing', price: 399, compare: 549, specs: { Author: 'Morgan Housel', Pages: '256', Language: 'English', Format: 'Paperback', Genre: 'Finance/Psychology' } },
    { name: 'Zero to One by Peter Thiel', brand: 'Virgin Books', price: 449, compare: 599, specs: { Author: 'Peter Thiel', Pages: '224', Language: 'English', Format: 'Paperback', Genre: 'Business/Startup' } },
    { name: 'The 4-Hour Workweek by Tim Ferriss', brand: 'Harmony', price: 499, compare: 699, specs: { Author: 'Timothy Ferriss', Pages: '416', Language: 'English', Format: 'Paperback', Genre: 'Business/Lifestyle' } },
    { name: 'Good to Great by Jim Collins', brand: 'HarperBusiness', price: 599, compare: 799, specs: { Author: 'Jim Collins', Pages: '320', Language: 'English', Format: 'Hardcover', Genre: 'Business/Management' } },
    { name: 'Think and Grow Rich by Napoleon Hill', brand: 'Fingerprint Publishing', price: 199, compare: 299, specs: { Author: 'Napoleon Hill', Pages: '288', Language: 'English', Format: 'Paperback', Genre: 'Self-Help/Success' } },
    { name: 'Ikigai by Hector Garcia', brand: 'Penguin', price: 299, compare: 399, specs: { Author: 'Hector Garcia', Pages: '208', Language: 'English', Format: 'Paperback', Genre: 'Self-Help/Philosophy' } },
    { name: 'The Lean Startup by Eric Ries', brand: 'Currency', price: 549, compare: 749, specs: { Author: 'Eric Ries', Pages: '336', Language: 'English', Format: 'Paperback', Genre: 'Business/Entrepreneurship' } },
  ],
  'fitness': [
    { name: 'Kore PVC Dumbbell Set 20kg', brand: 'Kore', price: 1599, compare: 2499, specs: { Weight: '20kg (2x10kg)', Material: 'PVC Coated Cast Iron', Handle: 'Rubber Grip' } },
    { name: 'Boldfit 6mm TPE Yoga Mat', brand: 'Boldfit', price: 799, compare: 1299, specs: { Thickness: '6mm', Material: 'TPE', Size: '183x61cm', Grip: 'Anti-Slip Both Sides', Carry: 'Strap Included' } },
    { name: 'Cosco Resistance Bands Set of 5', brand: 'Cosco', price: 499, compare: 899, specs: { Pack: 'Set of 5', Resistance: '5 Levels 5-40 lbs', Material: 'Natural Latex', Use: 'Exercise/PT/Yoga' } },
    { name: 'Nivia Ball Bearing Skipping Rope', brand: 'Nivia', price: 299, compare: 599, specs: { Handle: 'Foam Grip', Bearing: 'Ball Bearing', Length: 'Adjustable 9 feet', Material: 'PVC Cable' } },
    { name: 'Vivo Fitness Door Frame Pull-Up Bar', brand: 'Vivo Fitness', price: 899, compare: 1499, specs: { Load: 'Max 150kg', Material: 'Steel', Installation: 'Door Frame No Screws', Adjustable: '75-100cm' } },
    { name: 'Strauss Adjustable Dumbbell 20kg', brand: 'Strauss', price: 2999, compare: 4499, specs: { Weight: '20kg Adjustable', Increment: '2.5kg', Material: 'Cast Iron + Chrome Bar' } },
    { name: 'Adidas Training Shorts DriFit', brand: 'Adidas', price: 1299, compare: 1999, specs: { Material: 'Recycled Polyester', Technology: 'Climacool', Length: 'Knee-Length', Pockets: 'Side' } },
    { name: 'MyProtein Impact Whey Protein 2.5kg', brand: 'MyProtein', price: 3999, compare: 5999, specs: { Protein: '21g per serving', Servings: '80', Flavors: 'Chocolate, Vanilla, Strawberry', Suitability: 'Vegetarian' } },
    { name: 'Decathlon Domyos Foam Roller', brand: 'Domyos', price: 699, compare: 1199, specs: { Length: '30cm', Diameter: '14cm', Material: 'EVA Foam', Density: 'Medium-Firm' } },
    { name: 'Boldfit Ab Roller Wheel with Knee Pad', brand: 'Boldfit', price: 499, compare: 899, specs: { Material: 'Foam + Steel', Wheel: 'Dual Wheel', Knee: 'Pad Included', For: 'Core Workout' } },
  ],
  'outdoor-sports': [
    { name: 'SS Ton Grade A Kashmir Willow Cricket Bat', brand: 'SS', price: 1299, compare: 1999, specs: { Wood: 'Kashmir Willow Grade A', Handle: 'Cane', Weight: '1100-1200g', Edges: '38mm' } },
    { name: 'Nivia International Size 5 Football', brand: 'Nivia', price: 699, compare: 1199, specs: { Size: '5 International', Bladder: 'Butyl', Panels: '32', Surface: 'Grass/Turf' } },
    { name: 'Yonex ZR 100 Badminton Racket', brand: 'Yonex', price: 699, compare: 1199, specs: { Weight: '85g', Flex: 'Medium', Frame: 'Isometric', String: 'Pre-strung', Level: 'Beginner-Intermediate' } },
    { name: 'SG Cricket Helmet Youth Size', brand: 'SG', price: 1499, compare: 2299, specs: { Shell: 'ABS Plastic', Grill: 'MS Steel', Foam: 'High Density', Size: 'Youth 53-56cm' } },
    { name: 'Cosco Official Size 7 Basketball', brand: 'Cosco', price: 899, compare: 1499, specs: { Size: '7 Official', Bladder: 'Butyl', Cover: 'Rubber', Surface: 'Indoor/Outdoor' } },
    { name: 'ASICS Gel-Kayano 30 Running Shoes', brand: 'ASICS', price: 9999, compare: 13999, specs: { Technology: 'GEL Cushioning + LYTE FOAM', Upper: 'Engineered Mesh', Drop: '10mm', Support: 'Stability' } },
    { name: 'Kipsta FG Firm Ground Football Boots', brand: 'Kipsta', price: 1299, compare: 1999, specs: { Material: 'Synthetic Upper', Sole: 'FG Firm Ground', Studs: '12 Fixed' } },
    { name: 'Racket Nation Table Tennis Set Complete', brand: 'Racket Nation', price: 1499, compare: 2499, specs: { Pack: '2 Rackets + 3 Balls + Net', Level: 'Amateur' } },
    { name: 'Yonex Mavis 350 Nylon Shuttlecock 6 Pack', brand: 'Yonex', price: 449, compare: 699, specs: { Type: 'Nylon', Speed: 'Medium Blue Cap', Pack: '6 Shuttlecocks', Level: 'Intermediate' } },
    { name: 'Sportcraft Steel Cricket Stumps Set', brand: 'Sportcraft', price: 799, compare: 1299, specs: { Material: 'Steel Tube', Height: '28 inches', Set: '3 Stumps + 2 Bails', Portable: 'Ground Spike' } },
  ],
  'skincare': [
    { name: 'Minimalist Niacinamide 10% Serum 30ml', brand: 'Minimalist', price: 599, compare: 799, specs: { Active: 'Niacinamide 10% + Zinc 1%', Size: '30ml', For: 'Pores, Oily Skin', pH: '5.5-6.5', Apply: 'PM' } },
    { name: 'Cetaphil Moisturizing Cream 250g', brand: 'Cetaphil', price: 699, compare: 899, specs: { Size: '250g', Skin: 'Dry + Sensitive', Fragrance: 'Free', Paraben: 'Free' } },
    { name: 'Neutrogena Sunscreen SPF 50+ 88ml', brand: 'Neutrogena', price: 499, compare: 699, specs: { SPF: '50+ PA++++', Size: '88ml', Type: 'Ultra Sheer Dry-Touch', Finish: 'Non-Greasy' } },
    { name: 'Mamaearth Vitamin C Face Wash 100ml', brand: 'Mamaearth', price: 299, compare: 399, specs: { Key: 'Vitamin C + Turmeric', Size: '100ml', Skin: 'All Types', Sulphate: 'Free' } },
    { name: 'The Derma Co 2% Salicylic Acid Serum 30ml', brand: 'The Derma Co', price: 399, compare: 599, specs: { Active: 'Salicylic Acid 2%', Size: '30ml', For: 'Acne, Blackheads', Texture: 'Gel' } },
    { name: 'Dot and Key Watermelon Sleeping Mask 85g', brand: 'Dot & Key', price: 549, compare: 749, specs: { Type: 'Overnight Mask', Key: 'Watermelon + Hyaluronic Acid', Size: '85g' } },
    { name: 'Plum E-Luminence Micellar Cleansing Water 100ml', brand: 'Plum', price: 349, compare: 499, specs: { Type: 'Micellar Cleansing Water', Key: 'Vitamin E + Plant Extracts', Size: '100ml', Vegan: 'Yes' } },
    { name: 'COSRX Snail Mucin 96 Essence 100ml', brand: 'COSRX', price: 799, compare: 1199, specs: { Key: 'Snail Secretion Filtrate 96%', Size: '100ml', For: 'Hydration, Repair', Texture: 'Gel Essence' } },
    { name: 'Forest Essentials Tejasvi Face Wash 150ml', brand: 'Forest Essentials', price: 999, compare: 1299, specs: { Key: 'Manjistha + Turmeric + Saffron', Size: '150ml', Type: 'Ayurvedic' } },
    { name: 'Himalaya Neem Face Pack 50ml', brand: 'Himalaya', price: 99, compare: 149, specs: { Key: 'Neem + Turmeric', Size: '50ml', For: 'Oily + Acne Prone', Apply: 'Weekly' } },
  ],
  'haircare': [
    { name: 'Dove Intense Repair Shampoo 1 Litre', brand: 'Dove', price: 399, compare: 549, specs: { Size: '1 Litre', For: 'Damaged Hair', Key: 'Keratin Actives' } },
    { name: 'Mamaearth Onion Hair Oil 250ml', brand: 'Mamaearth', price: 349, compare: 499, specs: { Key: 'Onion + Redensyl + Biotin', Size: '250ml', For: 'Hair Fall Control', Paraben: 'Free' } },
    { name: 'Tresemme Keratin Smooth Conditioner 580ml', brand: 'Tresemme', price: 349, compare: 499, specs: { Size: '580ml', For: 'Frizzy Hair', Key: 'Keratin + Marula Oil', Leave: '2 min' } },
    { name: 'Beardo Beard and Hair Combo Kit', brand: 'Beardo', price: 799, compare: 1199, specs: { Includes: 'Beard Oil 30ml + Beard Wash 100ml + Comb', For: 'Men', Key: 'Argan + Jojoba' } },
    { name: 'WOW Apple Cider Vinegar Shampoo 300ml', brand: 'WOW', price: 379, compare: 549, specs: { Key: 'Apple Cider Vinegar + Almond + Argan', Size: '300ml', Sulphate: 'Free', Paraben: 'Free' } },
    { name: 'Streax Ultralights Walnut Oil Hair Serum 100ml', brand: 'Streax', price: 249, compare: 399, specs: { Size: '100ml', Key: 'Walnut Oil', For: 'Frizzy + Dry Hair', Finish: 'Non-Greasy' } },
    { name: 'Biotique Bio Bhringraj Hair Oil 200ml', brand: 'Biotique', price: 199, compare: 299, specs: { Key: 'Bhringraj + Amla + Brahmi', Size: '200ml', For: 'Hair Fall + Growth', Massage: '30 min before wash' } },
    { name: "L'Oreal Paris Extraordinary Hair Oil 100ml", brand: "L'Oreal Paris", price: 449, compare: 649, specs: { Type: 'Hair Oil Serum', Key: 'Floral Oil Complex', Size: '100ml', Finish: 'Glossy' } },
    { name: 'Pantene Pro-V Silky Smooth Shampoo 675ml', brand: 'Pantene', price: 349, compare: 499, specs: { Size: '675ml', For: 'Smooth + Frizz Free', Technology: 'Pro-V Nutrients' } },
    { name: 'Kama Ayurveda Bringaraj Hair Treatment 200ml', brand: 'Kama Ayurveda', price: 1295, compare: 1795, specs: { Key: 'Bhringraj + 18 Herbs', Size: '200ml', Type: 'Pre-Wash Treatment', Leave: '30-60 min' } },
  ],
};

// ─── Review comments pool ────────────────────────────────────────────────────

const REVIEW_COMMENTS = {
  5: [
    'Excellent product! Exactly as described. Very happy with my purchase.',
    'Superb quality. Delivery was also very fast. Highly recommended!',
    'Mind-blowing product. Worth every rupee. Will buy again.',
    'Bahut badhiya product hai. Quality ekdum top notch.',
    'Outstanding build quality. My whole family is impressed.',
    'Perfect product, perfect packaging. Zero complaints.',
    'Life-changing purchase. I wish I had bought this earlier!',
    'Ekdum mast product. Paisa vasool!',
  ],
  4: [
    'Good product, meets expectations. A small issue with packaging but product itself is fine.',
    'Nice quality. A little expensive but worth it.',
    'Decent product. Delivery was slightly delayed but overall happy.',
    'Good value for money. Not perfect but close to it.',
    'Mostly good. Would appreciate slightly better build quality.',
    'Happy with purchase. Minor improvements could be made.',
    'Sahi product hai. Overall satisfied.',
  ],
  3: [
    'Average product. Nothing special but does the job.',
    'Okay for this price range. Expected a bit more quality.',
    'Works as advertised but build quality could be better.',
    'Not great not terrible. Acceptable for daily use.',
    'Mixed feelings. Some features are good, others are not.',
  ],
  2: [
    'Disappointed. Quality not as shown in photos.',
    'Not worth the price. Many cheaper alternatives work better.',
    'Had issues from day one. Customer service was helpful though.',
    'Expected much better. Will not purchase again.',
  ],
  1: [
    'Very bad quality. Stopped working within a week.',
    'Complete waste of money. Do not buy.',
    'Terrible product. Nothing like what was shown.',
  ],
};

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 ECOMMERCE SEED SCRIPT STARTING...\n');

  // 1. Connect
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
  console.log(`📦 Connecting to MongoDB: ${MONGO_URI.substring(0, 40)}...`);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected!\n');

  // 2. Clear existing data
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Coupon.deleteMany({}),
    Banner.deleteMany({}),
  ]);
  console.log('✅ Cleared!\n');

  // 3. Create Categories
  console.log('📁 Creating categories...');
  const categoryMap = {};

  for (const cat of CATEGORY_TREE) {
    const parent = await Category.create({
      name: cat.name, slug: cat.slug, description: cat.desc,
      image: cat.image, parent: null, sortOrder: CATEGORY_TREE.indexOf(cat),
    });
    categoryMap[cat.slug] = parent._id;

    for (let i = 0; i < cat.children.length; i++) {
      const ch = cat.children[i];
      const child = await Category.create({
        name: ch.name, slug: ch.slug,
        description: `${ch.name} — best collection in India`,
        image: img(ch.keywords[0]),
        parent: parent._id, sortOrder: i,
      });
      categoryMap[ch.slug] = child._id;
    }
  }
  console.log(`✅ ${Object.keys(categoryMap).length} categories created!\n`);

  // 4. Create Products
  console.log('📦 Creating products...');
  const allProducts = [];
  let productCount = 0;

  for (const [catSlug, templates] of Object.entries(PRODUCT_TEMPLATES)) {
    const catId = categoryMap[catSlug];
    if (!catId) { console.warn(`  ⚠️  Category not found: ${catSlug}`); continue; }

    for (const tpl of templates) {
      const slug = tpl.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 80) + '-' + Date.now().toString(36) + rand(0, 999);

      const keyword = tpl.name.split(' ').slice(0, 2).join('-').toLowerCase().replace(/[^a-z-]/g, '');
      const rating = +(Math.random() * 1.5 + 3.5).toFixed(1);
      const reviewCount = rand(20, 450);
      const isFeatured = Math.random() < 0.25;

      const product = await Product.create({
        name: tpl.name,
        slug,
        description: `${tpl.name} — Premium quality product from ${tpl.brand}. ${faker.lorem.sentences(3)} Perfect for everyday use. Comes with manufacturer warranty. Trusted by thousands of customers across India.`,
        shortDescription: `${tpl.brand} ${tpl.name} — Top rated product with excellent quality.`,
        price: tpl.price,
        comparePrice: tpl.compare,
        category: catId,
        brand: tpl.brand,
        images: imgSet(keyword, 4),
        thumbnail: img(keyword),
        stock: rand(10, 200),
        sku: `SKU-${catSlug.toUpperCase().substring(0, 3)}-${faker.string.alphanumeric(6).toUpperCase()}`,
        tags: [catSlug, tpl.brand.toLowerCase(), keyword, faker.word.adjective()],
        specifications: tpl.specs,
        ratings: { average: rating, count: reviewCount },
        isFeatured,
        isActive: true,
        weight: rand(100, 5000),
        dimensions: { length: rand(5, 50), width: rand(5, 40), height: rand(2, 30) },
      });

      allProducts.push(product);
      productCount++;
    }
    process.stdout.write(`  ✓ ${catSlug} (${templates.length} products)\n`);
  }
  console.log(`\n✅ ${productCount} products created!\n`);

  // 5. Create Users
  console.log('👤 Creating users...');
  const hashedAdmin = await bcrypt.hash('admin123', 10);
  const hashedUser  = await bcrypt.hash('user1234', 10);

  await User.create({
    name: 'Admin User', email: 'admin@ecommerce.com', phone: '9876543210',
    password: hashedAdmin, role: 'admin', isVerified: true, loyaltyPoints: 0,
    avatar: img('professional-man'),
  });

  const customerData = [
    { name: 'Rahul Sharma',  email: 'rahul@example.com',  phone: '9876543211', city: 'Mumbai',    state: 'Maharashtra', pincode: '400001' },
    { name: 'Priya Singh',   email: 'priya@example.com',  phone: '9876543212', city: 'Delhi',     state: 'Delhi',       pincode: '110001' },
    { name: 'Amit Kumar',    email: 'amit@example.com',   phone: '9876543213', city: 'Bengaluru', state: 'Karnataka',   pincode: '560001' },
    { name: 'Sneha Patel',   email: 'sneha@example.com',  phone: '9876543214', city: 'Ahmedabad', state: 'Gujarat',     pincode: '380001' },
    { name: 'Vikram Reddy',  email: 'vikram@example.com', phone: '9876543215', city: 'Hyderabad', state: 'Telangana',   pincode: '500001' },
    { name: 'Anjali Gupta',  email: 'anjali@example.com', phone: '9876543216', city: 'Pune',      state: 'Maharashtra', pincode: '411001' },
    { name: 'Suresh Nair',   email: 'suresh@example.com', phone: '9876543217', city: 'Chennai',   state: 'Tamil Nadu',  pincode: '600001' },
    { name: 'Deepika Joshi', email: 'deepika@example.com',phone: '9876543218', city: 'Kolkata',   state: 'West Bengal', pincode: '700001' },
    { name: 'Rajesh Yadav',  email: 'rajesh@example.com', phone: '9876543219', city: 'Jaipur',    state: 'Rajasthan',   pincode: '302001' },
    { name: 'Meena Iyer',    email: 'meena@example.com',  phone: '9876543220', city: 'Kochi',     state: 'Kerala',      pincode: '682001' },
  ];

  const customerUsers = [];
  for (const cd of customerData) {
    const u = await User.create({
      name: cd.name, email: cd.email, phone: cd.phone,
      password: hashedUser, role: 'customer', isVerified: true,
      loyaltyPoints: rand(0, 2000), avatar: img('person-portrait'),
      addresses: [{
        name: cd.name, phone: cd.phone,
        line1: faker.location.streetAddress(), line2: faker.location.secondaryAddress(),
        city: cd.city, state: cd.state, pincode: cd.pincode, isDefault: true,
      }],
    });
    customerUsers.push(u);
  }
  console.log(`✅ ${customerUsers.length + 1} users created!\n`);

  // 6. Create Orders
  console.log('🛒 Creating orders...');
  const statuses = ['pending','confirmed','processing','shipped','delivered','delivered','delivered','cancelled'];
  const paymentMethods = ['razorpay','razorpay','stripe','cod','cod'];
  const paidStatuses = new Set(['confirmed','processing','shipped','delivered']);
  const allOrders = [];

  for (let i = 0; i < 30; i++) {
    const user     = pick(customerUsers);
    const numItems = rand(1, 4);
    const items    = [];
    let subtotal   = 0;

    for (let j = 0; j < numItems; j++) {
      const p   = pick(allProducts);
      const qty = rand(1, 3);
      items.push({ product: p._id, name: p.name, price: p.price, quantity: qty, image: p.thumbnail });
      subtotal += p.price * qty;
    }

    const delivery = subtotal > 499 ? 0 : 49;
    const discount = Math.random() < 0.3 ? Math.floor(subtotal * 0.1) : 0;
    const total    = subtotal + delivery - discount;
    const status   = pick(statuses);
    const method   = pick(paymentMethods);
    const address  = user.addresses[0] || { name: user.name, phone: user.phone, line1: 'MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' };

    const timeline = [{ status: 'pending', message: 'Order placed successfully', time: faker.date.recent({ days: 15 }) }];
    if (status !== 'pending') timeline.push({ status: 'confirmed', message: 'Payment confirmed', time: faker.date.recent({ days: 12 }) });
    if (['processing','shipped','delivered'].includes(status)) timeline.push({ status: 'processing', message: 'Order is being packed', time: faker.date.recent({ days: 10 }) });
    if (['shipped','delivered'].includes(status)) timeline.push({ status: 'shipped', message: 'Out for delivery', time: faker.date.recent({ days: 5 }) });
    if (status === 'delivered') timeline.push({ status: 'delivered', message: 'Order delivered successfully', time: faker.date.recent({ days: 2 }) });

    const order = await Order.create({
      orderId: `ORD${Date.now()}${rand(100, 999)}`,
      user: user._id, items,
      shippingAddress: { name: address.name, phone: address.phone, line1: address.line1, city: address.city, state: address.state, pincode: address.pincode },
      subtotal, discount, deliveryCharge: delivery, total,
      status, paymentMethod: method,
      paymentStatus: status === 'cancelled' ? 'refunded' : paidStatuses.has(status) ? 'paid' : 'pending',
      paymentId: method !== 'cod' ? `pay_${faker.string.alphanumeric(14)}` : null,
      coupon: discount > 0 ? 'SAVE10' : null,
      timeline,
    });
    allOrders.push(order);
  }
  console.log(`✅ ${allOrders.length} orders created!\n`);

  // 7. Create Reviews
  console.log('⭐ Creating reviews...');
  let reviewCount = 0;

  const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
  for (const order of deliveredOrders) {
    if (Math.random() < 0.8) {
      for (const item of order.items.slice(0, 1)) {
        const rating = rand(3, 5);
        await Review.create({
          product: item.product, user: order.user, rating,
          title: rating >= 4 ? 'Great product!' : 'Decent product',
          comment: pick(REVIEW_COMMENTS[rating]),
          isVerified: true, helpfulCount: rand(0, 50),
        });
        reviewCount++;
      }
    }
  }

  while (reviewCount < 65) {
    const rating = pick([1, 2, 3, 4, 4, 5, 5, 5]);
    await Review.create({
      product: pick(allProducts)._id,
      user: pick(customerUsers)._id,
      rating,
      title: rating >= 4 ? 'Highly recommended!' : rating >= 3 ? 'Okay product' : 'Not satisfied',
      comment: pick(REVIEW_COMMENTS[rating]),
      isVerified: Math.random() < 0.7,
      helpfulCount: rand(0, 100),
    });
    reviewCount++;
  }
  console.log(`✅ ${reviewCount} reviews created!\n`);

  // 8. Create Coupons
  console.log('🎟️  Creating coupons...');
  await Coupon.insertMany([
    { code: 'SAVE10',   description: '10% off on all orders',                  type: 'percentage', value: 10, minOrderAmount: 500,  maxDiscount: 500,  usageLimit: 100,  expiresAt: new Date('2025-12-31') },
    { code: 'FLAT500',  description: 'Flat Rs.500 off on orders above Rs.2000', type: 'fixed',      value: 500,minOrderAmount: 2000, maxDiscount: 500,  usageLimit: 50,   expiresAt: new Date('2025-12-31') },
    { code: 'NEWUSER',  description: '15% off for new users',                   type: 'percentage', value: 15, minOrderAmount: 0,    maxDiscount: 1000, usageLimit: 1000, expiresAt: new Date('2025-12-31') },
    { code: 'SUMMER25', description: '25% off summer sale',                     type: 'percentage', value: 25, minOrderAmount: 1000, maxDiscount: 2000, usageLimit: 200,  expiresAt: new Date('2025-08-31') },
    { code: 'FREESHIP', description: 'Free shipping on any order',              type: 'fixed',      value: 49, minOrderAmount: 0,    maxDiscount: 49,   usageLimit: 500,  expiresAt: new Date('2025-12-31') },
  ]);
  console.log('✅ 5 coupons created!\n');

  // 9. Create Banners
  console.log('🖼️  Creating banners...');
  await Banner.insertMany([
    { title: 'Mega Electronics Sale', subtitle: 'Up to 50% off on phones & laptops', image: img('electronics-sale', 1920, 600), mobileImage: img('electronics', 768, 400), link: '/category/electronics', type: 'hero', position: 1, isActive: true, startDate: new Date(), endDate: new Date('2025-12-31') },
    { title: 'Fashion Week Special',  subtitle: 'New arrivals — Trendy styles for everyone', image: img('fashion-sale', 1920, 600), mobileImage: img('fashion', 768, 400), link: '/category/fashion', type: 'hero', position: 2, isActive: true, startDate: new Date(), endDate: new Date('2025-12-31') },
    { title: 'Home Makeover Sale',    subtitle: 'Beautiful home, beautiful life', image: img('interior-design', 1920, 600), mobileImage: img('home-decor', 768, 400), link: '/category/home-kitchen', type: 'hero', position: 3, isActive: true, startDate: new Date(), endDate: new Date('2025-12-31') },
    { title: 'NEWUSER — 15% Off Your First Order', subtitle: 'Use code NEWUSER at checkout', image: img('shopping-offer', 1200, 400), mobileImage: img('discount', 600, 300), link: '/register', type: 'promotional', position: 1, isActive: true, startDate: new Date(), endDate: new Date('2025-12-31') },
    { title: 'Sports & Fitness — Get Fit 2025',    subtitle: 'Top gear for your fitness journey', image: img('fitness-gym', 1200, 400), mobileImage: img('gym-workout', 600, 300), link: '/category/sports', type: 'promotional', position: 2, isActive: true, startDate: new Date(), endDate: new Date('2025-12-31') },
    { title: 'Books — Feed Your Mind',             subtitle: 'Bestsellers starting at Rs.99', image: img('books-reading', 1200, 400), mobileImage: img('library', 600, 300), link: '/category/books', type: 'category', position: 1, isActive: true, startDate: new Date(), endDate: new Date('2025-12-31') },
  ]);
  console.log('✅ 6 banners created!\n');

  // 10. Final Summary
  console.log('━'.repeat(55));
  console.log('🎉 SEED COMPLETE! Final Summary:');
  console.log(`   📁 Categories  : ${Object.keys(categoryMap).length}`);
  console.log(`   📦 Products    : ${productCount}`);
  console.log(`   👤 Users       : ${customerUsers.length + 1} (1 admin + ${customerUsers.length} customers)`);
  console.log(`   🛒 Orders      : ${allOrders.length}`);
  console.log(`   ⭐ Reviews     : ${reviewCount}`);
  console.log(`   🎟️  Coupons    : 5`);
  console.log(`   🖼️  Banners    : 6`);
  console.log('━'.repeat(55));
  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('   Admin   : admin@ecommerce.com  / admin123');
  console.log('   Customer: rahul@example.com    / user1234');
  console.log('   (All customers: password = user1234)\n');
  console.log('💪 Happy coding, Kamal! Week 5 Day 1 Done! 🚀\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
