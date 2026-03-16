const express = require('express');
const db = require('../db');
const { authMiddleware, checkRole } = require('./auth');

const router = express.Router();

// Apply Super Admin check to all routes
router.use(authMiddleware, checkRole(['super_admin']));

// GET /api/superadmin/stats
router.get('/stats', async (req, res) => {
  try {
    const { rows: resCount } = await db.query('SELECT COUNT(*) as count FROM restaurants');
    const { rows: orderCount } = await db.query('SELECT COUNT(*) as count FROM orders');
    const { rows: revenue } = await db.query("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'cancelled'");
    
    res.json({
      total_restaurants: parseInt(resCount[0].count),
      total_orders: parseInt(orderCount[0].count),
      total_revenue: parseFloat(revenue[0].total)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

// GET /api/superadmin/restaurants
router.get('/restaurants', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, u.name as owner_name, u.email as owner_email,
      (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id) as total_orders
      FROM restaurants r
      LEFT JOIN users u ON u.restaurant_id = r.id AND u.role = 'admin'
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// PATCH /api/superadmin/restaurants/:id/status
router.patch('/restaurants/:id/status', async (req, res) => {
  try {
    const { is_active } = req.body;
    await db.query('UPDATE restaurants SET is_active = $1 WHERE id = $2', [is_active, req.params.id]);
    res.json({ message: 'Restaurant status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update restaurant status' });
  }
});

module.exports = router;
