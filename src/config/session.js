const session = require('express-session');

const useSecureCookies = process.env.USE_SECURE_COOKIES === 'true';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

module.exports = session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: 'lax',
    maxAge: ONE_DAY_MS,
  },
});
