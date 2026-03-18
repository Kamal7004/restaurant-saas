CREATE ROLE prod_restaurant_user LOGIN PASSWORD 'Developer@123';

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
  primary_color VARCHAR(20) DEFAULT '#000000',
  secondary_color VARCHAR(20) DEFAULT '#ffffff',
  welcome_text TEXT DEFAULT 'Welcome to our restaurant!',
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  features TEXT,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

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
-- Grant Permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prod_restaurant_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prod_restaurant_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prod_restaurant_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prod_restaurant_user;