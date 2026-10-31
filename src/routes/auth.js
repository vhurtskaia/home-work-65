const express = require('express');
const passport = require('passport');

const authController = require('../controllers/authController');

const router = express.Router();

// --- Local (email + password) authentication ---
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

// --- Forgot / reset password ---
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// --- Google OAuth2 (only active when GOOGLE_CLIENT_ID/SECRET are set) ---
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/google/failure',
    successRedirect: '/protected',
  })
);

router.get('/google/failure', (req, res) => {
  res.status(401).json({ error: 'Авторизація через Google не вдалася.' });
});

module.exports = router;
