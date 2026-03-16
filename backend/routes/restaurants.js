const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');

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

// GET /api/restaurants/:id/stats
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const restaurantId = req.params.id;

    const { rows: todayOrdersRows } = await db.query(
      `SELECT COUNT(*) as count FROM orders WHERE restaurant_id = $1 AND created_at::date = CURRENT_DATE`,
      [restaurantId]
    );

    const { rows: activeOrdersRows } = await db.query(
      `SELECT COUNT(*) as count FROM orders WHERE restaurant_id = $1 AND status IN ('pending', 'preparing', 'ready')`,
      [restaurantId]
    );

    const { rows: todayRevenueRows } = await db.query(
      `SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE restaurant_id = $1 AND created_at::date = CURRENT_DATE AND status != 'cancelled'`,
      [restaurantId]
    );

    const { rows: pendingOrdersRows } = await db.query(
      `SELECT COUNT(*) as count FROM orders WHERE restaurant_id = $1 AND status = 'pending'`,
      [restaurantId]
    );

    res.json({
      today_orders: String(todayOrdersRows[0]?.count || 0),
      active_orders: String(activeOrdersRows[0]?.count || 0),
      today_revenue: String(todayRevenueRows[0]?.total || 0),
      pending_orders: String(pendingOrdersRows[0]?.count || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
