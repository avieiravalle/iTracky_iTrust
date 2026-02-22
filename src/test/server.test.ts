import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';
import { createApp } from '../../server';

describe('API Endpoints', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
  });

  describe('Auth', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          cep: '12345-678',
          establishment_name: 'Test Store',
          role: 'gestor'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('store_code');
    });

    it('should not register a user with an existing email', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          name: 'Another User',
          email: 'test@example.com',
          password: 'password123',
          cep: '12345-678',
          establishment_name: 'Another Store',
          role: 'gestor'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Este e-mail já está cadastrado');
    });

    it('should login successfully', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('Products', () => {
    let userId: number;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      userId = loginRes.body.id;
    });

    it('should create a product', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          user_id: userId,
          name: 'Test Product',
          sku: 'SKU123',
          min_stock: 10
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('should fetch products', async () => {
      const res = await request(app)
        .get(`/api/products?userId=${userId}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toBe('Test Product');
    });
  });

  describe('Transactions & Stats', () => {
    let userId: number;
    let productId: number;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/login')
        .send({ email: 'test@example.com', password: 'password123' });
      userId = loginRes.body.id;
      
      const prodRes = await request(app)
        .get(`/api/products?userId=${userId}`);
      productId = prodRes.body[0].id;
    });

    it('should record an ENTRY transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          product_id: productId,
          type: 'ENTRY',
          quantity: 20,
          unit_cost: 50
        });
      
      expect(res.status).toBe(200);
      
      const prodRes = await request(app).get(`/api/products?userId=${userId}`);
      const product = prodRes.body.find((p: any) => p.id === productId);
      expect(product.current_stock).toBe(20);
      expect(product.average_cost).toBe(50);
    });

    it('should record an EXIT transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          product_id: productId,
          type: 'EXIT',
          quantity: 5,
          unit_cost: 100,
          status: 'PAID'
        });
      
      expect(res.status).toBe(200);
      
      const prodRes = await request(app).get(`/api/products?userId=${userId}`);
      const product = prodRes.body.find((p: any) => p.id === productId);
      expect(product.current_stock).toBe(15);
    });

    it('should fetch stats', async () => {
      const res = await request(app)
        .get(`/api/stats?userId=${userId}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('realized_profit');
      expect(res.body.realized_profit).toBeGreaterThan(0);
    });
  });

  describe('Admin', () => {
    it('should login as admin', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'avieiravale@gmail.com',
          password: 'Anderson@46'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
    });

    it('should fetch all users for admin', async () => {
      const res = await request(app)
        .get('/api/admin/users');
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: any) => u.email === 'test@example.com')).toBe(true);
    });

    it('should reset the database', async () => {
      const res = await request(app)
        .post('/api/admin/reset-db');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const usersRes = await request(app).get('/api/admin/users');
      expect(usersRes.body.length).toBe(0);
    });
  });

  describe('Other Endpoints', () => {
    let gestorId: number;
    let storeCode: string;

    beforeAll(async () => {
      const regRes = await request(app)
        .post('/api/register')
        .send({
          name: 'Gestor Test',
          email: 'gestor@test.com',
          password: 'password',
          cep: '00000-000',
          establishment_name: 'Gestor Store',
          role: 'gestor'
        });
      gestorId = regRes.body.id;
      storeCode = regRes.body.store_code;
    });

    it('should validate store code', async () => {
      const res = await request(app).get(`/api/validate-store/${storeCode}`);
      expect(res.status).toBe(200);
      expect(res.body.establishment_name).toBe('Gestor Store');
    });

    it('should fetch product stats', async () => {
      const res = await request(app).get(`/api/product-stats?userId=${gestorId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should fetch monthly stats', async () => {
      const res = await request(app).get(`/api/monthly-stats?userId=${gestorId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should fetch receivables', async () => {
      const res = await request(app).get(`/api/receivables?userId=${gestorId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should toggle user status', async () => {
      const res = await request(app).post(`/api/admin/users/${gestorId}/toggle-status`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('inactive');
    });

    it('should register admin payment', async () => {
      const res = await request(app).post(`/api/admin/users/${gestorId}/payment`).send({ amount: 50 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fetch admin sales', async () => {
      const res = await request(app).get('/api/admin/sales');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should delete user', async () => {
      const res = await request(app).delete(`/api/admin/users/${gestorId}`);
      if (res.status !== 200) console.error('Delete user error:', res.body);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Collaborator Logic', () => {
    let gestorId: number;
    let storeCode: string;
    let collabId: number;

    beforeAll(async () => {
      const gestorRes = await request(app)
        .post('/api/register')
        .send({
          name: 'Gestor Collab',
          email: 'gestor_collab@test.com',
          password: 'password',
          cep: '00000-000',
          establishment_name: 'Collab Store',
          role: 'gestor'
        });
      gestorId = gestorRes.body.id;
      storeCode = gestorRes.body.store_code;

      const collabRes = await request(app)
        .post('/api/register')
        .send({
          name: 'Collab User',
          email: 'collab@test.com',
          password: 'password',
          cep: '00000-000',
          role: 'colaborador',
          store_code: storeCode
        });
      collabId = collabRes.body.id;
    });

    it('should allow collaborator to fetch gestor products', async () => {
      // Create product as gestor
      await request(app).post('/api/products').send({
        user_id: gestorId,
        name: 'Gestor Product',
        sku: 'GPROD1',
        min_stock: 5
      });

      const res = await request(app).get(`/api/products?userId=${collabId}`);
      expect(res.status).toBe(200);
      expect(res.body.some((p: any) => p.name === 'Gestor Product')).toBe(true);
    });

    it('should handle missing userId in stats', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(400);
    });

    it('should handle non-existent user in products', async () => {
      const res = await request(app).get('/api/products?userId=9999');
      expect(res.status).toBe(404);
    });

    it('should handle invalid store code in validation', async () => {
      const res = await request(app).get('/api/validate-store/INVALID');
      expect(res.status).toBe(404);
    });

    it('should handle invalid store code in registration', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          name: 'Fail Collab',
          email: 'fail@test.com',
          password: 'password',
          cep: '00000-000',
          role: 'colaborador',
          store_code: 'INVALID'
        });
      expect(res.status).toBe(400);
    });

    it('should record ENTRY with expiry date', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          product_id: 1, // Assuming product 1 exists from previous tests
          type: 'ENTRY',
          quantity: 10,
          unit_cost: 10,
          expiry_date: '2026-12-31'
        });
      expect(res.status).toBe(200);
      
      const prodRes = await request(app).get('/api/products?userId=1');
      const product = prodRes.body.find((p: any) => p.id === 1);
      expect(product.expiry_date).toBe('2026-12-31');
    });

    it('should pay a transaction', async () => {
      // Create a pending transaction
      await request(app).post('/api/transactions').send({
        product_id: 1,
        type: 'EXIT',
        quantity: 1,
        unit_cost: 100,
        status: 'PENDING'
      });
      
      const recRes = await request(app).get('/api/receivables?userId=1');
      const transId = recRes.body[0].id;
      
      const res = await request(app).post(`/api/transactions/${transId}/pay`).send({ amount: 50 });
      expect(res.status).toBe(200);
      
      const res2 = await request(app).post(`/api/transactions/${transId}/pay`).send({}); // Full pay
      expect(res2.status).toBe(200);
    });
  });
});
