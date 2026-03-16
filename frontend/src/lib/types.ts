export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_available: number;
  is_featured: number;
  prep_time_minutes: number;
  allergens: string | null;
  tags: string | null;
  sort_order: number;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  image_url: string | null;
  sort_order: number;
  is_active: number;
  items?: MenuItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  special_instructions: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  order_number: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  customer_name: string | null;
  customer_notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  payment_status: string;
  table_number?: number;
  table_name?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: number;
  name: string;
  capacity: number;
  qr_code_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  address: string;
  phone: string;
  email: string;
  primary_color: string;
  secondary_color: string;
  welcome_text: string;
  is_active: number;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  features: string;
  is_active: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurant_id: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  special_instructions?: string;
}
