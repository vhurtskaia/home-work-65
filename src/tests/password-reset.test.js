const request = require('supertest');

// Capture the reset link instead of actually sending an email.
jest.mock('../utils/mailer', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'mocked' }),
}));

const { sendPasswordResetEmail } = require('../utils/mailer');
const app = require('../app');

function extractTokenFromResetUrl(resetUrl) {
  return new URL(resetUrl).searchParams.get('token');
}

describe('Forgot / reset password flow', () => {
  const credentials = { email: 'reset.user@example.com', password: 'oldpassword1' };

  beforeAll(async () => {
    await request(app).post('/auth/register').send(credentials);
  });

  afterEach(() => {
    sendPasswordResetEmail.mockClear();
  });

  test('POST /auth/forgot-password sends a reset email for an existing user', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: credentials.email });

    expect(res.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const [toEmail, resetUrl] = sendPasswordResetEmail.mock.calls[0];
    expect(toEmail).toBe(credentials.email);
    expect(resetUrl).toMatch(/\/auth\/reset-password\?token=/);
  });

  test('POST /auth/forgot-password responds the same generic message for an unknown email (no enumeration)', async () => {
    const known = await request(app).post('/auth/forgot-password').send({ email: credentials.email });
    const unknown = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'does-not-exist@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    // No email should be sent for an email that isn't registered.
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  test('POST /auth/reset-password with an invalid token returns 400', async () => {
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'newpassword1' });

    expect(res.status).toBe(400);
  });

  test('a valid reset token sets a new password that can then be used to log in', async () => {
    await request(app).post('/auth/forgot-password').send({ email: credentials.email });
    const [, resetUrl] = sendPasswordResetEmail.mock.calls[0];
    const token = extractTokenFromResetUrl(resetUrl);

    const newPassword = 'brandNewPassword1';
    const resetRes = await request(app).post('/auth/reset-password').send({ token, password: newPassword });
    expect(resetRes.status).toBe(200);

    // The old password must no longer work.
    const oldLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(oldLoginRes.status).toBe(401);

    // The new password must work.
    const newLoginRes = await request(app)
      .post('/auth/login')
      .send({ email: credentials.email, password: newPassword });
    expect(newLoginRes.status).toBe(200);

    // The token must be single-use and now be rejected.
    const reuseRes = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'anotherPassword1' });
    expect(reuseRes.status).toBe(400);
  });
});
