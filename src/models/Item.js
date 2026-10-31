const { mongoose } = require('../config/db');

/**
 * Generic "Item" document stored in the `items` collection of your
 * MongoDB Atlas database. Represents whatever data you want to read and
 * display (e.g. articles, products, notes) — swap/extend the fields for
 * your own domain as needed; the read route (`GET /items`) stays the same.
 */
const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
