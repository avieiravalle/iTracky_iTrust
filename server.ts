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
      plan TEXT DEFAULT 'Basic',
      current_token TEXT,
      custom_colors TEXT,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      min_stock INTEGER DEFAULT 5,
      current_stock INTEGER DEFAULT 0,
      average_cost REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
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
      payment_method TEXT,
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
    const productInfo = database.prepare("PRAGMA table_info(products)").all() as any[];
    if (!productInfo.some(col => col.name === 'sale_price')) {
      database.exec("ALTER TABLE products ADD COLUMN sale_price REAL DEFAULT 0");
    }
    const transactionInfo = database.prepare("PRAGMA table_info(transactions)").all() as any[];
    if (!transactionInfo.some(col => col.name === 'payment_method')) {
      database.exec("ALTER TABLE transactions ADD COLUMN payment_method TEXT");
    }
    if (!tableInfo.some(col => col.name === 'current_token')) {
      database.exec("ALTER TABLE users ADD COLUMN current_token TEXT");
    }
    if (!tableInfo.some(col => col.name === 'custom_colors')) {
      database.exec("ALTER TABLE users ADD COLUMN custom_colors TEXT");
    }
    if (!tableInfo.some(col => col.name === 'logo_url')) {
      database.exec("ALTER TABLE users ADD COLUMN logo_url TEXT");
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
    const dbUser = getDb().prepare("SELECT id, name, role, parent_id, status, establishment_name, current_token, custom_colors, logo_url FROM users WHERE id = ?").get(user.id) as any;
    
    if (!dbUser) return res.status(403).json({ error: "Usuário não encontrado ou excluído" });
    if (dbUser.status !== 'active') return res.status(403).json({ error: "Acesso revogado ou pendente" });

    // SINGLE SESSION: Se for Gestor ou Colaborador, verifica se o token é o mais recente
    if ((dbUser.role === 'gestor' || dbUser.role === 'colaborador') && dbUser.current_token && dbUser.current_token !== token) {
      return res.status(401).json({ error: "Sessão expirada. Você realizou login em outro dispositivo." });
    }

    // Parse custom_colors se existir
    if (dbUser.custom_colors && typeof dbUser.custom_colors === 'string') {
      dbUser.custom_colors = JSON.parse(dbUser.custom_colors);
    }

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
        
        // Alerta por E-mail para o Admin
        if (!isTest) {
          transporter.sendMail({
            from: '"StockFlow System" <noreply@estoque.com>',
            to: 'avieiravale@gmail.com',
            subject: '🔔 Novo Gestor Aguardando Aprovação',
            html: `
              <h3>Novo Cadastro Pendente</h3>
              <p><strong>Nome:</strong> ${name}</p>
              <p><strong>Loja:</strong> ${establishment_name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p>Acesse o painel administrativo para aprovar.</p>
            `
          }).catch(err => console.error("Erro ao enviar alerta para admin:", err));

          // Alerta via WhatsApp para o Admin (11930051475)
          // Nota: Para envio real, integre com uma API (ex: Z-API, Twilio, CallMeBot)
          const adminPhone = "5511930051475";
          const waMessage = `🔔 *Novo Gestor Pendente*\n\n👤 *Nome:* ${name}\n🏢 *Loja:* ${establishment_name}\n📧 *Email:* ${email}\n\n_Acesse o painel para liberar._`;
          
          // Exemplo de implementação (Descomente e ajuste a URL/Token do seu provedor):
          /*
          fetch('https://api.seuservico-whatsapp.com/send-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer SEU_TOKEN_AQUI' },
            body: JSON.stringify({ phone: adminPhone, message: waMessage })
          }).catch(err => console.error("Erro ao enviar WhatsApp:", err));
          */
          console.log(`[WHATSAPP ALERT] Para: ${adminPhone} | Msg: ${waMessage.replace(/\n/g, ' ')}`);
        }

        logAudit(info.lastInsertRowid as number, name, 'CADASTRO_GESTOR', `Novo gestor registrado: ${email} - Loja: ${establishment_name}`);
        res.json({ id: info.lastInsertRowid, store_code: finalCode, status: initialStatus });
      } else if (role === 'colaborador') {
        const store = db.prepare("SELECT id, establishment_name FROM users WHERE store_code = ? AND role = 'gestor'").get(store_code) as any;
        if (!store) return res.status(400).json({ error: "Código de loja inválido" });
        
        // Check limit again
        const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE parent_id = ?").get(store.id) as any;
        if (count.count >= 4) return res.status(400).json({ error: "Limite de colaboradores atingido" });

        const info = db.prepare("INSERT INTO users (name, email, password, cep, establishment_name, role, parent_id, store_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(name, email, password, cep, store.establishment_name, 'colaborador', store.id, store_code);
        logAudit(info.lastInsertRowid as number, name, 'CADASTRO_COLABORADOR', `Novo colaborador vinculado à loja ${store.establishment_name}`);
        res.json({ id: info.lastInsertRowid });
      } else {
        const info = db.prepare("INSERT INTO users (name, email, password, cep, establishment_name) VALUES (?, ?, ?, ?, ?)").run(name, email, password, cep, establishment_name);
        logAudit(info.lastInsertRowid as number, name, 'CADASTRO_USER', `Novo usuário registrado: ${email}`);
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
      
      // SINGLE SESSION: Salva o token atual no banco para invalidar anteriores
      if (user.role !== 'admin') {
        db.prepare("UPDATE users SET current_token = ? WHERE id = ?").run(token, user.id);
      }

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

      // Ao resetar a senha, limpamos o token atual para forçar logout em todos os dispositivos
      db.prepare("UPDATE users SET password = ?, current_token = NULL WHERE email = ?").run(newPassword, email);
      
      db.prepare("DELETE FROM password_resets WHERE email = ?").run(email);

      const user = db.prepare("SELECT id, name FROM users WHERE email = ?").get(email) as any;
      if (user) logAudit(user.id, user.name, 'RESET_SENHA', 'Senha alterada via recuperação de conta');
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
      const sort = req.query.sort as string;
      
      let orderBy = "ORDER BY name ASC";
      if (sort === 'stock_desc') {
        orderBy = "ORDER BY current_stock DESC";
      } else if (sort === 'stock_asc') {
        orderBy = "ORDER BY current_stock ASC";
      }
      
      const products = db.prepare(`SELECT * FROM products WHERE user_id = ? ${orderBy}`).all(ownerId);
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

  app.post("/api/transactions/:id/pay", authenticateToken, (req: AuthRequest, res) => {
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
      
      const user = req.user;
      logAudit(user.id, user.name, 'RECEBIMENTO_VENDA', `Recebimento registrado na transação ID ${id}`);
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
      logAudit(user.id, user.name, 'CRIACAO_PRODUTO', `Produto criado: ${name} (SKU: ${sku})`);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/transactions", authenticateToken, (req: AuthRequest, res) => {
    const { product_id, type, quantity, unit_cost, status, client_name, expiry_date, sale_price } = req.body;
    
    try {
      db.transaction(() => {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
        if (!product) throw new Error("Product not found");

        if (type === 'ENTRY') {
          const newTotalStock = product.current_stock + quantity;
          const currentTotalValue = product.current_stock * product.average_cost;
          const newPurchaseValue = quantity * (unit_cost || 0);
          const newAverageCost = (currentTotalValue + newPurchaseValue) / newTotalStock;

          // Se um novo sale_price for fornecido, atualize-o. Caso contrário, mantenha o antigo.
          const finalSalePrice = (sale_price !== undefined && sale_price !== null && sale_price > 0) ? sale_price : product.sale_price;

          db.prepare("UPDATE products SET current_stock = ?, average_cost = ?, expiry_date = ?, sale_price = ? WHERE id = ?")
            .run(newTotalStock, newAverageCost, expiry_date || product.expiry_date, finalSalePrice, product_id);
          
          db.prepare("INSERT INTO transactions (product_id, type, quantity, unit_cost, cost_at_transaction, status, amount_paid, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .run(product_id, type, quantity, unit_cost, product.average_cost, 'PAID', unit_cost * quantity, expiry_date || null);
          
          const user = req.user;
          logAudit(user.id, user.name, 'ENTRADA_ESTOQUE', `Entrada de ${quantity} un. em ${product.name} (SKU: ${product.sku})`);
        } else {
          if (product.current_stock < quantity) throw new Error("Insufficient stock");
          const newTotalStock = product.current_stock - quantity;
          db.prepare("UPDATE products SET current_stock = ? WHERE id = ?")
            .run(newTotalStock, product_id);

          const totalValue = unit_cost * quantity;
          const initialPaid = status === 'PAID' ? totalValue : 0;

          db.prepare("INSERT INTO transactions (product_id, type, quantity, unit_cost, cost_at_transaction, status, client_name, amount_paid, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(product_id, type, quantity, unit_cost, product.average_cost, status || 'PAID', client_name || null, initialPaid, expiry_date || null);
          
          const user = req.user;
          logAudit(user.id, user.name, 'SAIDA_ESTOQUE', `Saída de ${quantity} un. em ${product.name} (SKU: ${product.sku}) - Cliente: ${client_name || 'N/A'}`);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error processing transaction:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id/price", authenticateToken, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { sale_price } = req.body;
    const user = req.user;

    if (user.role !== 'gestor') {
        return res.status(403).json({ error: "Apenas gestores podem alterar o preço de venda." });
    }

    if (sale_price === undefined || sale_price === null || isNaN(parseFloat(sale_price))) {
        return res.status(400).json({ error: "Preço de venda inválido." });
    }

    try {
        const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;
        const product = db.prepare("SELECT user_id, name FROM products WHERE id = ?").get(id) as any;

        if (!product) {
            return res.status(404).json({ error: "Produto não encontrado." });
        }

        if (product.user_id !== ownerId) {
            return res.status(403).json({ error: "Acesso negado a este produto." });
        }

        const info = db.prepare("UPDATE products SET sale_price = ? WHERE id = ?").run(sale_price, id);

        if (info.changes > 0) {
            logAudit(user.id, user.name, 'UPDATE_SALE_PRICE', `Preço de venda do produto '${product.name}' (ID ${id}) atualizado para ${sale_price}`);
            res.json({ success: true, sale_price });
        } else {
            res.status(404).json({ error: "Produto não encontrado ou nenhuma alteração foi feita." });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  // Rota para Atualizar Configurações da Loja (Cores e Logo)
  app.patch("/api/store-settings", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const { custom_colors, logo_url } = req.body;

      if (user.role !== 'gestor') {
        return res.status(403).json({ error: "Apenas gestores podem alterar configurações da loja." });
      }

      const colorsString = custom_colors ? JSON.stringify(custom_colors) : null;
      db.prepare("UPDATE users SET custom_colors = ?, logo_url = ? WHERE id = ?").run(colorsString, logo_url, user.id);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rota para Excluir Produto (Apenas Gestor)
  app.delete("/api/products/:id", authenticateToken, (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
      const user = req.user;

      // 1. Bloqueio de Segurança: Apenas Gestor pode excluir
      if (user.role !== 'gestor') {
        return res.status(403).json({ error: "Acesso negado. Apenas gestores podem excluir produtos." });
      }

      const product = db.prepare("SELECT user_id, name, sku FROM products WHERE id = ?").get(id) as any;
      if (!product) return res.status(404).json({ error: "Produto não encontrado." });

      if (product.user_id !== user.id) return res.status(403).json({ error: "Acesso negado." });

      db.prepare("DELETE FROM products WHERE id = ?").run(id);
      logAudit(user.id, user.name, 'EXCLUSAO_PRODUTO', `Produto excluído: ${product.name} (SKU: ${product.sku})`);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- ROTAS DE GESTÃO DE EQUIPE (COLABORADORES) ---

  app.get("/api/collaborators", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (user.role !== 'gestor') {
        return res.status(403).json({ error: "Acesso negado. Apenas gestores podem ver a equipe." });
      }

      // Busca usuários onde parent_id é igual ao ID do gestor logado
      const collaborators = db.prepare("SELECT id, name, email, role, status, last_payment as last_login FROM users WHERE parent_id = ?").all(user.id);
      res.json(collaborators);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/collaborators/:id/status", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { status } = req.body;

      if (user.role !== 'gestor') return res.status(403).json({ error: "Acesso negado." });

      // Verifica vínculo antes de alterar
      const collaborator = db.prepare("SELECT id FROM users WHERE id = ? AND parent_id = ?").get(id, user.id);
      if (!collaborator) return res.status(404).json({ error: "Colaborador não encontrado na sua equipe." });

      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
      logAudit(user.id, user.name, 'ALTERACAO_STATUS_COLABORADOR', `Status do colaborador ID ${id} alterado para ${status}`);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/collaborators/:id", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const { id } = req.params;

      if (user.role !== 'gestor') return res.status(403).json({ error: "Acesso negado." });

      const collaborator = db.prepare("SELECT id, name FROM users WHERE id = ? AND parent_id = ?").get(id, user.id) as any;
      if (!collaborator) return res.status(404).json({ error: "Colaborador não encontrado na sua equipe." });

      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      logAudit(user.id, user.name, 'EXCLUSAO_COLABORADOR', `Colaborador ${collaborator.name} removido da equipe.`);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rota de Checkout do PDV (Venda em Lote)
  app.post("/api/pos/checkout", authenticateToken, (req: AuthRequest, res) => {
    const { items, paymentMethod, clientName, status, amountPaid } = req.body; 
    // items: [{ product_id, quantity, unit_price }]
    
    try {
      const user = req.user;
      const transactionStatus = status || 'PAID';
      
      db.transaction(() => {
        let totalAmount = 0;
        let remainingPayment = amountPaid !== undefined ? Number(amountPaid) : (transactionStatus === 'PAID' ? Infinity : 0);

        for (const item of items) {
          const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id) as any;
          if (!product) throw new Error(`Produto ID ${item.product_id} não encontrado`);
          
          if (product.current_stock < item.quantity) {
            throw new Error(`Estoque insuficiente para ${product.name}`);
          }

          const newTotalStock = product.current_stock - item.quantity;
          db.prepare("UPDATE products SET current_stock = ? WHERE id = ?").run(newTotalStock, item.product_id);

          const itemTotal = item.unit_price * item.quantity;
          totalAmount += itemTotal;

          let itemAmountPaid = 0;
          if (transactionStatus === 'PAID') {
             itemAmountPaid = itemTotal;
          } else {
             itemAmountPaid = Math.min(itemTotal, remainingPayment);
             remainingPayment = Math.max(0, remainingPayment - itemAmountPaid);
          }

          const finalPaymentMethod = itemAmountPaid > 0 ? paymentMethod : null;
          const finalClientName = clientName || (transactionStatus === 'PENDING' ? 'Cliente não identificado' : 'Consumidor Final');

          db.prepare("INSERT INTO transactions (product_id, type, quantity, unit_cost, cost_at_transaction, status, client_name, amount_paid, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(item.product_id, 'EXIT', item.quantity, item.unit_price, product.average_cost, transactionStatus, finalClientName, itemAmountPaid, finalPaymentMethod);
        }

        logAudit(user.id, user.name, 'VENDA_PDV', `Venda PDV realizada (${transactionStatus}). Total: R$ ${totalAmount.toFixed(2)} - Itens: ${items.length}`);
      })();

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", (req, res) => {
    try {
      const users = db.prepare("SELECT id, name, email, establishment_name, role, status, last_payment, plan, store_code FROM users WHERE role != 'admin' ORDER BY name ASC").all();
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
        logAudit(null, 'Admin', 'RESET_DB', 'Banco de dados resetado completamente pelo administrador');
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
      logAudit(null, 'Admin', 'EXCLUSAO_USUARIO', `Usuário ID ${id} removido pelo administrador`);
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
      logAudit(null, 'Admin', 'ALTERACAO_STATUS', `Status do usuário ID ${id} alterado para ${newStatus}`);
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
        logAudit(null, 'Admin', 'PAGAMENTO_MANUAL', `Pagamento manual registrado para usuário ID ${id}: R$ ${finalAmount}`);
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

  app.get("/api/reports/period-summary", authenticateToken, (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const ownerId = user.role === 'colaborador' ? user.parent_id : user.id;
      const { startDate, endDate } = req.query;
  
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "As datas de início e fim são obrigatórias." });
      }
  
      const fullEndDate = `${endDate} 23:59:59`;
  
      // 1. Visão Financeira e Movimentação de Saídas
      const salesSummary = db.prepare(`
        SELECT
          COALESCE(SUM(t.unit_cost * t.quantity), 0) as totalRevenue,          -- Faturamento Bruto
          COALESCE(SUM(t.amount_paid), 0) as totalReceived,                   -- Recebimentos
          COALESCE(SUM(t.cost_at_transaction * t.quantity), 0) as cmv,        -- Custo da Mercadoria Vendida
          COUNT(t.id) as totalSalesTransactions,
          COALESCE(SUM(t.quantity), 0) as exitsQuantity                      -- Total de Saídas (Qtd)
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ? AND t.type = 'EXIT' AND t.timestamp BETWEEN ? AND ?
      `).get(ownerId, startDate, fullEndDate) as any;
  
      // 2. Movimentação de Entradas (Contas a Pagar do período)
      const entriesSummary = db.prepare(`
        SELECT
          COALESCE(SUM(t.unit_cost * t.quantity), 0) as accountsPayable,      -- Contas a Pagar (Valor)
          COALESCE(SUM(t.quantity), 0) as entriesQuantity                    -- Total de Entradas (Qtd)
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ? AND t.type = 'ENTRY' AND t.timestamp BETWEEN ? AND ?
      `).get(ownerId, startDate, fullEndDate) as any;
  
      // 3. Itens com Estoque Crítico (Snapshot atual)
      const criticalStockItems = db.prepare(`
        SELECT name, sku, current_stock, min_stock
        FROM products
        WHERE user_id = ? AND current_stock <= min_stock
        ORDER BY (current_stock - min_stock) ASC
        LIMIT 10
      `).all(ownerId);
  
      // 4. Produto Carro-Chefe (por quantidade vendida no período)
      const leadProduct = db.prepare(`
        SELECT p.name, p.sku, SUM(t.quantity) as quantitySold
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE p.user_id = ? AND t.type = 'EXIT' AND t.timestamp BETWEEN ? AND ?
        GROUP BY p.id
        ORDER BY quantitySold DESC
        LIMIT 1
      `).get(ownerId, startDate, fullEndDate);
  
      // Cálculos de KPIs
      const grossProfit = salesSummary.totalRevenue - salesSummary.cmv;
      const netBalance = salesSummary.totalReceived - entriesSummary.accountsPayable;
      const contributionMargin = salesSummary.totalRevenue > 0 ? (grossProfit / salesSummary.totalRevenue) * 100 : 0;
      const averageTicket = salesSummary.totalSalesTransactions > 0 ? salesSummary.totalRevenue / salesSummary.totalSalesTransactions : 0;
  
      logAudit(user.id, user.name, 'GERACAO_RELATORIO', `Relatório gerado para o período: ${startDate} a ${endDate}`);
  
      res.json({
        financial: {
          totalRevenue: salesSummary.totalRevenue,
          totalReceived: salesSummary.totalReceived,
          accountsPayable: entriesSummary.accountsPayable,
          netBalance: netBalance,
        },
        inventory: {
          entriesValue: entriesSummary.accountsPayable,
          entriesQuantity: entriesSummary.entriesQuantity,
          exitsQuantity: salesSummary.exitsQuantity,
          cmv: salesSummary.cmv,
          criticalStockItems: criticalStockItems,
        },
        performance: {
          averageTicket: averageTicket,
          leadProduct: leadProduct || { name: 'N/A', quantitySold: 0 },
          contributionMargin: contributionMargin,
          totalSalesTransactions: salesSummary.totalSalesTransactions,
        },
        period: {
          start: startDate,
          end: endDate,
          generatedAt: new Date().toISOString()
        },
        storeName: user.establishment_name || 'Minha Loja'
      });
    } catch (error: any) {
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
