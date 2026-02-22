import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp, closeDb } from '../server';

// Mock do Nodemailer para não tentar enviar e-mails reais
vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: vi.fn().mockResolvedValue(true)
    })
  }
}));

describe('API do Servidor', () => {
  let app: any;
  let userToken: string;

  beforeAll(async () => {
    // Define ambiente de teste para usar banco em memória
    process.env.NODE_ENV = 'test';
    app = await createApp();
  });

  afterAll(() => {
    closeDb();
  });

  it('Deve registrar um novo gestor', async () => {
    const res = await request(app).post('/api/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      cep: '01001000',
      establishment_name: 'Test Store',
      role: 'gestor'
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('store_code');
  });

  it('Deve fazer login e receber um token JWT', async () => {
    const res = await request(app).post('/api/login').send({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
    userToken = res.body.token;
  });

  it('Deve criar um produto (Rota Protegida)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Produto Teste',
        sku: 'SKU-123',
        min_stock: 10
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('Deve listar produtos criados', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('name', 'Produto Teste');
  });

  it('Não deve permitir acesso sem token', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('Deve validar código de loja existente', async () => {
    // Primeiro pegamos o código do usuário criado
    const loginRes = await request(app).post('/api/login').send({
      email: 'test@example.com',
      password: 'password123'
    });
    const storeCode = loginRes.body.user.store_code;

    const res = await request(app).get(`/api/validate-store/${storeCode}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('establishment_name', 'Test Store');
  });
});