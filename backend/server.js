require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], orders: [] }, null, 2));
}
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
const writeDB = (db) => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "freshmart.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(express.static(path.join(__dirname, "..", "frontend")));

const products = [
  {id:1,name:"Premium Long Grain Rice",category:"Foodstuffs",price:28500,oldPrice:32000,unit:"10kg bag",rating:4.9,tag:"Bestseller",image:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=700"},
  {id:2,name:"Fresh Red Apples",category:"Foodstuffs",price:6500,oldPrice:7500,unit:"1 basket",rating:4.8,tag:"Fresh",image:"https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=700"},
  {id:3,name:"Golden Vegetable Oil",category:"Foodstuffs",price:12500,oldPrice:14000,unit:"5 litres",rating:4.7,image:"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700"},
  {id:4,name:"Whole Milk",category:"Beverages",price:4200,oldPrice:4800,unit:"1 litre",rating:4.8,image:"https://images.unsplash.com/photo-1563636619-e9143da7973b?w=700"},
  {id:5,name:"Orange Juice",category:"Beverages",price:3800,unit:"1 litre",rating:4.6,image:"https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=700"},
  {id:6,name:"Premium Red Wine",category:"Wine & Spirits",price:18500,oldPrice:21000,unit:"750ml bottle",rating:4.8,tag:"Popular",image:"https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=700"},
  {id:7,name:"Baby Diapers Pack",category:"Baby & Kids",price:14500,oldPrice:16000,unit:"jumbo pack",rating:4.9,image:"https://images.unsplash.com/photo-1604917877934-07d8d248d396?w=700"},
  {id:8,name:"Vanilla Ice Cream",category:"Frozen Foods",price:6800,unit:"1 litre tub",rating:4.7,image:"https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=700"},
  {id:9,name:"Chocolate Ice Cream",category:"Frozen Foods",price:7200,unit:"1 litre tub",rating:4.8,image:"https://images.unsplash.com/photo-1501446529957-6226bd447c46?w=700"},
  {id:10,name:"Standing Electric Fan",category:"Electronics",price:48500,oldPrice:55000,unit:"18 inch",rating:4.6,tag:"Deal",image:"https://images.unsplash.com/photo-1618941716939-553df3c6c278?w=700"},
  {id:11,name:"Split Air Conditioner",category:"Electronics",price:485000,unit:"1.5HP",rating:4.8,image:"https://images.unsplash.com/photo-1631545806609-7b8c3e4f9f4f?w=700"},
  {id:12,name:"Chest Freezer",category:"Electronics",price:395000,oldPrice:420000,unit:"200 litres",rating:4.7,image:"https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=700"},
  {id:13,name:"Double Door Refrigerator",category:"Electronics",price:625000,unit:"250 litres",rating:4.9,image:"https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=700"},
  {id:14,name:"Luxury Oud Perfume",category:"Beauty & Personal Care",price:32500,oldPrice:38000,unit:"100ml",rating:4.8,image:"https://images.unsplash.com/photo-1541643600914-78b084683601?w=700"},
  {id:15,name:"Body Care Gift Set",category:"Beauty & Personal Care",price:18500,unit:"gift set",rating:4.6,image:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=700"},
  {id:16,name:"Laundry Detergent",category:"Home & Cleaning",price:8500,unit:"2kg pack",rating:4.7,image:"https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=700"},
  {id:17,name:"Kitchen Paper Towels",category:"Home & Cleaning",price:3500,unit:"6 rolls",rating:4.5,image:"https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=700"},
  {id:18,name:"Breakfast Cereal",category:"Foodstuffs",price:5600,unit:"500g pack",rating:4.7,image:"https://images.unsplash.com/photo-1517093157656-b9eccee6d9b2?w=700"},
  {id:19,name:"Fresh Farm Eggs",category:"Foodstuffs",price:6500,unit:"crate of 30",rating:4.9,tag:"Farm fresh",image:"https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=700"},
  {id:20,name:"Premium Bottled Water",category:"Beverages",price:2200,unit:"pack of 12",rating:4.6,image:"https://images.unsplash.com/photo-1560023907-5f339617ea30?w=700"}
];

app.get("/api/products", (req, res) => res.json(products));
app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));

