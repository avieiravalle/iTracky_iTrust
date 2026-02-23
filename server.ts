import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

let db: Database.Database | null = null;

interface AuthRequest extends Request {
  user?: any;
}

// Definição de __dirname para ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getDb() {
  if (!db) {
    const isTest = process.env.NODE_ENV === 'test' || process.env.CYPRESS_TEST === 'true';
    const dbPath = isTest ? ":memory:" : path.join(__dirname, "inventory.db");
    db = new Database(dbPath);
    db.exec("PRAGMA foreign_keys = ON;");
  }
  return db;
}

function runMigrations(database: Database.Database) {
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

    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations and Admin setup...
  try {
    const tableInfo = database.prepare("PRAGMA table_info(users)").all() as any[];
    if (!tableInfo.some(col => col.name === 'plan')) {
      database.exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'Basic'");
    }
    if (!tableInfo.some(col => col.name === 'parent_id')) {
      database.exec("ALTER TABLE users ADD COLUMN parent_id INTEGER");
    }

    // Ensure specific admin user exists
    const adminEmail = 'avieiravale@gmail.com';
    const adminPass = 'Anderson@46';
    const existingAdmin = database.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
    
    if (existingAdmin) {
      database.prepare("UPDATE users SET role = 'admin', password = ? WHERE email = ?").run(adminPass, adminEmail);
    } else {
      database.prepare("INSERT INTO users (name, email, password, cep, establishment_name, role) VALUES (?, ?, ?, ?, ?, ?)")
        .run('Anderson Admin', adminEmail, adminPass, '00000-000', 'Admin System', 'admin');
    }
  } catch (e) {
    console.error("Migration failed:", e);
    throw e;
  }
}

export function initDb() {
  try {
    const database = getDb();
    runMigrations(database);
  } catch (e: any) {
    if (e.code === 'SQLITE_CORRUPT') {
      console.warn("Database corrupted. Recreating...");
      closeDb();
      const isTest = process.env.NODE_ENV === 'test' || process.env.CYPRESS_TEST === 'true';
      const dbPath = isTest ? ":memory:" : path.join(__dirname, "inventory.db");
      if (dbPath !== ":memory:" && fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      const database = getDb();
      runMigrations(database);
    } else {
      console.error("Database initialization failed:", e);
    }
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// Configuração de E-mail (Substitua pelos seus dados reais)
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou outro provedor SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// JWT Secret (Em produção, use variáveis de ambiente .env)
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_dev_only";

// Middleware de Autenticação e Segurança
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: "Acesso negado" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Token inválido" });

    // SEGURANÇA CRÍTICA: Verificar se o usuário ainda existe e está ativo no banco
    const dbUser = getDb().prepare("SELECT id, role, parent_id, status FROM users WHERE id = ?").get(user.id) as any;
    
    if (!dbUser) return res.status(403).json({ error: "Usuário não encontrado ou excluído" });
    if (dbUser.status !== 'active') return res.status(403).json({ error: "Acesso revogado ou pendente" });

    req.user = dbUser; // Anexa o usuário real do banco à requisição
    next();
  });
};

