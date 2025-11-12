const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { menuData } = require("./data");
const path = require("path");
const fs = require("fs");

// Load .env from server/.env when present (local dev convenience)
try {
  const dotenv = require("dotenv");
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log("Loaded server/.env file");
  }
} catch (e) {
  // ignore if dotenv not installed — handled by package.json
}

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// In-memory stores (reset on restart)
const orders = [];
const bills = [];

// MongoDB integration (enabled when USE_MONGO=true)
let useMongo = false;
let mongoClient = null;
let mongoDb = null;
let mongoConnectPromise = null;

// Optional MongoDB integration (enabled when USE_MONGO=true)
try {
  if (process.env.USE_MONGO === "true") {
    const { MongoClient } = require("mongodb");
    const uri = process.env.MONGODB_URI || "";
    const dbName = process.env.MONGODB_DBNAME || "snappy_serve";
    if (!uri) {
      console.warn("USE_MONGO=true set but MONGODB_URI not provided. Falling back to in-memory stores.");
    } else {
      mongoClient = new MongoClient(uri, { serverApi: { version: "1" } });
      // Start connect but don't block here — expose the promise so startup can wait for it with a timeout
      mongoConnectPromise = mongoClient.connect().then(() => {
        mongoDb = mongoClient.db(dbName);
        useMongo = true;
        console.log(`MongoDB connected to database: ${dbName}`);
      }).catch((e) => {
        console.warn("Failed to connect to MongoDB:", e && e.message ? e.message : e);
      });
    }
  }
} catch (e) {
  console.warn("MongoDB init error, falling back to in-memory:", e && e.message ? e.message : e);
}

// Optional Twilio WhatsApp integration (enabled when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM are set)
let twilioClient = null;
let twilioFrom = null;
try {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_WHATSAPP_FROM || "";
  if (sid && token && from) {
    try {
      const twilio = require("twilio");
      twilioClient = twilio(sid, token);
      twilioFrom = from;
      console.log("Twilio client initialized for WhatsApp");
    } catch (e) {
      console.warn("Failed to initialize Twilio client (missing package?). WhatsApp integration disabled.", e && e.message ? e.message : e);
    }
  }
} catch (e) {
  // ignore
}

