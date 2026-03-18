const express = require('express');
const db = require('../db');
const { authMiddleware, checkRole } = require('./auth');

const router = express.Router();

// GET /api/restaurants/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM restaurants WHERE id = $1', [req.params.id]);
    const restaurant = rows[0];
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// PATCH /api/restaurants/branding (Admin Only)
router.patch('/branding', authMiddleware, checkRole(['admin']), async (req, res) => {
  try {
    const { primary_color, secondary_color, welcome_text, logo_url } = req.body;
    const restaurantId = req.user.restaurant_id;

    await db.query(
      `UPDATE restaurants SET 
        primary_color = COALESCE($1, primary_color), 
        secondary_color = COALESCE($2, secondary_color), 
        welcome_text = COALESCE($3, welcome_text),
        logo_url = COALESCE($4, logo_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [primary_color, secondary_color, welcome_text, logo_url, restaurantId]
    );

    res.json({ message: 'Branding updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// Kitchen User Management (Admin Only)
// GET /api/restaurants/kitchen-users
router.get('/kitchen-users', authMiddleware, checkRole(['admin']), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, is_active FROM users WHERE restaurant_id = $1 AND role = $2',
      [req.user.restaurant_id, 'kitchen']
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch kitchen users' });
  }
});

// POST /api/restaurants/kitchen-users
router.post('/kitchen-users', authMiddleware, checkRole(['admin']), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const restaurantId = req.user.restaurant_id;

    const { rows: existing } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const id = require('uuid').v4();
    const hash = require('bcryptjs').hashSync(password, 10);

    await db.query(
      'INSERT INTO users (id, restaurant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, restaurantId, name, email, hash, 'kitchen']
    );

    res.status(201).json({ message: 'Kitchen user created', user: { id, name, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create kitchen user' });
  }
});

// DELETE /api/restaurants/kitchen-users/:id
router.delete('/kitchen-users/:id', authMiddleware, checkRole(['admin']), async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1 AND restaurant_id = $2 AND role = $3', [
      req.params.id,
      req.user.restaurant_id,
      'kitchen'
    ]);
    res.json({ message: 'Kitchen user removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete kitchen user' });
  }
});

// Existing stats, etc...

module.exports = router;
