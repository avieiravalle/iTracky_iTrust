import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

let db: Database.Database;

export function getDb() {
  if (!db) {
    db = new Database(process.env.NODE_ENV === 'test' ? ":memory:" : "inventory.db");
    db.exec("PRAGMA foreign_keys = ON;");
  }
  return db;
}

export function initDb() {
  const database = getDb();
  // Initialize Database
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      cep TEXT NOT NULL,
      establishment_name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      last_payment TEXT,
      store_code TEXT,
      parent_id INTEGER,
      plan TEXT DEFAULT 'Basic'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      min_stock INTEGER DEFAULT 5,
      current_stock INTEGER DEFAULT 0,
      average_cost REAL DEFAULT 0,
      expiry_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, sku)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT CHECK(type IN ('ENTRY', 'EXIT')) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL,
      cost_at_transaction REAL,
      status TEXT DEFAULT 'PAID',
      client_name TEXT,
      amount_paid REAL DEFAULT 0,
      expiry_date TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migrations and Admin setup...
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    if (!tableInfo.some(col => col.name === 'plan')) {
      db.exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'Basic'");
    }
    if (!tableInfo.some(col => col.name === 'parent_id')) {
      db.exec("ALTER TABLE users ADD COLUMN parent_id INTEGER");
    }

    // Ensure specific admin user exists
    const adminEmail = 'avieiravale@gmail.com';
    const adminPass = 'Anderson@46';
    const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
    
    if (existingAdmin) {
      db.prepare("UPDATE users SET role = 'admin', password = ? WHERE email = ?").run(adminPass, adminEmail);
    } else {
      db.prepare("INSERT INTO users (name, email, password, cep, establishment_name, role) VALUES (?, ?, ?, ?, ?, ?)")
        .run('Anderson Admin', adminEmail, adminPass, '00000-000', 'Admin System', 'admin');
    }
  } catch (e) {
    console.error("Migration failed:", e);
  }
}

export function closeDb() {
  if (db) {
    db.close();
    (db as any) = null;
  }
}

