const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// POST /api/orders
router.post('/', (req, res) => {
  try {
    const { table_id, customer_name, customer_notes, items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    const orderId = uuidv4();

    // Calculate order number
    const lastOrder = db.prepare(
      'SELECT MAX(order_number) as max_num FROM orders WHERE restaurant_id = ?'
    ).get(RESTAURANT_ID);
    const orderNumber = (lastOrder?.max_num || 0) + 1;

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const menuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(item.menu_item_id);
      if (!menuItem) continue;
      const qty = item.quantity || 1;
      subtotal += menuItem.price * qty;
      orderItems.push({
        id: uuidv4(),
        order_id: orderId,
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
        special_instructions: item.special_instructions || null,
      });
    }

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Insert order
    db.prepare(
      `INSERT INTO orders (id, restaurant_id, table_id, order_number, customer_name, customer_notes, subtotal, tax, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(orderId, RESTAURANT_ID, table_id, orderNumber, customer_name || null, customer_notes || null, subtotal, tax, total);

    // Insert order items
    const insertItem = db.prepare(
      `INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const oi of orderItems) {
      insertItem.run(oi.id, oi.order_id, oi.menu_item_id, oi.name, oi.price, oi.quantity, oi.special_instructions);
    }

    // Fetch complete order
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    // Get table info
    if (order.table_id) {
      const table = db.prepare('SELECT table_number, name FROM tables WHERE id = ?').get(order.table_id);
      if (table) {
        order.table_number = table.table_number;
        order.table_name = table.name;
      }
    }

    // Emit socket event
    req.io.to(`restaurant_${RESTAURANT_ID}`).emit('NEW_ORDER', order);
    req.io.to(`kitchen_${RESTAURANT_ID}`).emit('NEW_ORDER', order);

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders
router.get('/', authMiddleware, (req, res) => {
  try {
    const status = req.query.status;
    let query = `SELECT o.*, t.table_number, t.name as table_name FROM orders o
                 LEFT JOIN tables t ON o.table_id = t.id
                 WHERE o.restaurant_id = ?`;
    const params = [RESTAURANT_ID];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    query += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(query).all(...params);
    for (const order of orders) {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/active
router.get('/active', (req, res) => {
  try {
    const orders = db.prepare(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.restaurant_id = ? AND o.status IN ('pending', 'preparing', 'ready')
       ORDER BY o.created_at ASC`
    ).all(RESTAURANT_ID);

    for (const order of orders) {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = ?`
    ).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', authMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'served') updates.served_at = new Date().toISOString();

    db.prepare(
      "UPDATE orders SET status = ?, updated_at = datetime('now')" + (status === 'served' ? ", served_at = datetime('now')" : '') + " WHERE id = ?"
    ).run(status, req.params.id);

    const order = db.prepare(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = ?`
    ).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    // Emit socket event
    req.io.to(`restaurant_${RESTAURANT_ID}`).emit('ORDER_UPDATED', order);
    req.io.to(`kitchen_${RESTAURANT_ID}`).emit('ORDER_UPDATED', order);
    if (order.table_id) {
      req.io.to(`table_${order.table_id}`).emit('ORDER_UPDATED', order);
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
