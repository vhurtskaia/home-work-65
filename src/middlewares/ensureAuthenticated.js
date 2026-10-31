function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Для доступу до цього ресурсу потрібна авторизація.',
  });
}

module.exports = ensureAuthenticated;