export async function createApp() {
  initDb();
  const db = getDb();
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Auth Routes
  app.get("/api/validate-store/:code", (req, res) => {
    try {
      const { code } = req.params;
      const store = db.prepare("SELECT establishment_name, id FROM users WHERE store_code = ? AND role = 'gestor'").get(code) as any;
      
      if (store) {
        // Count collaborators
        const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE parent_id = ?").get(store.id) as any;
        if (count.count >= 4) {
          return res.status(400).json({ error: "Limite de colaboradores atingido para esta loja (máx 4)" });
        }
        res.json({ establishment_name: store.establishment_name });
      } else {
        res.status(404).json({ error: "Código de loja não encontrado" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/register", (req, res) => {
    const { name, email, password, cep, establishment_name, role, store_code } = req.body;
    try {
      // Check if email exists
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado" });
      }

      if (role === 'gestor') {
        // Generate a random store code if not provided (though UI should handle it)
        const finalCode = store_code || Math.random().toString(36).substring(2, 8).toUpperCase();
        const info = db.prepare("INSERT INTO users (name, email, password, cep, establishment_name, role, store_code) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(name, email, password, cep, establishment_name, 'gestor', finalCode);
        res.json({ id: info.lastInsertRowid, store_code: finalCode });
      } else if (role === 'colaborador') {
        const store = db.prepare("SELECT id, establishment_name FROM users WHERE store_code = ? AND role = 'gestor'").get(store_code) as any;
        if (!store) return res.status(400).json({ error: "Código de loja inválido" });
        
        // Check limit again
        const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE parent_id = ?").get(store.id) as any;
        if (count.count >= 4) return res.status(400).json({ error: "Limite de colaboradores atingido" });

        const info = db.prepare("INSERT INTO users (name, email, password, cep, establishment_name, role, parent_id, store_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(name, email, password, cep, store.establishment_name, 'colaborador', store.id, store_code);
        res.json({ id: info.lastInsertRowid });
      } else {
        const info = db.prepare("INSERT INTO users (name, email, password, cep, establishment_name) VALUES (?, ?, ?, ?, ?)").run(name, email, password, cep, establishment_name);
        res.json({ id: info.lastInsertRowid });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // API Routes
  app.get("/api/products", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      
      // Get the effective owner ID (if collaborator, use parent_id)
      const user = db.prepare("SELECT id, parent_id, role FROM users WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;
      
      const products = db.prepare("SELECT * FROM products WHERE user_id = ?").all(ownerId);
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stats", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      
      const user = db.prepare("SELECT id, parent_id, role FROM users WHERE id = ?").get(userId) as any;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const stats = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE 
            WHEN t.type = 'EXIT' THEN (t.amount_paid - (t.cost_at_transaction * (t.amount_paid / t.unit_cost)))
            ELSE 0 
          END), 0) as realized_profit,
          COALESCE(SUM(CASE 
            WHEN t.type = 'EXIT' AND t.status = 'PENDING' THEN ((t.unit_cost * t.quantity - t.amount_paid) - (t.cost_at_transaction * ((t.unit_cost * t.quantity - t.amount_paid) / t.unit_cost)))
            ELSE 0 
          END), 0) as pending_profit
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ?
      `).get(ownerId) as any;

      res.json(stats || { realized_profit: 0, pending_profit: 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/product-stats", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      
      const user = db.prepare("SELECT id, parent_id, role FROM users WHERE id = ?").get(userId) as any;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const productStats = db.prepare(`
        SELECT 
          p.name,
          p.sku,
          SUM(t.quantity) as total_sold,
          COALESCE(SUM(CASE WHEN t.type = 'EXIT' THEN (t.amount_paid - (t.cost_at_transaction * (t.amount_paid / t.unit_cost))) ELSE 0 END), 0) as profit
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ? AND t.type = 'EXIT'
        GROUP BY p.id
        ORDER BY profit DESC
      `).all(ownerId);

      res.json(productStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/monthly-stats", (req, res) => {
    try {
      const userId = req.query.userId;
      const months = Number(req.query.months) || 6;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      
      const user = db.prepare("SELECT id, parent_id, role FROM users WHERE id = ?").get(userId) as any;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const monthlyStats = db.prepare(`
        SELECT 
          strftime('%Y-%m', t.timestamp) as month,
          COALESCE(SUM(CASE WHEN t.type = 'EXIT' THEN (t.amount_paid - (t.cost_at_transaction * (t.amount_paid / t.unit_cost))) ELSE 0 END), 0) as profit
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ? AND t.type = 'EXIT' AND t.timestamp >= date('now', '-' || ? || ' months', 'start of month')
        GROUP BY month
        ORDER BY month ASC
      `).all(ownerId, months);

      res.json(monthlyStats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/receivables", (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      
      const user = db.prepare("SELECT id, parent_id, role FROM users WHERE id = ?").get(userId) as any;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const receivables = db.prepare(`
        SELECT 
          t.*,
          p.name as product_name,
          p.sku as product_sku,
          ((t.unit_cost - t.cost_at_transaction) * t.quantity) as expected_profit
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ? AND t.type = 'EXIT' AND t.status = 'PENDING'
        ORDER BY t.timestamp DESC
      `).all(ownerId);

      res.json(receivables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions/:id/pay", (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      
      const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as any;
      if (!transaction) return res.status(404).json({ error: "Transaction not found" });

      const totalValue = transaction.unit_cost * transaction.quantity;
      
      if (amount !== undefined) {
        const newAmountPaid = Math.min(transaction.amount_paid + amount, totalValue);
        const newStatus = newAmountPaid >= totalValue ? 'PAID' : 'PENDING';
        db.prepare("UPDATE transactions SET amount_paid = ?, status = ? WHERE id = ?")
          .run(newAmountPaid, newStatus, id);
      } else {
        db.prepare("UPDATE transactions SET amount_paid = ?, status = 'PAID' WHERE id = ?")
          .run(totalValue, id);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", (req, res) => {
    const { user_id, name, sku, min_stock } = req.body;
    try {
      const user = db.prepare("SELECT id, parent_id, role FROM users WHERE id = ?").get(user_id) as any;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const info = db.prepare("INSERT INTO products (user_id, name, sku, min_stock) VALUES (?, ?, ?, ?)").run(ownerId, name, sku, min_stock);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/transactions", (req, res) => {
    const { product_id, type, quantity, unit_cost, status, client_name, expiry_date } = req.body;
    
    try {
      db.transaction(() => {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
        if (!product) throw new Error("Product not found");

        if (type === 'ENTRY') {
          const newTotalStock = product.current_stock + quantity;
          const currentTotalValue = product.current_stock * product.average_cost;
          const newPurchaseValue = quantity * (unit_cost || 0);
          const newAverageCost = (currentTotalValue + newPurchaseValue) / newTotalStock;

          db.prepare("UPDATE products SET current_stock = ?, average_cost = ?, expiry_date = ? WHERE id = ?")
            .run(newTotalStock, newAverageCost, expiry_date || product.expiry_date, product_id);
          
          db.prepare("INSERT INTO transactions (product_id, type, quantity, unit_cost, cost_at_transaction, status, amount_paid, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .run(product_id, type, quantity, unit_cost, product.average_cost, 'PAID', unit_cost * quantity, expiry_date || null);
        } else {
          if (product.current_stock < quantity) throw new Error("Insufficient stock");
          const newTotalStock = product.current_stock - quantity;
          db.prepare("UPDATE products SET current_stock = ? WHERE id = ?")
            .run(newTotalStock, product_id);

          const totalValue = unit_cost * quantity;
          const initialPaid = status === 'PAID' ? totalValue : 0;

          db.prepare("INSERT INTO transactions (product_id, type, quantity, unit_cost, cost_at_transaction, status, client_name, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .run(product_id, type, quantity, unit_cost, product.average_cost, status || 'PAID', client_name || null, initialPaid);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error processing transaction:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", (req, res) => {
    try {
      const users = db.prepare("SELECT id, name, email, establishment_name, role, status, last_payment, plan FROM users WHERE role != 'admin'").all();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/reset-db", (req, res) => {
    try {
      db.transaction(() => {
        db.exec("DELETE FROM transactions");
        db.exec("DELETE FROM products");
        db.exec("DELETE FROM app_sales");
        db.exec("DELETE FROM users WHERE role != 'admin'");
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/toggle-status", (req, res) => {
    try {
      const { id } = req.params;
      const user = db.prepare("SELECT status FROM users WHERE id = ?").get(id) as any;
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(newStatus, id);
      res.json({ success: true, status: newStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:id/payment", (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(id) as any;
      if (!user) return res.status(404).json({ error: "User not found" });

      const finalAmount = amount !== undefined ? amount : (user.plan === 'Premium' ? 99.90 : 49.90);

      db.transaction(() => {
        db.prepare("UPDATE users SET last_payment = ?, status = 'active' WHERE id = ?").run(today, id);
        db.prepare("INSERT INTO app_sales (user_id, amount) VALUES (?, ?)").run(id, finalAmount);
      })();

      res.json({ success: true, last_payment: today });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/sales", (req, res) => {
    try {
      const sales = db.prepare(`
        SELECT 
          s.id, 
          u.name as client_name, 
          s.amount,
          s.date
        FROM app_sales s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.date DESC
      `).all();
      res.json(sales);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  return app;
}
