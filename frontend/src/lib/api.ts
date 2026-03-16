const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (data: any) =>
    fetchApi('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  me: () => fetchApi('/auth/me'),
};

export const restaurantApi = {
  getRestaurant: (id: string) => fetchApi(`/restaurants/${id}`),
  updateBranding: (data: any) =>
    fetchApi('/restaurants/branding', { method: 'PATCH', body: JSON.stringify(data) }),
  getKitchenUsers: () => fetchApi('/restaurants/kitchen-users'),
  addKitchenUser: (data: any) =>
    fetchApi('/restaurants/kitchen-users', { method: 'POST', body: JSON.stringify(data) }),
  removeKitchenUser: (id: string) =>
    fetchApi(`/restaurants/kitchen-users/${id}`, { method: 'DELETE' }),
  getStats: (id: string) => fetchApi(`/restaurants/${id}/stats`),
};

export const menuApi = {
  getMenu: (restaurantId?: string) =>
    fetchApi(`/menu${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`),
  getItems: (restaurantId?: string) =>
    fetchApi(`/menu/items${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`),
  createItem: (data: any) =>
    fetchApi('/menu/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: string, data: any) =>
    fetchApi(`/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id: string) =>
    fetchApi(`/menu/items/${id}`, { method: 'DELETE' }),
  getCategories: (restaurantId?: string) =>
    fetchApi(`/menu/categories${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`),
  createCategory: (data: any) =>
    fetchApi('/menu/categories', { method: 'POST', body: JSON.stringify(data) }),
};

export const tableApi = {
  getTables: () => fetchApi('/tables'),
  getPublicTable: (tableId: string) => fetchApi(`/tables/public/${tableId}`),
  createTable: (data: any) =>
    fetchApi('/tables', { method: 'POST', body: JSON.stringify(data) }),
  generateQR: (id: string, format = 'png') =>
    fetchApi(`/tables/${id}/qrcode?format=${format}`, { method: 'POST' }),
  deleteTable: (id: string) =>
    fetchApi(`/tables/${id}`, { method: 'DELETE' }),
};

export const superAdminApi = {
  getStats: () => fetchApi('/superadmin/stats'),
  getRestaurants: () => fetchApi('/superadmin/restaurants'),
  updateRestaurantStatus: (id: string, is_active: number) =>
    fetchApi(`/superadmin/restaurants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
};

export const orderApi = {
  createOrder: (data: any) =>
    fetchApi('/orders', { method: 'POST', body: JSON.stringify(data) }),
  callWaiter: (tableId: string) =>
    fetchApi('/orders/call-waiter', { method: 'POST', body: JSON.stringify({ table_id: tableId }) }),
  getOrders: (status?: string) =>
    fetchApi(`/orders${status ? `?status=${status}` : ''}`),
  getActiveOrders: () => fetchApi('/orders/active'),
  getOrder: (id: string) => fetchApi(`/orders/${id}`),
  updateStatus: (id: string, status: string) =>
    fetchApi(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};
