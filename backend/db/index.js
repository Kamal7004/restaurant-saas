const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'restaurant.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      logo_url TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      timezone TEXT DEFAULT 'UTC',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'kitchen', 'staff')),
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
      table_number INTEGER NOT NULL,
      name TEXT,
      capacity INTEGER DEFAULT 4,
      qr_code_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(restaurant_id, table_number)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      prep_time_minutes INTEGER DEFAULT 15,
      allergens TEXT,
      tags TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
      table_id TEXT REFERENCES tables(id) ON DELETE SET NULL,
      order_number INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
      customer_name TEXT,
      customer_notes TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
      estimated_ready_at TEXT,
      served_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id TEXT REFERENCES menu_items(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      special_instructions TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `);

  // Seed data
  const restaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const existing = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(restaurantId);
  if (!existing) {
    seedDatabase(restaurantId);
  }
}

function seedDatabase(restaurantId) {
  const passwordHash = bcrypt.hashSync('admin123', 10);

  db.prepare(`INSERT INTO restaurants (id, name, slug, description, address, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    restaurantId, 'The Golden Fork', 'golden-fork', 'Fine dining with a modern twist',
    '123 Main Street, New York, NY', '+1 (555) 123-4567', 'admin@goldenfork.com'
  );

  db.prepare(`INSERT INTO users (id, restaurant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), restaurantId, 'Admin User', 'admin@goldenfork.com', passwordHash, 'admin'
  );

  const tablesData = [
    [1, 'Window Table', 2], [2, 'Booth A', 4], [3, 'Patio Table', 6],
    [4, 'Bar Seat', 2], [5, 'Private Room', 8]
  ];
  const insertTable = db.prepare(`INSERT INTO tables (id, restaurant_id, table_number, name, capacity) VALUES (?, ?, ?, ?, ?)`);
  for (const [num, name, cap] of tablesData) {
    insertTable.run(uuidv4(), restaurantId, num, name, cap);
  }

  const catIds = {
    starters: uuidv4(), mains: uuidv4(), desserts: uuidv4(), drinks: uuidv4()
  };
  const insertCat = db.prepare(`INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`);
  insertCat.run(catIds.starters, restaurantId, 'Starters', 'Light bites to begin your meal', 1);
  insertCat.run(catIds.mains, restaurantId, 'Mains', 'Our signature main courses', 2);
  insertCat.run(catIds.desserts, restaurantId, 'Desserts', 'Sweet endings', 3);
  insertCat.run(catIds.drinks, restaurantId, 'Drinks', 'Beverages & cocktails', 4);

  const insertItem = db.prepare(`INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, is_featured, prep_time_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const items = [
    [catIds.starters, 'Bruschetta al Pomodoro', 'Toasted sourdough with heirloom tomatoes, fresh basil, garlic', 12.00, 1, 10],
    [catIds.starters, 'Burrata & Prosciutto', 'Creamy burrata with aged prosciutto, truffle honey, arugula', 18.00, 0, 8],
    [catIds.starters, 'French Onion Soup', 'Classic caramelized onion broth, gruyere crouton', 14.00, 0, 15],
    [catIds.mains, 'Wagyu Beef Burger', '8oz wagyu patty, aged cheddar, caramelized onion, brioche bun', 28.00, 1, 20],
    [catIds.mains, 'Pan-Seared Salmon', 'Atlantic salmon, lemon butter, seasonal vegetables, dill', 32.00, 1, 18],
    [catIds.mains, 'Mushroom Risotto', 'Wild mushroom, parmesan, truffle oil, herbs', 24.00, 0, 22],
    [catIds.mains, 'Ribeye Steak 12oz', 'Prime ribeye, chimichurri, roasted potatoes, asparagus', 54.00, 0, 25],
    [catIds.desserts, 'Chocolate Fondant', 'Warm dark chocolate, vanilla bean ice cream, berry coulis', 14.00, 1, 12],
    [catIds.desserts, 'Creme Brulee', 'Classic vanilla custard, caramelized sugar, fresh berries', 12.00, 0, 10],
    [catIds.drinks, 'House Wine (Glass)', 'Rotating selection of red, white, or rose', 12.00, 0, 2],
    [catIds.drinks, 'Craft Cocktail', 'Ask your server for today specials', 16.00, 0, 5],
    [catIds.drinks, 'Sparkling Water', 'San Pellegrino 750ml', 6.00, 0, 1],
  ];
  for (const [catId, name, desc, price, featured, prep] of items) {
    insertItem.run(uuidv4(), restaurantId, catId, name, desc, price, featured, prep);
  }

  console.log('✅ Database seeded successfully!');
}

initializeDatabase();

module.exports = db;
