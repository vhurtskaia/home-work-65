const express = require('express');

const Item = require('../models/Item');
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');

const router = express.Router();

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

/**
 * GET /items
 * Reads all documents from the `items` collection in MongoDB Atlas and
 * returns them as JSON — intended for API consumers / the client-side
 * fetch that powers the HTML page below.
 */
router.get('/', async (req, res, next) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /items/page
 * Reads the same data from MongoDB and renders it as a simple server-side
 * HTML page — this is the "сторінка" (page) that displays the data read
 * from the database, as required by the assignment.
 */
router.get('/page', async (req, res, next) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 }).lean();

    const listHtml = items.length
      ? items
          .map(
            (item) => `
      <li>
        <strong>${escapeHtml(item.title)}</strong>
        ${item.description ? `— ${escapeHtml(item.description)}` : ''}
      </li>`
          )
          .join('')
      : '<li>Даних поки немає. Додайте запис через POST /items.</li>';

    res.type('html').send(`<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <title>Items — дані з MongoDB</title>
</head>
<body>
  <h1>Дані з MongoDB Atlas</h1>
  <p>Усього записів: ${items.length}</p>
  <ul>${listHtml}</ul>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

router.post('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'title є обов’язковим.' });
    }

    const item = await Item.create({ title, description });
    return res.status(201).json({ item });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
