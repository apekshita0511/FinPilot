import request from 'supertest';

import { app, registerUser } from './testUtils';

describe('POST /api/auth/register', () => {
  it('registers a new user and never returns the password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'alice@example.com', name: 'Alice' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('seeds default categories for the new user', async () => {
    const { agent } = await registerUser();
    const res = await agent.get('/api/categories');
    expect(res.body.categories.length).toBeGreaterThan(0);
    expect(res.body.categories.map((c: { name: string }) => c.name)).toContain('Food');
  });

  it('rejects a duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Dup' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Dup Again' });

    expect(res.status).toBe(409);
  });

  it('rejects a duplicate email regardless of casing', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'Case@Example.com', password: 'password123', name: 'Case' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'case@example.com', password: 'password123', name: 'Case Again' });

    expect(res.status).toBe(409);
  });

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@example.com', password: 'short', name: 'Weak' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  it('rejects invalid credentials for a nonexistent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('rejects the wrong password', async () => {
    await registerUser({ email: 'bob@example.com', password: 'correctpassword' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('logs in with correct credentials and sets auth cookies', async () => {
    await registerUser({ email: 'carol@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

describe('GET /api/auth/me', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user when authenticated', async () => {
    const { agent, user } = await registerUser({ email: 'dave@example.com' });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session so /me is rejected afterward', async () => {
    const { agent } = await registerUser();
    await agent.post('/api/auth/logout');
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('protected routes without authentication', () => {
  it('rejects GET /api/accounts', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
  });

  it('rejects GET /api/transactions', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });
});
