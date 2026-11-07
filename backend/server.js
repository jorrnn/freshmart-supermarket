
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const { Pool } = require("pg");
const connectPgSimple = require("connect-pg-simple");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ================= POSTGRESQL =================

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from your .env file.");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from your .env file.");
}

if (IS_PRODUCTION) {
  app.set("trust proxy", 1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: IS_PRODUCTION ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err.message);
});

const PgSession = connectPgSimple(session);

const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true
  }),
  name: "freshmart.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    maxAge: 1000 * 60 * 60 * 24
  }
});

// ================= LOCAL STORE DATA =================

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({ users: [], orders: [] }, null, 2)
  );
}

const readDB = () =>
  JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

const writeDB = (db) =>
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// ================= MIDDLEWARE =================

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, "..", "frontend")));

// ================= PRODUCTS =================

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

app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// ================= CUSTOMER ACCOUNTS =================

app.post("/api/signup", async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        error: "Enter your name, email and a password of at least 6 characters."
      });
    }

    const db = readDB();

    if (db.users.some(u =>
      u.email.toLowerCase() === email.toLowerCase()
    )) {
      return res.status(409).json({
        error: "An account with this email already exists. Please log in."
      });
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      password: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    writeDB(db);

  const visitorId = req.session.visitorId || crypto.randomUUID();

  req.session.regenerate((err) => {
    if (err) return next(err);

  req.session.visitorId = visitorId;
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.json({ user: req.session.user });
      });
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const db = readDB();

    const user = db.users.find(
      u => u.email === String(email || "").toLowerCase()
    );

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({
        error: "Email or password is incorrect."
      });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.visitorId = crypto.randomUUID();
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.json({ user: req.session.user });
      });
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed." });
    res.clearCookie("freshmart.sid");
    res.json({ ok: true });
  });
});

// ================= CUSTOMER ORDERS =================

app.post("/api/orders", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      error: "Please log in before placing an order."
    });
  }

  const { items, customer, paymentMethod } = req.body || {};

  if (!Array.isArray(items) || !items.length ||
      !customer?.address || !customer?.phone) {
    return res.status(400).json({
      error: "Add products and complete your delivery address and phone number."
    });
  }

  const orderItems = items.map(item => {
    const product = products.find(p => p.id === Number(item.id));
    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image
    };
  }).filter(Boolean);

  if (!orderItems.length) {
    return res.status(400).json({
      error: "No valid products were found in your cart."
    });
  }

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  const deliveryFee = subtotal >= 100000 ? 0 : 2500;

  const order = {
    id: "FM-" + Date.now().toString().slice(-8),
    userId: req.session.user.id,
    customer,
    items: orderItems,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    paymentMethod: paymentMethod || "Demo payment",
    paymentStatus: "Demo payment — not charged",
    status: "Order received",
    createdAt: new Date().toISOString(),
    timeline: ["Order received"]
  };

  const db = readDB();
  db.orders.unshift(order);
  writeDB(db);

  res.status(201).json({ order });
});

app.get("/api/orders", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Please log in." });
  }

  const db = readDB();

  res.json(
    db.orders.filter(o => o.userId === req.session.user.id)
  );
});

app.get("/api/track/:id", (req, res) => {
  const db = readDB();

  const order = db.orders.find(
    o => o.id.toLowerCase() === req.params.id.toLowerCase()
  );

  if (!order) {
    return res.status(404).json({
      error: "We couldn't find that order. Check the tracking number."
    });
  }

  res.json({
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    timeline: order.timeline,
    paymentStatus: order.paymentStatus
  });
});

// ================= LIVE CHAT DATABASE =================

