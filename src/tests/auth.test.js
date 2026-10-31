const request = require('supertest');

const app = require('../app');

describe('Auth flow (register / login / logout / protected)', () => {
  const credentials = { email: 'test.user@example.com', password: 'secret123' };

  test('GET /protected without a session returns 401', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });

  test('POST /auth/register creates a user, logs them in and returns 201', async () => {
    const res = await request(app).post('/auth/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: credentials.email });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('POST /auth/register with an already-used email returns 409', async () => {
    const res = await request(app).post('/auth/register').send(credentials);
    expect(res.status).toBe(409);
  });

  test('POST /auth/register rejects a too-short password with 400', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'short.pass@example.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('POST /auth/login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('POST /auth/login with unknown email returns 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });
    expect(res.status).toBe(401);
  });

  test('a logged-in session can reach the protected route, /auth/me and then log out', async () => {
    const agent = request.agent(app); // keeps the "sid" cookie across requests

    const loginRes = await agent.post('/auth/login').send(credentials);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user).toMatchObject({ email: credentials.email });

    const meRes = await agent.get('/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user).toMatchObject({ email: credentials.email });

    const protectedRes = await agent.get('/protected');
    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.user).toMatchObject({ email: credentials.email });

    const logoutRes = await agent.post('/auth/logout');
    expect(logoutRes.status).toBe(200);

    const protectedAfterLogoutRes = await agent.get('/protected');
    expect(protectedAfterLogoutRes.status).toBe(401);

    const meAfterLogoutRes = await agent.get('/auth/me');
    expect(meAfterLogoutRes.status).toBe(200);
    expect(meAfterLogoutRes.body.user).toBeNull();
  });
});