async function sendWhatsAppMessage(phone, message) {
  if (!twilioClient || !twilioFrom) {
    return { success: false, message: "Twilio not configured" };
  }
  try {
    // Twilio expects E.164 numbers; ensure 'whatsapp:' prefix
    const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
    const from = twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`;
    const res = await twilioClient.messages.create({ from, to, body: message });
    return { success: true, sid: res.sid };
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : String(e) };
  }
}

// ---------------- Phone normalization & validation ----------------
function normalizePhone(raw) {
  if (!raw) return null;
  let v = String(raw).trim();
  // Strip leading protocol if present (e.g., whatsapp:+123...) for storage key
  if (v.startsWith('whatsapp:')) v = v.substring('whatsapp:'.length);
  // Remove spaces, dashes, parentheses
  v = v.replace(/[^0-9+]/g, '');
  // If no leading +, prepend default country code
  if (!v.startsWith('+')) {
    const cc = process.env.DEFAULT_COUNTRY_CODE || '+1';
    // Remove leading zeros before applying country code
    v = cc + v.replace(/^0+/, '');
  }
  return v;
}

function isValidPhone(raw) {
  const n = normalizePhone(raw);
  if (!n) return false;
  // Simple length check (after removing +)
  const digits = n.replace(/[^0-9]/g, '');
  return digits.length >= 8; // basic sanity threshold
}

// GET /menu - return available menu
app.get("/menu", async (req, res) => {
  // If using Mongo, read menu items from DB and group by category
  if (useMongo && mongoDb) {
    try {
      const items = await mongoDb.collection("menu").find({}).toArray();
      const grouped = {};
      (items || []).forEach((it) => {
        const category = it.category || "Uncategorized";
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push({ id: it._id || it.id, name: it.name, price: it.price, available: typeof it.available === 'boolean' ? it.available : true, category });
      });
      return res.json(grouped);
    } catch (e) {
      console.warn("Failed to load menu from MongoDB, falling back to in-memory", e);
    }
  }

  // Ensure each item includes an 'available' flag (default true) for clients
  const normalized = {};
  Object.entries(menuData).forEach(([cat, items]) => {
    normalized[cat] = (items || []).map((it) => ({ ...it, available: typeof it.available === 'boolean' ? it.available : true }));
  });
  res.json(normalized);
});

// Menu management endpoints (in-memory, optional MongoDB persistence)
const findMenuItem = (id) => {
  for (const cat of Object.keys(menuData)) {
    const idx = menuData[cat].findIndex((i) => i.id === id);
    if (idx !== -1) return { category: cat, index: idx };
  }
  return null;
};

app.post("/menu", async (req, res) => {
  const { id, name, category, price, available } = req.body;
  if (!name || !category || typeof price !== "number") return res.status(400).json({ success: false, message: "Invalid item" });
  const newId = id || `item-${Date.now()}`;
  if (!menuData[category]) menuData[category] = [];
  const item = { id: newId, name, category, price, available: available ?? true };
  menuData[category].push(item);
    if (useMongo && mongoDb) {
      try {
        await mongoDb.collection("menu").updateOne({ _id: item.id }, { $set: { ...item, _id: item.id } }, { upsert: true });
      } catch (e) {
        console.warn("Failed to persist menu item to MongoDB:", e && e.message ? e.message : e);
      }
    }
  res.json({ success: true, item });
});

app.put("/menu/:id", async (req, res) => {
  const { id } = req.params;
  const pos = findMenuItem(id);
  if (!pos) return res.status(404).json({ success: false, message: "Item not found" });
  const { name, category, price, available } = req.body;
  const old = menuData[pos.category][pos.index];
  // remove from old category if category changed
  if (category && category !== pos.category) {
    menuData[pos.category].splice(pos.index, 1);
    if (!menuData[category]) menuData[category] = [];
    const updated = { id, name: name ?? old.name, category, price: typeof price === 'number' ? price : old.price, available: available ?? old.available };
    menuData[category].push(updated);
    
    return res.json({ success: true, item: updated });
  }
  // update in-place
  const updated = { ...old, name: name ?? old.name, price: typeof price === 'number' ? price : old.price, available: available ?? old.available };
  menuData[pos.category][pos.index] = updated;
  
  res.json({ success: true, item: updated });
});

app.delete("/menu/:id", async (req, res) => {
  const { id } = req.params;
  const pos = findMenuItem(id);
  if (!pos) return res.status(404).json({ success: false, message: "Item not found" });
  const removed = menuData[pos.category].splice(pos.index, 1)[0];
    if (useMongo && mongoDb) {
      try { await mongoDb.collection("menu").deleteOne({ _id: id }); } catch (e) { console.warn("Failed to delete menu item in MongoDB:", e && e.message ? e.message : e); }
    }
  res.json({ success: true, item: removed });
});

// GET /orders - list orders (supports query filtering)
// Query params:
//   status=COMPLETED | PENDING | PREPARING | READY | BILL_REQUESTED
//   excludeCompleted=true (if true, filters out COMPLETED orders)
//   since=<timestamp ms> (only orders created at or after this time)
app.get("/orders", async (req, res) => {
  const { status, excludeCompleted, since } = req.query;
  const sinceTs = since ? parseInt(String(since), 10) : null;
  let list = [];
  if (useMongo && mongoDb) {
    try {
      const mongoFilter = {};
      if (status) mongoFilter.status = status;
      if (excludeCompleted === 'true' && !status) mongoFilter.status = { $ne: 'COMPLETED' };
      if (sinceTs) mongoFilter.createdAt = { $gte: sinceTs };
      const docs = await mongoDb.collection("orders").find(mongoFilter).toArray();
      list = (docs || []).map((d) => ({
        id: d._id || d.id,
        tableNumber: d.tableNumber,
        customerName: d.customerName,
        items: d.items,
        totalAmount: d.totalAmount,
        status: d.status,
        // unify field name expected by frontend (KitchenDashboard uses 'timestamp')
        timestamp: d.createdAt || d.timestamp || Date.now(),
        createdAt: d.createdAt || d.timestamp || Date.now(),
        updatedAt: d.updatedAt || null,
      }));
    } catch (e) {
      console.warn("Failed to load orders from MongoDB, falling back to in-memory", e);
    }
  }
  if (!useMongo || !mongoDb || list.length === 0) {
    list = orders.map(o => ({ ...o, timestamp: o.createdAt || o.timestamp || o.createdAt, createdAt: o.createdAt || o.timestamp, updatedAt: o.updatedAt || null }));
  }
  if (status) list = list.filter(l => l.status === status);
  if (excludeCompleted === 'true') list = list.filter(l => l.status !== 'COMPLETED');
  if (sinceTs) list = list.filter(l => l.timestamp >= sinceTs);
  return res.json(list);
});

// Diagnostic endpoint removed — use MongoDB health checks instead if needed

// GET /orders/:id - get single order
app.get("/orders/:id", (req, res) => {
  (async () => {
    const id = req.params.id;
    if (useMongo && mongoDb) {
      try {
        const doc = await mongoDb.collection("orders").findOne({ _id: id });
        if (!doc) return res.status(404).json({ success: false, message: "Order not found" });
        return res.json({ id: doc._id || doc.id, ...doc });
      } catch (e) {
        console.warn("Failed to load order from MongoDB:", e);
      }
    }
    const order = orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json(order);
  })();
});

// POST /orders - create an order
app.post("/orders", async (req, res) => {
  const { tableNumber, customerName, items, totalAmount } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "No items in order" });
  }

  const order = {
    id: `ORD-${Date.now()}`,
    tableNumber: tableNumber || null,
    customerName: customerName || "Guest",
    items,
    totalAmount: totalAmount || items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0),
    status: "PENDING",
    createdAt: Date.now()
  };

  orders.push(order);
  // persist to MongoDB when available
  if (useMongo && mongoDb) {
    try { await mongoDb.collection("orders").updateOne({ _id: order.id }, { $set: { ...order, _id: order.id } }, { upsert: true }); } catch (e) { console.warn("Failed to persist order to MongoDB:", e && e.message ? e.message : e); }
  }
  res.json({ success: true, orderId: order.id });
});

// PATCH /orders/:id - update status or other fields
app.patch("/orders/:id", async (req, res) => {
  const { status } = req.body;
  const id = req.params.id;
  const now = Date.now();
  let updated = null;

  // Update in-memory if present
  const idx = orders.findIndex((o) => o.id === id);
  if (idx !== -1) {
    if (status) {
      orders[idx].status = status;
      orders[idx].updatedAt = now;
    }
    updated = orders[idx];
  }

  // Always persist to Mongo when enabled (even if not in memory)
  if (useMongo && mongoDb) {
    try {
      const setDoc = { updatedAt: now };
      if (status) setDoc.status = status;
      const r = await mongoDb.collection("orders").findOneAndUpdate(
        { _id: id },
        { $set: setDoc },
        { upsert: false, returnDocument: 'after' }
      );
      if (r && r.value) {
        const d = r.value;
        updated = {
          id: d._id || d.id,
          tableNumber: d.tableNumber,
          customerName: d.customerName,
          items: d.items,
          totalAmount: d.totalAmount,
          status: d.status,
          timestamp: d.createdAt || d.timestamp || now,
          createdAt: d.createdAt || d.timestamp || now,
          updatedAt: d.updatedAt || now,
        };
        // reflect to in-memory cache if present
        if (idx !== -1) orders[idx] = { ...orders[idx], ...updated };
      }
    } catch (e) {
      console.warn("Failed to persist order update to MongoDB:", e && e.message ? e.message : e);
    }
  }

  if (!updated) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  return res.json({ success: true, order: updated });
});

// Simple OTP endpoints for local testing (insecure — for dev only)
const otps = {}; // phone -> code

app.post("/otp", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: "Phone required" });
  if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: "Invalid phone format" });
  const normPhone = normalizePhone(phone);
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  otps[normPhone] = { code, createdAt: Date.now() };
  console.log(`Generated OTP for ${normPhone}: ${code}`);
  // Optionally send OTP via WhatsApp if Twilio is configured
  (async () => {
    if (twilioClient) {
      try {
        const body = `Your verification code is: ${code}`;
  const sent = await sendWhatsAppMessage(normPhone, body);
        if (sent && sent.success) {
          console.log(`Sent OTP to ${phone} via WhatsApp: ${sent.sid}`);
        } else {
          console.warn(`Failed to send OTP via WhatsApp for ${phone}:`, sent && sent.error ? sent.error : sent);
        }
      } catch (e) {
        console.warn("WhatsApp send failed:", e && e.message ? e.message : e);
      }
    }
  })();

  // In development return the code for easier testing, but in production do not expose the code in the response
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_OTPS === 'true') {
    return res.json({ success: true, code, phone: normPhone });
  }
  return res.json({ success: true, phone: normPhone });
});

// Debug endpoint to list recently generated OTPs (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/otps', (req, res) => {
    try {
      return res.json({ success: true, otps });
    } catch (e) {
      return res.status(500).json({ success: false, message: String(e) });
    }
  });
}

app.post("/otp/verify", (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ success: false, message: "Phone and code required" });
  if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: "Invalid phone format" });
  const normPhone = normalizePhone(phone);
  const record = otps[normPhone];
  if (!record) return res.status(400).json({ success: false, message: "No OTP requested" });
  if (record.code !== String(code)) return res.status(400).json({ success: false, message: "Invalid code" });
  delete otps[normPhone];
  // Persist a minimal customer record when MongoDB is enabled so bills/reports can reference customers
  (async () => {
    try {
      if (useMongo && mongoDb) {
        const cust = { phone: normPhone, verifiedAt: Date.now() };
        await mongoDb.collection('customers').updateOne({ phone: normPhone }, { $set: { ...cust } }, { upsert: true });
      }
    } catch (e) {
      console.warn('Failed to persist customer on OTP verify:', e && e.message ? e.message : e);
    }
  })();

  res.json({ success: true, phone: normPhone });
});

// POST /bills - generate a bill (returns computed bill)
app.post("/bills", async (req, res) => {
  const { tableNumber, customerName, customerPhone, items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "No items to bill" });
  }

  let normalizedCustomerPhone = null;
  if (customerPhone) {
    if (!isValidPhone(customerPhone)) return res.status(400).json({ success: false, message: 'invalid phone format' });
    normalizedCustomerPhone = normalizePhone(customerPhone);
  }

  const subtotal = items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
  const taxRate = 0.05;
  const serviceRate = 0.02;
  const tax = Math.round(subtotal * taxRate);
  const service = Math.round(subtotal * serviceRate);
  const total = subtotal + tax + service;

  const bill = {
    id: `BILL-${Date.now()}`,
    tableNumber: tableNumber || null,
    customerName: customerName || "Guest",
    customerPhone: normalizedCustomerPhone || null,
    items,
    subtotal,
    tax,
    service,
    total,
    createdAt: Date.now()
  };

  bills.push(bill);
  if (useMongo && mongoDb) {
    try { await mongoDb.collection("bills").updateOne({ _id: bill.id }, { $set: { ...bill, _id: bill.id } }, { upsert: true }); } catch (e) { console.warn("Failed to persist bill to MongoDB:", e && e.message ? e.message : e); }
  }
  res.json({ success: true, bill });
});

// Get bills for a specific customer phone
app.get('/bills/by-customer/:phone', async (req, res) => {
  const rawPhone = req.params.phone;
  if (!isValidPhone(rawPhone)) return res.status(400).json({ success: false, message: 'invalid phone format' });
  const norm = normalizePhone(rawPhone);
  if (useMongo && mongoDb) {
    try {
      const docs = await mongoDb.collection('bills').find({ customerPhone: norm }).sort({ createdAt: -1 }).toArray();
      return res.json(docs.map(d => ({ id: d._id || d.id, ...d })));
    } catch (e) {
      console.warn('Failed to query bills by customer:', e && e.message ? e.message : e);
      return res.status(500).json({ success: false, message: String(e) });
    }
  }
  // in-memory fallback
  const filtered = bills.filter(b => b.customerPhone === norm);
  return res.json(filtered);
});

// Customer endpoints
app.post('/customers', async (req, res) => {
  const { phone, name, tableNumber } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'phone required' });
  if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: 'invalid phone format' });
  const normPhone = normalizePhone(phone);
  const record = { phone: normPhone, name: name || null, tableNumber: tableNumber || null, updatedAt: Date.now() };
  if (useMongo && mongoDb) {
    try {
      await mongoDb.collection('customers').updateOne({ phone: normPhone }, { $set: record, $setOnInsert: { createdAt: Date.now() } }, { upsert: true });
      return res.json({ success: true, customer: record });
    } catch (e) {
      console.warn('Failed to persist customer:', e && e.message ? e.message : e);
      return res.status(500).json({ success: false, message: String(e) });
    }
  }
  return res.json({ success: true, customer: record, message: 'Mongo not configured; in-memory only' });
});

app.get('/customers', async (req, res) => {
  if (useMongo && mongoDb) {
    try {
      const docs = await mongoDb.collection('customers').find({}).toArray();
      return res.json(docs.map(d => ({ phone: d.phone, name: d.name, tableNumber: d.tableNumber, createdAt: d.createdAt, updatedAt: d.updatedAt || d.verifiedAt })));
    } catch (e) {
      console.warn('Failed to load customers from MongoDB:', e && e.message ? e.message : e);
    }
  }
  return res.json([]);
});

// WhatsApp send endpoint (uses Twilio if configured)
app.post('/whatsapp/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ success: false, message: 'phone and message required' });
  if (!isValidPhone(phone)) return res.status(400).json({ success: false, message: 'invalid phone format' });
  const normPhone = normalizePhone(phone);
  if (!twilioClient) return res.status(400).json({ success: false, message: 'WhatsApp/Twilio not configured' });
  const sent = await sendWhatsAppMessage(normPhone, message);
  if (sent && sent.success) return res.json({ success: true, sid: sent.sid });
  return res.status(500).json({ success: false, error: sent && sent.error ? sent.error : 'unknown' });
});

// GET /bills/:id
app.get("/bills/:id", (req, res) => {
  (async () => {
    const id = req.params.id;
    if (useMongo && mongoDb) {
      try {
        const doc = await mongoDb.collection("bills").findOne({ _id: id });
        if (!doc) return res.status(404).json({ success: false, message: "Bill not found" });
        return res.json({ id: doc._id || doc.id, ...doc });
      } catch (e) {
        console.warn("Failed to load bill from MongoDB:", e);
      }
    }
    const bill = bills.find((b) => b.id === id);
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
    res.json(bill);
  })();
});

// Simple daily report computed from stored bills/orders
app.get("/reports/daily", (req, res) => {
  const date = req.query.date || new Date().toISOString().split("T")[0];
  // filter bills by date (createdAt)
  const start = new Date(date + "T00:00:00").getTime();
  const end = new Date(date + "T23:59:59").getTime();
  const dayBills = bills.filter((b) => b.createdAt >= start && b.createdAt <= end);
  const totalRevenue = dayBills.reduce((s, b) => s + (b.total || 0), 0);
  const totalOrders = dayBills.length;
  const customers = new Set(dayBills.map((b) => b.customerName));
  // top items
  const itemMap = {};
  dayBills.forEach((b) => {
    b.items.forEach((it) => {
      const key = it.id || it.name;
      if (!itemMap[key]) itemMap[key] = { name: it.name, quantity: 0, revenue: 0 };
      itemMap[key].quantity += it.quantity || 1;
      itemMap[key].revenue += (it.price || 0) * (it.quantity || 1);
    });
  });
  const topItems = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const hourly = [];
  for (let h = 0; h < 24; h++) {
    const hourStart = start + h * 3600 * 1000;
    const hourEnd = hourStart + 3600 * 1000 - 1;
    const hb = dayBills.filter((b) => b.createdAt >= hourStart && b.createdAt <= hourEnd);
    hourly.push({ hour: `${String(h).padStart(2, "0")}:00`, orders: hb.length, revenue: hb.reduce((s, x) => s + (x.total || 0), 0) });
  }
  res.json({ date, totalOrders, totalRevenue, averageOrderValue: totalOrders ? totalRevenue / totalOrders : 0, totalCustomers: customers.size, topItems, hourlyBreakdown: hourly });
});

// Dev-only: seed menu collection from `menuData` (safe for local development)
if (process.env.NODE_ENV !== 'production') {
  app.post('/admin/seed-menu', async (req, res) => {
    try {
      const docs = [];
      Object.entries(menuData).forEach(([cat, items]) => {
        (items || []).forEach((it) => {
          const id = it.id || `item-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
          docs.push({ _id: id, name: it.name, price: it.price, available: typeof it.available === 'boolean' ? it.available : true, category: cat });
        });
      });

      if (useMongo && mongoDb) {
        const ops = docs.map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: d }, upsert: true } }));
        if (ops.length) await mongoDb.collection('menu').bulkWrite(ops);
        return res.json({ success: true, inserted: docs.length });
      }

      // Fallback: seed in-memory menuData
      docs.forEach((d) => {
        if (!menuData[d.category]) menuData[d.category] = [];
        menuData[d.category].push({ id: d._id, name: d.name, price: d.price, available: d.available, category: d.category });
      });
      return res.json({ success: true, inserted: docs.length, message: 'Seeded in-memory menu' });
    } catch (e) {
      console.error('Seed failed:', e);
      return res.status(500).json({ success: false, error: String(e) });
    }
  });
}

