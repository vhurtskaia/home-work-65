const express = require('express');

const ensureAuthenticated = require('../middlewares/ensureAuthenticated');
const userStore = require('../models/User');

const router = express.Router();

router.get('/', ensureAuthenticated, (req, res) => {
  res.json({
    message: 'Вітаємо! Це захищений ресурс.',
    user: userStore.toSafeObject(req.user),
  });
});

module.exports = router;
