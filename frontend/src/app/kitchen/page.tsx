'use client';

import { useEffect, useState } from 'react';
import { orderApi } from '@/lib/api';
import { Order } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { getSocket, joinKitchen } from '@/lib/socket';
import { getUser } from '@/lib/auth';

export default function KitchenPage() {
  const user = getUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);

  const loadOrders = async () => {
    try {
      const data = await orderApi.getActiveOrders();
      setOrders(data as Order[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user?.restaurant_id) return;
    
    loadOrders();
    const socket = getSocket();
    joinKitchen(user.restaurant_id);
    
    socket.on('NEW_ORDER', (order) => { 
      loadOrders(); 
      playSound('new_order'); 
    });
    
    socket.on('ORDER_UPDATED', () => loadOrders());
    
    socket.on('WAITER_CALL', (call) => {
      setWaiterCalls(prev => [call, ...prev].slice(0, 5));
      playSound('waiter_call');
    });

    return () => { 
      socket.off('NEW_ORDER'); 
      socket.off('ORDER_UPDATED'); 
      socket.off('WAITER_CALL');
    };
  }, [user?.restaurant_id]);

  const playSound = (type: string) => {
    try { 
      const audio = new Audio(type === 'new_order' 
        ? 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' 
        : 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.play().catch(() => {}); 
    } catch {}
  };

  const updateStatus = async (orderId: string, status: string) => {
    try { await orderApi.updateStatus(orderId, status); loadOrders(); }
    catch (err) { console.error(err); }
  };

  const ordersByStatus = {
    pending: orders.filter(o => o.status === 'pending'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready'),
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950 text-white p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">👨‍🍳</span>
            <h1 className="text-3xl font-black tracking-tighter uppercase">Kitchen Control</h1>
          </div>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Real-time Order Processing Station</p>
        </div>
        
        <div className="flex gap-4">
          <button onClick={loadOrders} className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-black uppercase tracking-widest">
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Waiter Calls Notifications */}
      {waiterCalls.length > 0 && (
        <div className="mb-10 animate-bounce-in">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex flex-wrap gap-4 items-center">
            <span className="text-amber-500 font-black text-xs uppercase tracking-widest mr-4">🙋‍♂️ Assistance Requested:</span>
            {waiterCalls.map((call, i) => (
              <div key={i} className="bg-amber-500 text-dark-900 px-4 py-2 rounded-xl font-black text-sm animate-pulse-slow">
                Table {call.table_number}
              </div>
            ))}
            <button onClick={() => setWaiterCalls([])} className="ml-auto text-amber-500/50 hover:text-amber-500 font-bold text-xs uppercase">Dismiss All</button>
          </div>
        </div>
      )}

      {/* Order Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[
          { id: 'pending', title: 'New Orders', icon: '⏳', color: 'amber', orders: ordersByStatus.pending, action: 'Start Prep', nextStatus: 'preparing' },
          { id: 'preparing', title: 'In Preparation', icon: '🔥', color: 'blue', orders: ordersByStatus.preparing, action: 'Mark Ready', nextStatus: 'ready' },
          { id: 'ready', title: 'Ready for Pickup', icon: '✅', color: 'emerald', orders: ordersByStatus.ready, action: 'Served', nextStatus: 'served' },
        ].map(col => (
          <div key={col.id} className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{col.icon}</span>
                <span className="font-black text-sm uppercase tracking-widest text-stone-400">{col.title}</span>
              </div>
              <span className={`px-3 py-1 rounded-full bg-${col.color}-500/10 text-${col.color}-500 text-[10px] font-black`}>
                {col.orders.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
              {col.orders.map(order => (
                <div key={order.id} className="bg-white/5 border border-white/5 rounded-[2rem] p-6 hover:bg-white/10 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="font-mono font-black text-2xl text-white">#{order.order_number}</span>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-1">
                        Table {order.table_number} {order.customer_name ? `• ${order.customer_name}` : ''}
                      </p>
                    </div>
                    <span className="text-stone-500 font-mono text-[10px]">{formatTime(order.created_at)}</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm tracking-tight">{item.quantity}× {item.name}</p>
                          {item.special_instructions && (
                            <p className="text-amber-400 text-[10px] font-bold mt-1 uppercase italic underline decoration-amber-400/30">
                              ⚠️ {item.special_instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.customer_notes && (
                    <div className="mb-6 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <p className="text-amber-400 text-[11px] font-bold italic leading-relaxed">
                        💬 {order.customer_notes}
                      </p>
                    </div>
                  )}

                  <button 
                    onClick={() => updateStatus(order.id, col.nextStatus)}
                    className={`w-full h-12 rounded-2xl bg-${col.color}-500 hover:bg-${col.color}-600 text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95`}
                    style={{ backgroundColor: col.color === 'amber' ? '#d97706' : col.color === 'blue' ? '#2563eb' : '#059669' }}
                  >
                    {col.action} →
                  </button>
                </div>
              ))}
              {col.orders.length === 0 && (
                <div className="h-40 border-2 border-dashed border-white/5 rounded-[2rem] flex items-center justify-center text-stone-600 text-xs font-bold uppercase tracking-widest">
                  Station Empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