const http = require("http");

// Helper: await a promise with timeout
function awaitPromiseWithTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('timeout'));
      }
    }, ms);
    promise.then((v) => {
      if (!settled) {
        settled = true;
        clearTimeout(t);
        resolve(v);
      }
    }).catch((e) => {
      if (!settled) {
        settled = true;
        clearTimeout(t);
        reject(e);
      }
    });
  });
}

// Start server with a retry when a port is already in use
const maxRetries = 10;
const basePort = parseInt(process.env.PORT || PORT, 10) || 4001;

(async function startServer() {
  // If configured to use MongoDB, wait a short time for the initial connection to complete
  if (process.env.USE_MONGO === "true" && mongoConnectPromise) {
    try {
      console.log('Waiting up to 5s for MongoDB connection before starting server...');
      await awaitPromiseWithTimeout(mongoConnectPromise, 5000);
      console.log('MongoDB connection established (or was already connected).');
    } catch (e) {
      console.error('MongoDB did not connect within timeout; failing fast. Error:', e && e.message ? e.message : e);
      // Fail-fast: stop startup so issues are visible in CI/dev when DB is required
      process.exit(1);
    }
  }
  for (let i = 0; i <= maxRetries; i++) {
    const tryPort = basePort + i;
    try {
      const server = http.createServer(app);
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(tryPort, () => resolve());
      });
      console.log(`Backend API listening on http://localhost:${tryPort}`);
      return;
    } catch (err) {
      if (err && err.code === "EADDRINUSE") {
        console.warn(`Port ${tryPort} is in use — trying ${tryPort + 1}...`);
        // try next
        continue;
      }
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  }
  console.error(`Unable to bind server after ${maxRetries + 1} attempts.`);
  process.exit(1);
})();
