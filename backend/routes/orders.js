const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const { table_id, customer_name, customer_notes, items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item' });
    }

    const order = await db.transaction(async (client) => {
      // 1. Validate Table and get Restaurant ID
      let restaurantId = RESTAURANT_ID; // Fallback
      if (table_id) {
        const { rows: tableRows } = await client.query('SELECT restaurant_id FROM tables WHERE id = $1', [table_id]);
        if (tableRows.length > 0) {
          restaurantId = tableRows[0].restaurant_id;
        } else {
          throw new Error('Invalid table_id');
        }
      }

      // 2. Fetch all menu items for this order in one query
      const menuItemIds = items.map(i => i.menu_item_id);
      const { rows: menuItems } = await client.query(
        'SELECT * FROM menu_items WHERE id = ANY($1)',
        [menuItemIds]
      );
      
      const menuItemMap = new Map(menuItems.map(mi => [mi.id, mi]));

      // 3. Calculate order number (Atomic within transaction)
      // Use SELECT ... FOR UPDATE to prevent race conditions in numbering
      await client.query('SELECT 1 FROM restaurants WHERE id = $1 FOR UPDATE', [restaurantId]);
      const { rows: orderNumRows } = await client.query(
        'SELECT COALESCE(MAX(order_number), 0) as max_num FROM orders WHERE restaurant_id = $1',
        [restaurantId]
      );
      const orderNumber = parseInt(orderNumRows[0].max_num) + 1;

      // 4. Create Order
      const orderId = uuidv4();
      let subtotal = 0;
      const orderItemsToInsert = [];

      for (const item of items) {
        const menuItem = menuItemMap.get(item.menu_item_id);
        if (!menuItem) {
          throw new Error(`Menu item not found: ${item.menu_item_id}`);
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
        [orderId, restaurantId, table_id || null, orderNumber, customer_name || null, customer_notes || null, subtotal, tax, total]
      );
      const insertedOrder = insertedOrderRows[0];

      // 5. Insert Order Items (Multiple Insertion via loop, or could be unnest)
      for (const oi of orderItemsToInsert) {
        await client.query(
          `INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, special_instructions)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [oi.id, oi.order_id, oi.menu_item_id, oi.name, oi.price, oi.quantity, oi.special_instructions]
        );
      }

      // Fetch final state with table info
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
    res.status(err.message.includes('not found') ? 400 : 500).json({ 
      error: err.message || 'Failed to create order' 
    });
  }
});

// GET /api/orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const status = req.query.status;
    let queryText = `SELECT o.*, t.table_number, t.name as table_name FROM orders o
                     LEFT JOIN tables t ON o.table_id = t.id
                     WHERE o.restaurant_id = $1`;
    const params = [RESTAURANT_ID];

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

// GET /api/orders/active
router.get('/active', async (req, res) => {
  try {
    const { rows: orders } = await db.query(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.restaurant_id = $1 AND o.status IN ('pending', 'preparing', 'ready')
       ORDER BY o.created_at ASC`,
      [RESTAURANT_ID]
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

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = $1`,
      [req.params.id]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = items;
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let updateQuery = "UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP";
    const params = [status, req.params.id];
    
    if (status === 'served') {
      updateQuery += ", served_at = CURRENT_TIMESTAMP";
    }
    updateQuery += " WHERE id = $2";

    await db.query(updateQuery, params);

    const { rows } = await db.query(
      `SELECT o.*, t.table_number, t.name as table_name FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = $1`,
      [req.params.id]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const { rows: items } = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    order.items = items;

    // Emit socket events
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
