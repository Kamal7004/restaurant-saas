const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();
const RESTAURANT_ID = process.env.RESTAURANT_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GET /api/tables
router.get('/', authMiddleware, (req, res) => {
  try {
    const tables = db.prepare(
      'SELECT * FROM tables WHERE restaurant_id = ? ORDER BY table_number'
    ).all(RESTAURANT_ID);
    res.json(tables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// GET /api/tables/public/:tableId
router.get('/public/:tableId', (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.tableId);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(table.restaurant_id);
    res.json({ table, restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// POST /api/tables
router.post('/', authMiddleware, (req, res) => {
  try {
    const { table_number, name, capacity } = req.body;
    const id = uuidv4();
    db.prepare(
      'INSERT INTO tables (id, restaurant_id, table_number, name, capacity) VALUES (?, ?, ?, ?, ?)'
    ).run(id, RESTAURANT_ID, table_number, name, capacity || 4);
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
    res.status(201).json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// POST /api/tables/:id/qrcode
router.post('/:id/qrcode', authMiddleware, async (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const url = `${FRONTEND_URL}/table/${table.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    db.prepare('UPDATE tables SET qr_code_url = ? WHERE id = ?').run(qrCodeDataUrl, table.id);
    res.json({ qr_code_url: qrCodeDataUrl, table_url: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// GET /api/tables/:id/qrcode/data
router.get('/:id/qrcode/data', async (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const url = `${FRONTEND_URL}/table/${table.id}`;
    const qrCodeDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    res.json({ qr_code_url: qrCodeDataUrl, table_url: url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

module.exports = router;