async function initializeChatDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id UUID PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL DEFAULT 'Website visitor',
      customer_email TEXT,
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
      unread_admin INTEGER NOT NULL DEFAULT 0,
      unread_customer INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id UUID NOT NULL
        REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_type TEXT NOT NULL
        CHECK (sender_type IN ('customer', 'admin')),
      sender_id TEXT,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
      read_by_customer BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
    ON chat_messages(conversation_id, created_at)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_visitor
    ON chat_conversations(visitor_id, status)
  `);

  console.log("FreshMart chat database tables are ready.");
}

// ================= SOCKET.IO =================

const io = new Server(server);

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, (err) => {
    if (err) return next(err);

    const sessionData = socket.request.session;

    if (!sessionData) {
      return next(new Error("Session unavailable."));
    }

    if (!sessionData.admin && !sessionData.visitorId) {
      sessionData.visitorId = crypto.randomUUID();

      sessionData.save((saveErr) => {
        if (saveErr) return next(saveErr);
        next();
      });

      return;
    }

    next();
  });
});

io.on("connection", (socket) => {
  const sessionData = socket.request.session;

  if (sessionData.admin) {
    socket.join("admins");
    socket.emit("chat:connected", { role: "admin" });
  } else {
    socket.join(`customer:${sessionData.visitorId}`);
    socket.emit("chat:connected", { role: "customer" });
  }
});

// ================= CUSTOMER CHAT API =================

async function getOrCreateVisitorSession(req, res, next) {
  try {
    if (!req.session.visitorId) {
      req.session.visitorId = crypto.randomUUID();
    }

    if (!req.session.user) {
      req.session.chatGuestName = req.session.chatGuestName || "Website visitor";
    }

    next();
  } catch (err) {
    next(err);
  }
}

app.get("/api/chat/conversation", getOrCreateVisitorSession, async (req, res, next) => {
  try {
    const visitorId = req.session.visitorId;

    console.log("CHAT LOAD:", {
  sessionID: req.sessionID,
  visitorId: req.session.visitorId
});

    const customerName = req.session.user?.name ||
      req.session.chatGuestName || "Website visitor";

    const customerId = req.session.user?.id || null;

    let result = await pool.query(
      `SELECT * FROM chat_conversations
       WHERE visitor_id = $1 AND status = 'open'
       ORDER BY last_message_at DESC
       LIMIT 1`,
      [visitorId]
    );

    let conversation = result.rows[0];

    if (!conversation) {
      const id = crypto.randomUUID();

      result = await pool.query(
        `INSERT INTO chat_conversations
         (id, visitor_id, customer_id, customer_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, visitorId, customerId, customerName]
      );

      conversation = result.rows[0];
    } else if (req.session.user) {
      await pool.query(
        `UPDATE chat_conversations
         SET customer_id = $1, customer_name = $2,
             customer_email = $3
         WHERE id = $4`,
        [
          customerId,
          customerName,
          req.session.user.email,
          conversation.id
        ]
      );
    }

    const messages = await pool.query(
      `SELECT id, conversation_id, sender_type, sender_name,
              message, created_at
       FROM chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversation.id]
    );

    res.json({
      conversation,
      messages: messages.rows
    });
  } catch (err) {
    next(err);
  }
});

  app.post("/api/chat/messages", getOrCreateVisitorSession, async (req, res, next) => {
    try {
      const message = String(req.body.message || "").trim();
      const conversationId = String(req.body.conversationId || "");

      if (!message || message.length > 2000) {
        return res.status(400).json({
          error: "Enter a message of between 1 and 2000 characters."
        });
      }

      if (!conversationId) {
        return res.status(400).json({
          error: "Chat conversation is required."
        });
      }
      

      console.log("CHAT SEND:", {
    sessionID: req.sessionID,
    visitorId: req.session.visitorId,
    conversationId: req.body.conversationId
    });

      const conversationResult = await pool.query(
        `SELECT * FROM chat_conversations
        WHERE id = $1 AND visitor_id = $2 AND status = 'open'`,
        [conversationId, req.session.visitorId]
      );

      console.log("DATABASE LOOKUP RESULT:", conversationResult.rows);
      
      const conversation = conversationResult.rows[0];

      if (!conversation) {
        return res.status(404).json({
          error: "Chat conversation not found. Please refresh the page."
        });
      }

      const senderName = req.session.user?.name || "Website visitor";
      const senderId = req.session.user?.id || null;

      const result = await pool.query(
        `INSERT INTO chat_messages
        (conversation_id, sender_type, sender_id, sender_name, message)
        VALUES ($1, 'customer', $2, $3, $4)
        RETURNING *`,
        [conversationId, senderId, senderName, message]
      );

      await pool.query(
        `UPDATE chat_conversations
        SET last_message_at = NOW(),
            unread_admin = unread_admin + 1,
            customer_name = $1,
            customer_id = COALESCE($2, customer_id)
        WHERE id = $3`,
        [senderName, senderId, conversationId]
      );

      const savedMessage = result.rows[0];

      io.to("admins").emit("chat:new_message", {
        conversationId,
        message: savedMessage
      });

      res.status(201).json({ message: savedMessage });
    } catch (err) {
      next(err);
    }
  });

  // ================= ADMIN AUTHENTICATION =================

  function requireAdmin(req, res, next) {
    if (!req.session.admin) {
      return res.status(401).json({
        error: "Admin login required."
      });
    }

    next();
  }

  app.post("/api/admin/login", (req, res, next) => {
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
      return res.status(401).json({
        error: "Incorrect admin email or password."
      });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.admin = true;
      req.session.adminEmail = adminEmail;

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);

        res.json({ success: true, email: adminEmail });
      });
    });
  });

  app.get("/api/admin/me", (req, res) => {
    res.json({
      authenticated: Boolean(req.session.admin),
      email: req.session.adminEmail || null
    });
  });

  app.post("/api/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
      return res.status(500).json({ error: "Logout failed." });
    }

    res.clearCookie("freshmart.sid");
    res.json({ success: true });
  });
});

// ================= ADMIN DASHBOARD API =================

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

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.orders || []);
});

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

app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json(products);
});

// ================= ADMIN LIVE CHAT API =================

// List all conversations
app.get("/api/admin/chat/conversations", requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        (SELECT message FROM chat_messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1) AS last_message
      FROM chat_conversations c
      ORDER BY c.last_message_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Read messages in one conversation
app.get("/api/admin/chat/conversations/:id/messages", requireAdmin, async (req, res, next) => {
  try {
    const conversationId = req.params.id;

    const conversation = await pool.query(
      "SELECT * FROM chat_conversations WHERE id = $1",
      [conversationId]
    );

    if (!conversation.rows.length) {
      return res.status(404).json({
        error: "Conversation not found."
      });
    }

    const result = await pool.query(
      `SELECT * FROM chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    await pool.query(
      `UPDATE chat_conversations
       SET unread_admin = 0
       WHERE id = $1`,
      [conversationId]
    );

    await pool.query(
      `UPDATE chat_messages
       SET read_by_admin = TRUE
       WHERE conversation_id = $1 AND sender_type = 'customer'`,
      [conversationId]
    );

    io.to(`customer:${conversation.rows[0].visitor_id}`).emit(
      "chat:read",
      { conversationId, reader: "admin" }
    );

    res.json({
      conversation: conversation.rows[0],
      messages: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// Admin sends a reply
app.post("/api/admin/chat/conversations/:id/reply", requireAdmin, async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const message = String(req.body.message || "").trim();

    if (!message || message.length > 2000) {
      return res.status(400).json({
        error: "Enter a message of between 1 and 2000 characters."
      });
    }

    const conversationResult = await pool.query(
      `SELECT * FROM chat_conversations
       WHERE id = $1 AND status = 'open'`,
      [conversationId]
    );

    const conversation = conversationResult.rows[0];

    if (!conversation) {
      return res.status(404).json({
        error: "Open conversation not found."
      });
    }

    const result = await pool.query(
      `INSERT INTO chat_messages
       (conversation_id, sender_type, sender_id, sender_name,
        message, read_by_admin)
       VALUES ($1, 'admin', $2, $3, $4, TRUE)
       RETURNING *`,
      [
        conversationId,
        req.session.adminEmail,
        "FreshMart Support",
        message
      ]
    );

    await pool.query(
      `UPDATE chat_conversations
       SET last_message_at = NOW(),
           unread_customer = unread_customer + 1
       WHERE id = $1`,
      [conversationId]
    );

    const savedMessage = result.rows[0];

    io.to(`customer:${conversation.visitor_id}`).emit(
      "chat:new_message",
      { conversationId, message: savedMessage }
    );

    res.status(201).json({ message: savedMessage });
  } catch (err) {
    next(err);
  }
});

// Close or reopen a conversation
app.patch("/api/admin/chat/conversations/:id", requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body || {};

    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({
        error: "Status must be open or closed."
      });
    }

    const result = await pool.query(
      `UPDATE chat_conversations
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Conversation not found."
      });
    }

    io.to(`customer:${result.rows[0].visitor_id}`).emit(
      "chat:status",
      { conversationId: result.rows[0].id, status }
    );

    res.json({ success: true, conversation: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ================= WEBSITE ROUTES =================

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "admin.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// ================= ERROR HANDLER =================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (res.headersSent) return next(err);

  res.status(500).json({
    error: "A server error occurred. Please try again."
  });
});

// ================= START SERVER =================

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connection successful.");

    await initializeChatDatabase();

    server.listen(PORT, () => {
      console.log(
        `FreshMart Supermarket is running at http://localhost:${PORT}`
      );
    });
  } catch (err) {
    console.error("Startup failed:", err.message);
    process.exit(1);
  }
}

startServer();
