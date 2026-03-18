'use client';

import { useEffect, useState } from 'react';
import { orderApi } from '@/lib/api';
import { Order } from '@/lib/types';
import { formatCurrency, formatTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import { getSocket, joinRestaurant } from '@/lib/socket';

import { getUser } from '@/lib/auth';

// RESTAURANT_ID is retrieved from the logged-in user session

export default function OrdersPage() {
  const user = getUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const data = await orderApi.getOrders(filter);
      setOrders(data as Order[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrders(); }, [filter]);

  useEffect(() => {
    if (!user?.restaurant_id) return;
    const socket = getSocket();
    joinRestaurant(user.restaurant_id);
    socket.on('NEW_ORDER', () => loadOrders());
    socket.on('ORDER_UPDATED', () => loadOrders());
    return () => { socket.off('NEW_ORDER'); socket.off('ORDER_UPDATED'); };
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try { await orderApi.updateStatus(orderId, status); loadOrders(); }
    catch (err) { console.error(err); }
  };

  const statuses = ['', 'pending', 'preparing', 'ready', 'served', 'cancelled'];
  const statusLabels: Record<string, string> = { '': 'All', pending: 'Pending', preparing: 'Preparing', ready: 'Ready', served: 'Served', cancelled: 'Cancelled' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-dark-900">Orders</h1>
        <p className="text-stone-500 mt-1">{orders.length} orders</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === s ? 'bg-brand-500 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-brand-300'}`}>
            {statusLabels[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm card-hover">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="font-mono font-bold text-dark-900 text-lg">#{order.order_number}</span>
                  <p className="text-stone-400 text-xs mt-0.5">{formatTime(order.created_at)}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-dark-900">{formatCurrency(order.total)}</p>
                <p className="text-stone-400 text-xs">Table {order.table_number || '—'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {order.items?.map(item => (
                <span key={item.id} className="bg-stone-50 text-stone-600 text-xs px-3 py-1 rounded-full">
                  {item.quantity}× {item.name}
                </span>
              ))}
            </div>
            {order.customer_notes && <p className="text-stone-400 text-xs mt-2 italic">💬 {order.customer_notes}</p>}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {order.status === 'pending' && (
                <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors">Start Preparing</button>
              )}
              {order.status === 'preparing' && (
                <button onClick={() => updateStatus(order.id, 'ready')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors">Mark Ready</button>
              )}
              {order.status === 'ready' && (
                <button onClick={() => updateStatus(order.id, 'served')} className="bg-stone-700 hover:bg-stone-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors">Mark Served</button>
              )}
              {['pending', 'preparing'].includes(order.status) && (
                <button onClick={() => updateStatus(order.id, 'cancelled')} className="text-red-400 hover:text-red-500 px-3 py-1.5 text-xs font-semibold transition-colors">Cancel</button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-stone-400">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
