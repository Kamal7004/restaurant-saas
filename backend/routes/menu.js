const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// GET /api/menu - public menu with categories and items
router.get('/', (req, res) => {
  try {
    const restaurantId = req.query.restaurant_id || RESTAURANT_ID;
    const categories = db.prepare(
      'SELECT * FROM categories WHERE restaurant_id = ? AND is_active = 1 ORDER BY sort_order'
    ).all(restaurantId);

    const items = db.prepare(
      'SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY sort_order'
    ).all(restaurantId);

    const menu = categories.map(cat => ({
      ...cat,
      items: items.filter(item => item.category_id === cat.id)
    }));

    res.json(menu);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// GET /api/menu/items
router.get('/items', (req, res) => {
  try {
    const restaurantId = req.query.restaurant_id || RESTAURANT_ID;
    const items = db.prepare(
      `SELECT mi.*, c.name as category_name FROM menu_items mi
       LEFT JOIN categories c ON mi.category_id = c.id
       WHERE mi.restaurant_id = ? ORDER BY mi.sort_order`
    ).all(restaurantId);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// POST /api/menu/items
router.post('/items', authMiddleware, (req, res) => {
  try {
    const { name, description, price, category_id, is_available, is_featured, prep_time_minutes, image_url } = req.body;
    const id = uuidv4();
    db.prepare(
      `INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, is_featured, prep_time_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, RESTAURANT_ID, category_id, name, description, price, image_url || null, is_available ? 1 : 0, is_featured ? 1 : 0, prep_time_minutes || 15);

    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/menu/items/:id
router.put('/items/:id', authMiddleware, (req, res) => {
  try {
    const { name, description, price, category_id, is_available, is_featured, prep_time_minutes, image_url } = req.body;
    db.prepare(
      `UPDATE menu_items SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?,
       is_available = ?, is_featured = ?, prep_time_minutes = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(name, description, price, category_id, image_url || null, is_available ? 1 : 0, is_featured ? 1 : 0, prep_time_minutes || 15, req.params.id);

    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/menu/items/:id
router.delete('/items/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// GET /api/menu/categories
router.get('/categories', (req, res) => {
  try {
    const restaurantId = req.query.restaurant_id || RESTAURANT_ID;
    const categories = db.prepare(
      'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY sort_order'
    ).all(restaurantId);
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/menu/categories
router.post('/categories', authMiddleware, (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const id = uuidv4();
    db.prepare(
      `INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`
    ).run(id, RESTAURANT_ID, name, description, sort_order || 0);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

module.exports = router;
