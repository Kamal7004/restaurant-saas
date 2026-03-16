'use client';

import { useEffect, useState } from 'react';
import { orderApi } from '@/lib/api';
import { Order } from '@/lib/types';
import { formatCurrency, formatTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import { getSocket, joinKitchen } from '@/lib/socket';

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID!;

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const data = await orderApi.getActiveOrders();
      setOrders(data as Order[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadOrders();
    const socket = getSocket();
    joinKitchen(RESTAURANT_ID);
    socket.on('NEW_ORDER', () => { loadOrders(); playSound(); });
    socket.on('ORDER_UPDATED', () => loadOrders());
    return () => { socket.off('NEW_ORDER'); socket.off('ORDER_UPDATED'); };
  }, []);

  const playSound = () => {
    try { new Audio('data:audio/wav;base64,UklGRl9vT19teleGFyRm10IBAAAAEAAQARIwAAEkAAAAEACABkYXRhQW9P').play().catch(() => {}); } catch {}
  };

  const updateStatus = async (orderId: string, status: string) => {
    try { await orderApi.updateStatus(orderId, status); loadOrders(); }
    catch (err) { console.error(err); }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-dark-900"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const Column = ({ title, icon, orders: colOrders, color }: { title: string; icon: string; orders: Order[]; color: string }) => (
    <div className="flex-1 min-w-[300px]">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl ${color}`}>
        <span className="text-xl">{icon}</span>
        <span className="font-bold text-white">{title}</span>
        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full ml-auto">{colOrders.length}</span>
      </div>
      <div className="space-y-3 mt-3">
        {colOrders.map(order => (
          <div key={order.id} className="bg-stone-800 rounded-xl p-4 border border-stone-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-white text-lg">#{order.order_number}</span>
              <span className="text-stone-400 text-xs">{formatTime(order.created_at)}</span>
            </div>
            <p className="text-stone-400 text-xs mb-3">Table {order.table_number || '—'} {order.customer_name ? `• ${order.customer_name}` : ''}</p>
            <div className="space-y-1 mb-3">
              {order.items?.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{item.quantity}× {item.name}</span>
                  {item.special_instructions && <span className="text-amber-400 text-xs">⚠️</span>}
                </div>
              ))}
            </div>
            {order.customer_notes && <p className="text-amber-400 text-xs mb-3 italic">💬 {order.customer_notes}</p>}
            <div className="flex gap-2">
              {order.status === 'pending' && (
                <button onClick={() => updateStatus(order.id, 'preparing')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition-colors">
                  🔥 Start
                </button>
              )}
              {order.status === 'preparing' && (
                <button onClick={() => updateStatus(order.id, 'ready')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold transition-colors">
                  ✅ Ready
                </button>
              )}
              {order.status === 'ready' && (
                <button onClick={() => updateStatus(order.id, 'served')}
                  className="flex-1 bg-stone-600 hover:bg-stone-500 text-white py-2 rounded-lg text-sm font-bold transition-colors">
                  🍽️ Served
                </button>
              )}
            </div>
          </div>
        ))}
        {colOrders.length === 0 && (
          <div className="text-center py-10 text-stone-500 text-sm">No orders</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-900 p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👨‍🍳</span>
          <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
        </div>
        <button onClick={loadOrders} className="text-stone-400 hover:text-white text-sm transition-colors">↻ Refresh</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        <Column title="Pending" icon="⏳" orders={pendingOrders} color="bg-amber-600" />
        <Column title="Preparing" icon="🔥" orders={preparingOrders} color="bg-blue-600" />
        <Column title="Ready" icon="✅" orders={readyOrders} color="bg-green-600" />
      </div>
    </div>
  );
}
