const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// GET /api/menu - public menu with categories and items
router.get('/', async (req, res) => {
  try {
    const restaurantId = req.query.restaurant_id || RESTAURANT_ID;
    const { rows: categories } = await db.query(
      'SELECT * FROM categories WHERE restaurant_id = $1 AND is_active = 1 ORDER BY sort_order',
      [restaurantId]
    );

    const { rows: items } = await db.query(
      'SELECT * FROM menu_items WHERE restaurant_id = $1 AND is_available = 1 ORDER BY sort_order',
      [restaurantId]
    );

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
router.get('/items', async (req, res) => {
  try {
    const restaurantId = req.query.restaurant_id || RESTAURANT_ID;
    const { rows: items } = await db.query(
      `SELECT mi.*, c.name as category_name FROM menu_items mi
       LEFT JOIN categories c ON mi.category_id = c.id
       WHERE mi.restaurant_id = $1 ORDER BY mi.sort_order`,
      [restaurantId]
    );
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// POST /api/menu/items
router.post('/items', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, category_id, is_available, is_featured, prep_time_minutes, image_url } = req.body;
    const id = uuidv4();
    await db.query(
      `INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_available, is_featured, prep_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, RESTAURANT_ID, category_id, name, description, price, image_url || null, is_available ? 1 : 0, is_featured ? 1 : 0, prep_time_minutes || 15]
    );

    const { rows } = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/menu/items/:id
router.put('/items/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, price, category_id, is_available, is_featured, prep_time_minutes, image_url } = req.body;
    await db.query(
      `UPDATE menu_items SET name = $1, description = $2, price = $3, category_id = $4, image_url = $5,
       is_available = $6, is_featured = $7, prep_time_minutes = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9`,
      [name, description, price, category_id, image_url || null, is_available ? 1 : 0, is_featured ? 1 : 0, prep_time_minutes || 15, req.params.id]
    );

    const { rows } = await db.query('SELECT * FROM menu_items WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/menu/items/:id
router.delete('/items/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM menu_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// GET /api/menu/categories
router.get('/categories', async (req, res) => {
  try {
    const restaurantId = req.query.restaurant_id || RESTAURANT_ID;
    const { rows: categories } = await db.query(
      'SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY sort_order',
      [restaurantId]
    );
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/menu/categories
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const id = uuidv4();
    await db.query(
      `INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES ($1, $2, $3, $4, $5)`,
      [id, RESTAURANT_ID, name, description, sort_order || 0]
    );
    const { rows } = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

module.exports = router;
