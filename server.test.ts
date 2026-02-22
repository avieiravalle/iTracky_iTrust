import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp, closeDb } from './server';
import { Express } from 'express';

describe('API Integration Tests', () => {
  let app: Express;
  const timestamp = Date.now();
  const testUser = {
    name: 'Test User',
    email: `test${timestamp}@example.com`,
    password: 'password123',
    cep: '00000-000',
    establishment_name: 'Test Store',
    role: 'gestor'
  };
  let authToken = '';

  beforeAll(async () => {
    // Configura o ambiente para teste (banco em memória)
    process.env.NODE_ENV = 'test';
    app = await createApp();
  });

  afterAll(() => {
    closeDb();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/register')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('store_code');
    // Em ambiente de teste, o status deve ser 'active' (conforme lógica do server.ts)
    expect(res.body.status).toBe('active');
  });

  it('should login the user and return a token', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testUser.email);
    
    authToken = res.body.token;
  });

  it('should fetch products with authentication', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fail to fetch products without token', async () => {
    const res = await request(app)
      .get('/api/products');

    expect(res.status).toBe(401);
  });
});