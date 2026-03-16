const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-saas-secret-key-2024';

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based access control middleware
const checkRole = (roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Access denied' });
  }
  next();
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = 1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, restaurant_id: user.restaurant_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurant_id: user.restaurant_id }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/signup (Owner Signup)
router.post('/signup', async (req, res) => {
  try {
    const { ownerName, email, password, restaurantName, phone, address } = req.body;

    if (!ownerName || !email || !password || !restaurantName) {
      return res.status(400).json({ error: 'Owner name, email, password, and restaurant name are required' });
    }

    // Check if user exists
    const { rows: existingUser } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const userId = uuidv4();
    const restaurantId = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const slug = restaurantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    await db.transaction(async (client) => {
      // 1. Create Restaurant
      await client.query(
        'INSERT INTO restaurants (id, name, slug, phone, address, email) VALUES ($1, $2, $3, $4, $5, $6)',
        [restaurantId, restaurantName, slug, phone, address, email]
      );

      // 2. Create User (Admin)
      await client.query(
        'INSERT INTO users (id, restaurant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, restaurantId, ownerName, email, password_hash, 'admin']
      );
    });

    const token = jwt.sign(
      { id: userId, email, name: ownerName, role: 'admin', restaurant_id: restaurantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: userId, name: ownerName, email, role: 'admin', restaurant_id: restaurantId }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role, restaurant_id FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.checkRole = checkRole;
