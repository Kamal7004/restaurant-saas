const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'restaurant_saas',
  port: process.env.PGPORT || 5432,
});

/**
 * Transaction Helper
 * @param {Function} callback - Async function that receives a client to perform queries
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  await transaction(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        logo_url TEXT,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        timezone VARCHAR(50) DEFAULT 'UTC',
        is_active SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        is_active SMALLINT DEFAULT 1,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_role CHECK (role IN ('super_admin', 'admin', 'kitchen', 'staff'))
      );

      CREATE TABLE IF NOT EXISTS tables (
        id UUID PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        table_number INTEGER NOT NULL,
        name VARCHAR(255),
        capacity INTEGER DEFAULT 4,
        qr_code_url TEXT,
        is_active SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, table_number)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id UUID PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        image_url TEXT,
        is_available SMALLINT DEFAULT 1,
        is_featured SMALLINT DEFAULT 0,
        prep_time_minutes INTEGER DEFAULT 15,
        allergens TEXT,
        tags TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
        order_number INTEGER,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        customer_name VARCHAR(255),
        customer_notes TEXT,
        subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
        tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total DECIMAL(10, 2) NOT NULL DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        estimated_ready_at TIMESTAMP,
        served_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_status CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
        CONSTRAINT chk_payment_status CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
        UNIQUE(restaurant_id, order_number)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY,
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        special_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    // Seed data check
    const restaurantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const { rows } = await client.query('SELECT id FROM restaurants WHERE id = $1', [restaurantId]);
    if (rows.length === 0) {
      await seedDatabase(client, restaurantId);
    }
  });
}

async function seedDatabase(client, restaurantId) {
  const passwordHash = bcrypt.hashSync('admin123', 10);

  await client.query(`INSERT INTO restaurants (id, name, slug, description, address, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
    restaurantId, 'The Golden Fork', 'golden-fork', 'Fine dining with a modern twist',
    '123 Main Street, New York, NY', '+1 (555) 123-4567', 'admin@goldenfork.com'
  ]);

  await client.query(`INSERT INTO users (id, restaurant_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)`, [
    uuidv4(), restaurantId, 'Admin User', 'admin@goldenfork.com', passwordHash, 'admin'
  ]);

  const tablesData = [
    [1, 'Window Table', 2], [2, 'Booth A', 4], [3, 'Patio Table', 6],
    [4, 'Bar Seat', 2], [5, 'Private Room', 8]
  ];
  for (const [num, name, cap] of tablesData) {
    await client.query(`INSERT INTO tables (id, restaurant_id, table_number, name, capacity) VALUES ($1, $2, $3, $4, $5)`, [
      uuidv4(), restaurantId, num, name, cap
    ]);
  }

  const catIds = {
    starters: uuidv4(), mains: uuidv4(), desserts: uuidv4(), drinks: uuidv4()
  };
  await client.query(`INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES ($1, $2, $3, $4, $5)`, [catIds.starters, restaurantId, 'Starters', 'Light bites to begin your meal', 1]);
  await client.query(`INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES ($1, $2, $3, $4, $5)`, [catIds.mains, restaurantId, 'Mains', 'Our signature main courses', 2]);
  await client.query(`INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES ($1, $2, $3, $4, $5)`, [catIds.desserts, restaurantId, 'Desserts', 'Sweet endings', 3]);
  await client.query(`INSERT INTO categories (id, restaurant_id, name, description, sort_order) VALUES ($1, $2, $3, $4, $5)`, [catIds.drinks, restaurantId, 'Drinks', 'Beverages & cocktails', 4]);

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
    await client.query(`INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, is_featured, prep_time_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      uuidv4(), restaurantId, catId, name, desc, price, featured, prep
    ]);
  }

  console.log('✅ Database seeded successfully into PostgreSQL!');
}

initializeDatabase();

module.exports = {
  query: (text, params) => pool.query(text, params),
  transaction,
};
