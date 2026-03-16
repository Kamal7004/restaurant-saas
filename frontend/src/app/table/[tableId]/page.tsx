'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { menuApi, orderApi, tableApi } from '@/lib/api';
import { Category, MenuItem, CartItem, Table, Restaurant } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { getSocket, joinTable } from '@/lib/socket';

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID!;

export default function TableOrderPage() {
  const params = useParams();
  const tableId = params.tableId as string;

  const [table, setTable] = useState<Table | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [orderPlaced, setOrderPlaced] = useState<{ order_number: number; id: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tableData, menuData] = await Promise.all([
          tableApi.getPublicTable(tableId),
          menuApi.getMenu(RESTAURANT_ID),
        ]);
        setTable((tableData as any).table);
        setRestaurant((tableData as any).restaurant);
        setMenu(menuData as Category[]);
        if ((menuData as Category[]).length > 0) setSelectedCategory((menuData as Category[])[0].id);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadData();
    const socket = getSocket();
    joinTable(RESTAURANT_ID, tableId);
  }, [tableId]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await orderApi.createOrder({
        table_id: tableId,
        customer_name: customerName || null,
        customer_notes: customerNotes || null,
        items: cart.map(item => ({ menu_item_id: item.id, quantity: item.quantity })),
      });
      setOrderPlaced({ order_number: (order as any).order_number, id: (order as any).id });
      setCart([]);
      setShowCart(false);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (orderPlaced) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6">
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-dark-900 mb-2">Order Placed!</h1>
        <p className="text-stone-500 mb-4">Your order <span className="font-mono font-bold text-dark-900">#{orderPlaced.order_number}</span> has been sent to the kitchen.</p>
        <p className="text-stone-400 text-sm mb-8">You will be notified when it&apos;s ready.</p>
        <button onClick={() => setOrderPlaced(null)} className="bg-dark-900 hover:bg-dark-800 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
          Order More
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍴</span>
            <div>
              <h1 className="font-bold text-dark-900">{restaurant?.name || 'Restaurant'}</h1>
              <p className="text-stone-400 text-xs">Table {table?.table_number} — {table?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {menu.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id ? 'bg-brand-500 text-white' : 'bg-white border border-stone-200 text-stone-600'
              }`}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu items */}
        {menu.filter(c => !selectedCategory || c.id === selectedCategory).map(category => (
          <div key={category.id} className="mb-8">
            <h2 className="text-lg font-bold text-dark-900 mb-1">{category.name}</h2>
            <p className="text-stone-400 text-sm mb-4">{category.description}</p>
            <div className="space-y-3">
              {category.items?.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-dark-900">{item.name}</h3>
                          {item.is_featured ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐</span> : null}
                        </div>
                        <p className="text-stone-400 text-xs mt-1">{item.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-bold text-brand-600">{formatCurrency(item.price)}</span>
                          <span className="text-stone-300 text-xs">🕐 {item.prep_time_minutes} min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-brand-50 rounded-xl px-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-brand-600 font-bold">−</button>
                            <span className="font-bold text-brand-600 min-w-[20px] text-center">{inCart.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-brand-600 font-bold">+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item)}
                            className="bg-brand-500 hover:bg-brand-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-colors">
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 bg-brand-500 text-white p-4 z-50" onClick={() => setShowCart(true)}>
          <div className="max-w-2xl mx-auto flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-sm px-3 py-1 rounded-full font-bold">{cartCount}</span>
              <span className="font-semibold">View Cart</span>
            </div>
            <span className="font-bold">{formatCurrency(cartTotal)}</span>
          </div>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-900">Your Order</h2>
                <button onClick={() => setShowCart(false)} className="text-stone-400 hover:text-stone-600 text-2xl">×</button>
              </div>
              <div className="space-y-3 mb-6">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-stone-50 rounded-lg">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-stone-500 font-bold text-sm">−</button>
                        <span className="font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-stone-500 font-bold text-sm">+</button>
                      </div>
                      <span className="text-dark-900 text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mb-6">
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" />
                <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Special instructions (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" rows={2} />
              </div>
              <div className="border-t border-stone-100 pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-stone-500">Tax (10%)</span><span>{formatCurrency(cartTotal * 0.1)}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(cartTotal * 1.1)}</span></div>
              </div>
              <button onClick={placeOrder} disabled={submitting}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3.5 rounded-xl font-bold text-lg transition-colors disabled:opacity-50">
                {submitting ? 'Placing Order...' : `Place Order — ${formatCurrency(cartTotal * 1.1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