app.post("/api/signup", async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: "Enter your name, email and a password of at least 6 characters." });
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: "An account with this email already exists. Please log in." });
  const user = { id: crypto.randomUUID(), name, email: email.toLowerCase(), phone: phone || "", password: await bcrypt.hash(password, 10), createdAt: new Date().toISOString() };
  db.users.push(user); writeDB(db);
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ user: req.session.user });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  const db = readDB();
  const user = db.users.find(u => u.email === String(email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(401).json({ error: "Email or password is incorrect." });
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ user: req.session.user });
});
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.post("/api/orders", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Please log in before placing an order." });
  const { items, customer, paymentMethod } = req.body || {};
  if (!Array.isArray(items) || !items.length || !customer?.address || !customer?.phone) return res.status(400).json({ error: "Add products and complete your delivery address and phone number." });
  const orderItems = items.map(item => {
    const product = products.find(p => p.id === Number(item.id));
    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));
    if (!product) return null;
    return { id: product.id, name: product.name, price: product.price, quantity, image: product.image };
  }).filter(Boolean);
  if (!orderItems.length) return res.status(400).json({ error: "No valid products were found in your cart." });
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 100000 ? 0 : 2500;
  const order = {
    id: "FM-" + Date.now().toString().slice(-8),
    userId: req.session.user.id, customer, items: orderItems, subtotal, deliveryFee,
    total: subtotal + deliveryFee, paymentMethod: paymentMethod || "Demo payment",
    paymentStatus: "Demo payment — not charged", status: "Order received",
    createdAt: new Date().toISOString(), timeline: ["Order received"]
  };
  const db = readDB(); db.orders.unshift(order); writeDB(db);
  res.status(201).json({ order });
});

app.get("/api/orders", (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Please log in." });
  const db = readDB();
  res.json(db.orders.filter(o => o.userId === req.session.user.id));
});
app.get("/api/track/:id", (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id.toLowerCase() === req.params.id.toLowerCase());
  if (!order) return res.status(404).json({ error: "We couldn't find that order. Check the tracking number." });
  res.json({ id: order.id, status: order.status, createdAt: order.createdAt, timeline: order.timeline, paymentStatus: order.paymentStatus });
});

app.post("/api/chat", (req, res) => {
  const message = String(req.body.message || "").toLowerCase();
  let reply = "Thanks for contacting FreshMart! Our support team is available during store opening hours. You can also track an order using your order number.";
  if (message.includes("hour") || message.includes("open")) reply = "FreshMart is open Monday–Saturday, 8:00am–9:00pm, and Sunday, 10:00am–7:00pm.";
  else if (message.includes("deliver")) reply = "Standard delivery is ₦2,500. Delivery is free on orders of ₦100,000 or more.";
  else if (message.includes("pay")) reply = "This starter site currently uses demo checkout. Paystack or Flutterwave can be connected for real payments.";
  else if (message.includes("return")) reply = "Please contact support within 7 days of delivery with your order number and item details.";
  res.json({ reply });
});

// ================= FRESHMART ADMIN API =================

// Protect all admin routes
function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Admin login required." });
  }
  next();
}

// Admin login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({
      error: "Configure ADMIN_EMAIL and ADMIN_PASSWORD in your .env file."
    });
  }

  if (
    String(email || "").toLowerCase() !== adminEmail.toLowerCase() ||
    password !== adminPassword
  ) {
    return res.status(401).json({ error: "Incorrect admin email or password." });
  }

  req.session.admin = true;
  req.session.adminEmail = adminEmail;

  res.json({ success: true, email: adminEmail });
});

// Check admin login
app.get("/api/admin/me", (req, res) => {
  res.json({
    authenticated: Boolean(req.session.admin),
    email: req.session.adminEmail || null
  });
});

// Admin logout
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  delete req.session.admin;
  delete req.session.adminEmail;
  res.json({ success: true });
});

// Dashboard statistics
app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const db = readDB();
  const orders = db.orders || [];
  const users = db.users || [];

  const totalOrderValue = orders
    .filter(order => order.status !== "Cancelled")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const pendingOrders = orders.filter(order =>
    ["Order received", "Pending"].includes(order.status)
  ).length;

  res.json({
    totalOrders: orders.length,
    totalCustomers: users.length,
    pendingOrders,
    totalOrderValue,
    products: products.length
  });
});

// All customer orders
app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.orders || []);
});

// Update order status
app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const allowedStatuses = [
    "Order received",
    "Confirmed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled"
  ];

  const { status } = req.body || {};

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid order status." });
  }

  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  order.status = status;
  order.timeline = Array.isArray(order.timeline) ? order.timeline : [];

  if (order.timeline[order.timeline.length - 1] !== status) {
    order.timeline.push(status);
  }

  order.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json({ success: true, order });
});

// Registered customers (never expose passwords)
app.get("/api/admin/customers", requireAdmin, (req, res) => {
  const db = readDB();

  res.json((db.users || []).map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    createdAt: user.createdAt
  })));
});

// Product catalogue
app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json(products);
});

// ================= END ADMIN API =================

// Open the admin dashboard
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "admin.html"));
});

// Normal website homepage
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});
app.listen(PORT, () => console.log(`FreshMart Supermarket is running at http://localhost:${PORT}`));
