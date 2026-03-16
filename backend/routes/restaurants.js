const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /api/restaurants/:id
router.get('/:id', (req, res) => {
  try {
    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// GET /api/restaurants/:id/stats
router.get('/:id/stats', authMiddleware, (req, res) => {
  try {
    const restaurantId = req.params.id;
    const today = new Date().toISOString().split('T')[0];

    const todayOrders = db.prepare(
      `SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND date(created_at) = date('now')`
    ).get(restaurantId);

    const activeOrders = db.prepare(
      `SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND status IN ('pending', 'preparing', 'ready')`
    ).get(restaurantId);

    const todayRevenue = db.prepare(
      `SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE restaurant_id = ? AND date(created_at) = date('now') AND status != 'cancelled'`
    ).get(restaurantId);

    const pendingOrders = db.prepare(
      `SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND status = 'pending'`
    ).get(restaurantId);

    res.json({
      today_orders: String(todayOrders?.count || 0),
      active_orders: String(activeOrders?.count || 0),
      today_revenue: String(todayRevenue?.total || 0),
      pending_orders: String(pendingOrders?.count || 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
