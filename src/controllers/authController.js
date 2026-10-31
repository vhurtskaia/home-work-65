const passport = require('passport');

const userStore = require('../models/User');
const { sendPasswordResetEmail } = require('../utils/mailer');

const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 60;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

/** POST /auth/register */
async function register(req, res) {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email та password є обов’язковими.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль має містити щонайменше 6 символів.' });
  }

  try {
    const user = await userStore.create({ email, password, displayName });

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Реєстрація успішна, але автоматичний вхід не вдався.' });
      }
      return res.status(201).json({ message: 'Реєстрація успішна.', user });
    });
  } catch (err) {
    if (err.code === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Внутрішня помилка сервера.' });
  }
}

/** POST /auth/login */
function login(req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: (info && info.message) || 'Авторизація не вдалася.' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ message: 'Вхід виконано успішно.', user: userStore.toSafeObject(user) });
    });
  })(req, res, next);
}

/** POST /auth/logout */
function logout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie('sid');
      return res.json({ message: 'Вихід виконано успішно.' });
    });
  });
}

/** GET /auth/me */
function me(req, res) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(200).json({ user: null });
  }
  return res.json({ user: userStore.toSafeObject(req.user) });
}

/** POST /auth/forgot-password */
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email є обов’язковим.' });
  }

  const genericResponse = {
    message:
      'Якщо обліковий запис з такою електронною поштою існує, на нього надіслано лист з інструкціями.',
  };

  try {
    const user = await userStore.findByEmail(email);
    if (user) {
      const rawToken = await userStore.setResetToken(user, RESET_TOKEN_TTL_MINUTES);
      const resetUrl = `${APP_BASE_URL}/auth/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }
    return res.json(genericResponse);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Внутрішня помилка сервера.' });
  }
}

/** POST /auth/reset-password */
async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'token та password є обов’язковими.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль має містити щонайменше 6 символів.' });
  }

  try {
    const user = await userStore.findByValidResetToken(token);
    if (!user) {
      return res.status(400).json({ error: 'Токен недійсний або термін його дії минув.' });
    }

    await userStore.setPassword(user, password);
    return res.json({ message: 'Пароль успішно оновлено. Тепер ви можете увійти.' });
  } catch (err) {
    return res.status(500).json({ error: 'Внутрішня помилка сервера.' });
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
};
