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
  const [searchQuery, setSearchQuery] = useState('');
  const [callingWaiter, setCallingWaiter] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const tableData = await tableApi.getPublicTable(tableId);
        const res = (tableData as any).restaurant;
        setTable((tableData as any).table);
        setRestaurant(res);
        
        const menuData = await menuApi.getMenu(res.id);
        setMenu(menuData as Category[]);
        if ((menuData as Category[]).length > 0) setSelectedCategory((menuData as Category[])[0].id);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadData();
    const socket = getSocket();
    // joinTable is called after we get the restaurant ID
  }, [tableId]);

  useEffect(() => {
    if (restaurant?.id) {
      joinTable(restaurant.id, tableId);
    }
  }, [restaurant, tableId]);

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

  const callWaiter = async () => {
    setCallingWaiter(true);
    try {
      await orderApi.callWaiter(tableId);
      alert('Waiter called! Someone will be with you shortly.');
    } catch (err) {
      console.error(err);
      alert('Failed to call waiter. Please try again.');
    } finally {
      setCallingWaiter(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await orderApi.createOrder({
        table_id: tableId,
        restaurant_id: restaurant?.id,
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

  const filteredMenu = menu.map(cat => ({
    ...cat,
    items: cat.items?.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items && cat.items.length > 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const themeStyle = {
    '--brand-color': restaurant?.primary_color || '#ef4444',
    '--bg-accent': restaurant?.secondary_color || '#fef2f2',
  } as React.CSSProperties;

  if (orderPlaced) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6" style={themeStyle}>
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
    <div className="min-h-screen bg-stone-50 pb-28" style={themeStyle}>
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {restaurant?.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-10 h-10 rounded-full object-cover border border-stone-100" />
              ) : (
                <span className="text-2xl">🍴</span>
              )}
              <div>
                <h1 className="font-bold text-dark-900 leading-tight">{restaurant?.name || 'Restaurant'}</h1>
                <p className="text-stone-400 text-[10px] uppercase tracking-wider">Table {table?.table_number}</p>
              </div>
            </div>
            <button 
              onClick={callWaiter}
              disabled={callingWaiter}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold hover:border-brand-500 hover:text-brand-500 transition-colors disabled:opacity-50"
              style={{ color: callingWaiter ? undefined : 'var(--brand-color)' }}
            >
              🙋‍♂️ Call Waiter
            </button>
          </div>
          
          {/* Search bar */}
          <div className="mt-4 relative">
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-100 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Welcome Banner */}
        {!searchQuery && (
          <div className="mb-6 p-6 rounded-3xl bg-white border border-stone-100 shadow-sm overflow-hidden relative">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-dark-900 mb-1">{restaurant?.name}</h2>
              <p className="text-stone-500 text-sm leading-relaxed">{restaurant?.welcome_text}</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none">
              <img src={restaurant?.logo_url || ''} className="w-full h-full object-contain grayscale" />
            </div>
          </div>
        )}

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
            {menu.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === cat.id 
                    ? 'shadow-md shadow-brand-500/20 text-white' 
                    : 'bg-white border border-stone-100 text-stone-500'
                }`}
                style={{ backgroundColor: selectedCategory === cat.id ? 'var(--brand-color)' : undefined }}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Menu items */}
        {(searchQuery ? filteredMenu : menu.filter(c => c.id === selectedCategory)).map(category => (
          <div key={category.id} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-dark-900 tracking-tight">{category.name}</h2>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tighter">{category.items?.length} items</span>
            </div>
            <div className="grid gap-4">
              {category.items?.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <div key={item.id} className="bg-white rounded-[2rem] border border-stone-100 p-2 shadow-sm flex gap-4 pr-4 group transition-all hover:shadow-md">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-stone-50 flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🍲</div>
                      )}
                    </div>
                    <div className="flex-1 py-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-dark-900 leading-tight">{item.name}</h3>
                          {item.is_featured ? <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg font-bold">FEAT</span> : null}
                        </div>
                        <p className="text-stone-400 text-[11px] mt-1 line-clamp-1">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-dark-900" style={{ color: 'var(--brand-color)' }}>{formatCurrency(item.price)}</span>
                          <span className="text-[9px] font-bold text-stone-300 tracking-wider">PREP: {item.prep_time_minutes} MIN</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {inCart ? (
                            <div className="flex items-center gap-2 bg-stone-50 rounded-2xl p-1 px-2 border border-stone-100 scale-90">
                              <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-stone-400 font-black">−</button>
                              <span className="font-black text-dark-900 text-sm min-w-[20px] text-center">{inCart.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-dark-900 font-black">+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(item)}
                              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                              style={{ backgroundColor: 'var(--brand-color)', boxShadow: '0 4px 12px var(--brand-color)33' }}>
                              <span className="text-lg font-black">+</span>
                            </button>
                          )}
                        </div>
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
        <div className="fixed bottom-6 left-6 right-6 z-50 animate-bounce-in">
          <button 
            onClick={() => setShowCart(true)}
            className="w-full bg-dark-900 text-white rounded-[2rem] p-4 flex items-center justify-between shadow-2xl shadow-dark-900/40 border border-white/10"
          >
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-white text-dark-900 flex items-center justify-center font-black text-xs">{cartCount}</span>
              <span className="font-black text-sm uppercase tracking-widest text-white/90">View My Order</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 font-bold">TOTAL:</span>
              <span className="font-black text-lg">{formatCurrency(cartTotal)}</span>
            </div>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-dark-900/60 backdrop-blur-sm flex items-end">
          <div className="w-full bg-white rounded-t-[3rem] max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
            <div className="p-8 pb-4 flex items-center justify-between border-b border-stone-50">
              <div>
                <h2 className="text-2xl font-black text-dark-900 leading-tight">Your Order</h2>
                <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">Table {table?.table_number} — {restaurant?.name}</p>
              </div>
              <button 
                onClick={() => setShowCart(false)} 
                className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 text-2xl font-black hover:bg-stone-200 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 py-4 scrollbar-hide">
              <div className="space-y-6 mb-8">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 bg-stone-50 rounded-2xl p-1 border border-stone-100">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-stone-300 font-black">−</button>
                        <span className="font-black text-dark-900 min-w-[24px] text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-dark-900 font-black">+</button>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-dark-900 font-bold leading-tight">{item.name}</span>
                        <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest">{formatCurrency(item.price)} each</span>
                      </div>
                    </div>
                    <span className="font-extrabold text-dark-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4 mb-8">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em] ml-2">Personalize Your Order</span>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your Name (Optional)"
                    className="w-full px-6 py-4 rounded-[1.5rem] bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold placeholder:text-stone-300" />
                </div>
                <div className="space-y-1">
                  <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Any special notes for the chef?"
                    className="w-full px-6 py-4 rounded-[1.5rem] bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold placeholder:text-stone-300" rows={2} />
                </div>
              </div>

              <div className="border-t-2 border-dashed border-stone-100 pt-6 space-y-3 mb-8">
                <div className="flex justify-between text-xs font-bold"><span className="text-stone-300 uppercase tracking-widest">Subtotal</span><span className="text-dark-900">{formatCurrency(cartTotal)}</span></div>
                <div className="flex justify-between text-xs font-bold"><span className="text-stone-300 uppercase tracking-widest">Service Tax</span><span className="text-dark-900">{formatCurrency(cartTotal * 0.1)}</span></div>
                <div className="flex justify-between items-end pt-2">
                  <span className="font-black text-xs uppercase tracking-[0.3em] text-stone-400">Grand Total</span>
                  <span className="font-black text-3xl tracking-tighter text-dark-900">{formatCurrency(cartTotal * 1.1)}</span>
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 bg-white border-t border-stone-50">
              <button 
                onClick={placeOrder} 
                disabled={submitting}
                className="w-full h-16 rounded-[2rem] text-white flex items-center justify-center font-black text-lg tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-2xl"
                style={{ backgroundColor: 'var(--brand-color)', boxShadow: '0 12px 24px var(--brand-color)44' }}
              >
                {submitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>Send to Kitchen →</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
