const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
const { checkRole } = require('./auth');

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const { table_id, customer_name, customer_notes, items, restaurant_id } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    const order = await db.transaction(async (client) => {
      // 1. Validate Table and get Restaurant ID
      let targetRestaurantId = restaurant_id;
      if (table_id) {
        const { rows: tableRows } = await client.query('SELECT restaurant_id FROM tables WHERE id = $1', [table_id]);
        if (tableRows.length > 0) {
          targetRestaurantId = tableRows[0].restaurant_id;
        } else {
          throw new Error('Invalid table_id');
        }
      }

      if (!targetRestaurantId) {
        throw new Error('Restaurant ID is required');
      }

      // 2. Fetch all menu items for this order in one query
      const menuItemIds = items.map(i => i.menu_item_id);
      const { rows: menuItems } = await client.query(
        'SELECT * FROM menu_items WHERE id = ANY($1) AND restaurant_id = $2',
        [menuItemIds, targetRestaurantId]
      );
      
      const menuItemMap = new Map(menuItems.map(mi => [mi.id, mi]));

      // 3. Calculate order number (Atomic within transaction)
      await client.query('SELECT 1 FROM restaurants WHERE id = $1 FOR UPDATE', [targetRestaurantId]);
      const { rows: orderNumRows } = await client.query(
        'SELECT COALESCE(MAX(order_number), 0) as max_num FROM orders WHERE restaurant_id = $1',
        [targetRestaurantId]
      );
      const orderNumber = parseInt(orderNumRows[0].max_num) + 1;

      // 4. Create Order
      const orderId = uuidv4();
      let subtotal = 0;
      const orderItemsToInsert = [];

      for (const item of items) {
        const menuItem = menuItemMap.get(item.menu_item_id);
        if (!menuItem) {
          throw new Error(`Menu item not found or unauthorized: ${item.menu_item_id}`);
        }

        const qty = parseInt(item.quantity) || 1;
        const price = parseFloat(menuItem.price);
        subtotal += price * qty;

        orderItemsToInsert.push({
          id: uuidv4(),
          order_id: orderId,
          menu_item_id: menuItem.id,
          name: menuItem.name,
          price: price,
          quantity: qty,
          special_instructions: item.special_instructions || null
        });
      }

      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      // Insert Order
      const { rows: insertedOrderRows } = await client.query(
        `INSERT INTO orders (id, restaurant_id, table_id, order_number, customer_name, customer_notes, subtotal, tax, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [orderId, targetRestaurantId, table_id || null, orderNumber, customer_name || null, customer_notes || null, subtotal, tax, total]
      );
      const insertedOrder = insertedOrderRows[0];

      // 5. Insert Order Items
      for (const oi of orderItemsToInsert) {
        await client.query(
          `INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [oi.id, oi.order_id, oi.menu_item_id, oi.name, oi.price, oi.quantity, oi.special_instructions]
        );
      }

      const { rows: infoRows } = await client.query(
        `SELECT t.table_number, t.name as table_name FROM tables t WHERE t.id = $1`,
        [table_id]
      );
      
      return {
        ...insertedOrder,
        items: orderItemsToInsert,
        table_number: infoRows[0]?.table_number,
        table_name: infoRows[0]?.table_name
      };
    });

    // 6. Emit socket events
    req.io.to(`restaurant_${order.restaurant_id}`).emit('NEW_ORDER', order);
    req.io.to(`kitchen_${order.restaurant_id}`).emit('NEW_ORDER', order);

    res.status(201).json(order);
  } catch (err) {
    console.error('ORDER_ERROR:', err.message);
    res.status(err.message.includes('not found') || err.message.includes('required') ? 400 : 500).json({ 
      error: err.message || 'Failed to create order' 
    });
  }
});

// POST /api/orders/call-waiter
router.post('/call-waiter', async (req, res) => {
  try {
    const { table_id } = req.body;
    if (!table_id) return res.status(400).json({ error: 'table_id is required' });

    const { rows } = await db.query('SELECT restaurant_id, table_number FROM tables WHERE id = $1', [table_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Table not found' });

    const { restaurant_id, table_number } = rows[0];

    req.io.to(`restaurant_${restaurant_id}`).emit('WAITER_CALL', { table_id, table_number, timestamp: new Date() });
    req.io.to(`kitchen_${restaurant_id}`).emit('WAITER_CALL', { table_id, table_number, timestamp: new Date() });

    res.json({ message: 'Waiter called successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to call waiter' });
  }
});

// GET /api/orders (Kitchen/Admin Only)
router.get('/', authMiddleware, checkRole(['admin', 'kitchen']), async (req, res) => {
  try {
    const { status } = req.query;
    const restaurantId = req.user.restaurant_id;

    let queryText = `SELECT o.*, t.table_number, t.name as table_name FROM orders o
                     LEFT JOIN tables t ON o.table_id = t.id
                     WHERE o.restaurant_id = $1`;
    const params = [restaurantId];

    if (status) {
      queryText += ' AND o.status = $2';
      params.push(status);
    }
    queryText += ' ORDER BY o.created_at DESC';

    const { rows: orders } = await db.query(queryText, params);
    for (const order of orders) {
      const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/active (Kitchen Only)
router.get('/active', authMiddleware, checkRole(['admin', 'kitchen']), async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { rows: orders } = await db.query(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.restaurant_id = $1 AND o.status IN ('pending', 'preparing', 'ready')
       ORDER BY o.created_at ASC`,
      [restaurantId]
    );

    for (const order of orders) {
      const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
});

// PUT /api/orders/:id/status (Kitchen/Admin Only)
router.put('/:id/status', authMiddleware, checkRole(['admin', 'kitchen']), async (req, res) => {
  try {
    const { status } = req.body;
    const restaurantId = req.user.restaurant_id;
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { rowCount } = await db.query(
      "UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND restaurant_id = $3",
      [status, req.params.id, restaurantId]
    );

    if (rowCount === 0) return res.status(404).json({ error: 'Order not found or unauthorized' });

    const { rows } = await db.query(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = $1`,
      [req.params.id]
    );
    const order = rows[0];
    const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = items;

    // Emit socket events
    req.io.to(`restaurant_${restaurantId}`).emit('ORDER_UPDATED', order);
    req.io.to(`kitchen_${restaurantId}`).emit('ORDER_UPDATED', order);
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

module.exports = router;
