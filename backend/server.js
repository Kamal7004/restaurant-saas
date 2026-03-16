require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const tableRoutes = require('./routes/tables');
const restaurantRoutes = require('./routes/restaurants');
const superadminRoutes = require('./routes/superadmin');

const app = express();
const server = http.createServer(app);

const io = new Server(server);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "connect-src": ["'self'", "wss:", "ws:"],
    },
  },
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend Static Files
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '../frontend/out');
app.use(express.static(FRONTEND_DIR));

// Attach io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/superadmin', superadminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join_restaurant', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
    console.log(`Socket ${socket.id} joined restaurant_${restaurantId}`);
  });

  socket.on('join_kitchen', (restaurantId) => {
    socket.join(`kitchen_${restaurantId}`);
    console.log(`Kitchen socket ${socket.id} joined kitchen_${restaurantId}`);
  });

  socket.on('join_table', ({ restaurantId, tableId }) => {
    socket.join(`table_${tableId}`);
    console.log(`Table socket ${socket.id} joined table_${tableId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Serve index.html for any unknown routes (SPA routing)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  console.error(`[${new Date().toISOString()}] ERROR:`, {
    message,
    status,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Restaurant SaaS API running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📂 Serving frontend from: ${FRONTEND_DIR}\n`);
});

module.exports = { app, io };
