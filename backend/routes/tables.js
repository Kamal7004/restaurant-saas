const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const { authMiddleware } = require('./auth');

const { checkRole } = require('./auth');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GET /api/tables
router.get('/', authMiddleware, checkRole(['admin', 'kitchen']), async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { rows: tables } = await db.query(
      'SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY table_number',
      [restaurantId]
    );
    res.json(tables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// GET /api/tables/public/:tableId
router.get('/public/:tableId', async (req, res) => {
  try {
    const { rows: tableRows } = await db.query('SELECT * FROM tables WHERE id = $1', [req.params.tableId]);
    const table = tableRows[0];
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const { rows: restaurantRows } = await db.query(
      'SELECT id, name, slug, logo_url, primary_color, secondary_color, welcome_text FROM restaurants WHERE id = $1', 
      [table.restaurant_id]
    );
    const restaurant = restaurantRows[0];
    res.json({ table, restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// POST /api/tables
router.post('/', authMiddleware, checkRole(['admin']), async (req, res) => {
  try {
    const { table_number, name, capacity } = req.body;
    const restaurantId = req.user.restaurant_id;
    const id = uuidv4();

    await db.query(
      'INSERT INTO tables (id, restaurant_id, table_number, name, capacity) VALUES ($1, $2, $3, $4, $5)',
      [id, restaurantId, table_number, name, capacity || 4]
    );

    const { rows } = await db.query('SELECT * FROM tables WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// POST /api/tables/:id/qrcode
router.post('/:id/qrcode', authMiddleware, checkRole(['admin']), async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const format = req.query.format || 'png'; // png or svg

    const { rows } = await db.query('SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2', [req.params.id, restaurantId]);
    const table = rows[0];
    if (!table) return res.status(404).json({ error: 'Table not found or unauthorized' });

    const url = `${FRONTEND_URL}/table/${table.id}`;
    
    if (format === 'svg') {
      const svg = await QRCode.toString(url, { type: 'svg', margin: 2 });
      res.set('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: 600, margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    await db.query('UPDATE tables SET qr_code_url = $1 WHERE id = $2', [qrCodeDataUrl, table.id]);
    res.json({ qr_code_url: qrCodeDataUrl, table_url: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// DELETE /api/tables/:id
router.delete('/:id', authMiddleware, checkRole(['admin']), async (req, res) => {
  try {
    const restaurantId = req.user.restaurant_id;
    await db.query('DELETE FROM tables WHERE id = $1 AND restaurant_id = $2', [req.params.id, restaurantId]);
    res.json({ message: 'Table removed successfuly' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

module.exports = router;

module.exports = router;