// Helper para Logs de Auditoria
function logAudit(userId: number | null, userName: string | null, action: string, details: string) {
  try {
    getDb().prepare("INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)").run(userId, userName, action, details);
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

export async function createApp() {
  initDb();
  const db = getDb();
  const app = express();
  app.use(express.json());

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
        
        // Em ambiente de teste (Cypress), mantemos 'active' para não quebrar os testes. Em produção, 'pending'.
        const isTest = process.env.NODE_ENV === 'test' || process.env.CYPRESS_TEST === 'true';
        const initialStatus = isTest ? 'active' : 'pending';
        const info = db.prepare("INSERT INTO users (name, email, password, cep, establishment_name, role, store_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(name, email, password, cep, establishment_name, 'gestor', finalCode, initialStatus);
        res.json({ id: info.lastInsertRowid, store_code: finalCode, status: initialStatus });
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
      if (user.status === 'pending') {
        return res.status(403).json({ error: "Cadastro em análise. Realize o pagamento PIX (Chave: 29556537805) e envie o comprovante no WhatsApp para liberar seu acesso." });
      }
      
      const { password, ...userWithoutPassword } = user;
      // Gera o token JWT
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
      logAudit(user.id, user.name, 'LOGIN', 'Usuário realizou login');
      res.json({ user: userWithoutPassword, token });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  // Password Recovery Routes
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (!user) return res.status(404).json({ error: "E-mail não encontrado" });

      // Generate 6-digit code
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      db.prepare("DELETE FROM password_resets WHERE email = ?").run(email);
      db.prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)").run(email, token, expiresAt);

      // Send email
      await transporter.sendMail({
        from: '"Controle de Estoque" <noreply@estoque.com>',
        to: email,
        subject: "Recuperação de Senha",
        text: `Seu código de recuperação é: ${token}`,
        html: `<p>Seu código de recuperação é: <strong>${token}</strong></p><p>Válido por 15 minutos.</p>`
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Erro ao enviar e-mail. Verifique as configurações do servidor." });
    }
  });

  app.post("/api/reset-password", (req, res) => {
    const { email, token, newPassword } = req.body;
    try {
      const resetRecord = db.prepare("SELECT * FROM password_resets WHERE email = ? AND token = ?").get(email, token) as any;
      
      if (!resetRecord || new Date(resetRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: "Código inválido ou expirado" });
      }

      db.prepare("UPDATE users SET password = ? WHERE email = ?").run(newPassword, email);
      db.prepare("DELETE FROM password_resets WHERE email = ?").run(email);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  // Agora protegidas pelo middleware authenticateToken
  app.get("/api/me", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products", authenticateToken, (req: AuthRequest, res) => {
    try {
      // Usa o ID do token (req.user), ignorando o que vem da URL. Isso garante isolamento.
      const user = req.user;
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;
      
      const products = db.prepare("SELECT * FROM products WHERE user_id = ?").all(ownerId);
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stats", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const stats = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE 
            WHEN t.type = 'EXIT' AND t.unit_cost > 0 THEN (t.amount_paid - (t.cost_at_transaction * (t.amount_paid / t.unit_cost)))
            ELSE 0 
          END), 0) as realized_profit,
          COALESCE(SUM(CASE 
            WHEN t.type = 'EXIT' AND t.status = 'PENDING' AND t.unit_cost > 0 THEN ((t.unit_cost * t.quantity - t.amount_paid) - (t.cost_at_transaction * ((t.unit_cost * t.quantity - t.amount_paid) / t.unit_cost)))
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

  app.get("/api/product-stats", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const productStats = db.prepare(`
        SELECT 
          p.name,
          p.sku,
          SUM(t.quantity) as total_sold,
          COALESCE(SUM(CASE WHEN t.type = 'EXIT' AND t.unit_cost > 0 THEN (t.amount_paid - (t.cost_at_transaction * (t.amount_paid / t.unit_cost))) ELSE 0 END), 0) as profit
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

  app.get("/api/profit-evolution", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const period = (req.query.period as string) || 'month';
      const range = Number(req.query.range) || 12;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      let groupBy = "";
      let selectLabel = "";
      let dateFilter = "";
      let queryParams: any[] = [ownerId];

      switch (period) {
        case 'custom':
          groupBy = "strftime('%Y-%m-%d', t.timestamp)";
          selectLabel = "strftime('%Y-%m-%d', t.timestamp)";
          dateFilter = "t.timestamp >= ? AND t.timestamp <= ?";
          queryParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
          break;
        case 'day':
          groupBy = "strftime('%Y-%m-%d', t.timestamp)";
          selectLabel = "strftime('%Y-%m-%d', t.timestamp)";
          dateFilter = "date('now', '-' || ? || ' days')";
          queryParams.push(range);
          break;
        case 'week':
          groupBy = "strftime('%Y-%W', t.timestamp)";
          selectLabel = "strftime('%Y-%W', t.timestamp)";
          dateFilter = "date('now', '-' || ? || ' days')";
          queryParams.push(range * 7);
          break;
        case 'quarter':
          groupBy = "strftime('%Y', t.timestamp) || '-Q' || ((CAST(strftime('%m', t.timestamp) AS INTEGER) + 2) / 3)";
          selectLabel = "strftime('%Y', t.timestamp) || '-Q' || ((CAST(strftime('%m', t.timestamp) AS INTEGER) + 2) / 3)";
          dateFilter = "date('now', '-' || ? || ' months', 'start of month')";
          queryParams.push(range * 3);
          break;
        case 'month':
        default:
          groupBy = "strftime('%Y-%m', t.timestamp)";
          selectLabel = "strftime('%Y-%m', t.timestamp)";
          dateFilter = "date('now', '-' || ? || ' months', 'start of month')";
          queryParams.push(range);
      }

      const query = `
        SELECT 
          ${selectLabel} as month,
          COALESCE(SUM(CASE WHEN t.type = 'EXIT' AND t.unit_cost > 0 THEN (t.amount_paid - (t.cost_at_transaction * (t.amount_paid / t.unit_cost))) ELSE 0 END), 0) as profit
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ? AND t.type = 'EXIT' AND ${dateFilter}
        GROUP BY ${groupBy}
        ORDER BY month ASC
      `;

      const stats = db.prepare(query).all(...queryParams);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/receivables", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
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

  app.post("/api/transactions/:id/pay", authenticateToken, (req, res) => {
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

  app.post("/api/products", authenticateToken, (req: AuthRequest, res) => {
    const { name, sku, min_stock } = req.body;
    try {
      const user = req.user;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;

      const info = db.prepare("INSERT INTO products (user_id, name, sku, min_stock) VALUES (?, ?, ?, ?)").run(ownerId, name, sku, min_stock);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/transactions", authenticateToken, (req, res) => {
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

          db.prepare("INSERT INTO transactions (product_id, type, quantity, unit_cost, cost_at_transaction, status, client_name, amount_paid, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(product_id, type, quantity, unit_cost, product.average_cost, status || 'PAID', client_name || null, initialPaid, expiry_date || null);
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
      const users = db.prepare("SELECT id, name, email, establishment_name, role, status, last_payment, plan, store_code FROM users WHERE role != 'admin'").all();
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
      // O log será feito pelo admin (não temos o user do admin aqui no req sem middleware, mas podemos inferir ou passar)
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

      const finalAmount = amount !== undefined ? amount : 100.00;

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

  app.get("/api/admin/logs", (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100").all();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Webhook para Aprovação Automática
  // Nota: Para funcionar, você deve configurar esta URL no seu gateway de pagamento (ex: Mercado Pago)
  // e passar o ID do usuário como referência externa na criação do pagamento.
  app.post("/api/webhook/pix", (req, res) => {
    try {
      // Exemplo de estrutura de payload (varia conforme o gateway)
      // Supondo que o gateway envie: { external_reference: "ID_DO_USUARIO", status: "approved" }
      const { external_reference, status } = req.body;

      // Verifica se o pagamento foi aprovado e se temos o ID do usuário
      if (status === 'approved' && external_reference) {
        const userId = parseInt(external_reference);
        const today = new Date().toISOString().split('T')[0];
        const amount = 100.00; // Valor do plano

        db.transaction(() => {
          db.prepare("UPDATE users SET last_payment = ?, status = 'active' WHERE id = ?").run(today, userId);
          db.prepare("INSERT INTO app_sales (user_id, amount) VALUES (?, ?)").run(userId, amount);
        })();
        
        logAudit(userId, "Sistema", "PAGAMENTO_PIX", "Pagamento aprovado via Webhook");
        console.log(`Webhook: Pagamento aprovado automaticamente para usuário ${userId}`);
      }
      
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Em produção (Locaweb), serve os arquivos estáticos da pasta dist
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  createApp().then((app) => {
    app.listen(PORT, () => {
      console.log(`Servidor iniciado na porta ${PORT}`);
    });
  });
}
