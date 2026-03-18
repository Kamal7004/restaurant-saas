'use client';

import { useEffect, useState } from 'react';
import { restaurantApi, orderApi } from '@/lib/api';
import { Order } from '@/lib/types';
import { formatCurrency, formatTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils';
import { getSocket, joinRestaurant } from '@/lib/socket';
import { getUser } from '@/lib/auth';

// RESTAURANT_ID is retrieved from the logged-in user session

interface Stats {
  today_orders: string;
  active_orders: string;
  today_revenue: string;
  pending_orders: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  const loadData = async () => {
    if (!user?.restaurant_id) {
      setLoading(false);
      return;
    }

    try {
      const [statsData, ordersData] = await Promise.all([
        restaurantApi.getStats(user.restaurant_id),
        orderApi.getOrders(''),
      ]);
      setStats(statsData as Stats);
      setRecentOrders((ordersData as Order[]).slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.restaurant_id) return;
    loadData();
    const socket = getSocket();
    joinRestaurant(user.restaurant_id);

    socket.on('NEW_ORDER', () => loadData());
    socket.on('ORDER_UPDATED', () => loadData());
    return () => {
      socket.off('NEW_ORDER');
      socket.off('ORDER_UPDATED');
    };
  }, []);

  const statCards = [
    { label: "Today's Orders", value: stats?.today_orders || '0', icon: '📋', color: 'blue' },
    { label: 'Active Orders', value: stats?.active_orders || '0', icon: '⚡', color: 'amber' },
    { label: "Today's Revenue", value: formatCurrency(stats?.today_revenue || 0), icon: '💰', color: 'green' },
    { label: 'Pending', value: stats?.pending_orders || '0', icon: '⏳', color: 'red' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-dark-900">Dashboard</h1>
        <p className="text-stone-500 mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm card-hover">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span className={`w-2 h-2 rounded-full ${
                card.color === 'blue' ? 'bg-blue-400' :
                card.color === 'amber' ? 'bg-amber-400' :
                card.color === 'green' ? 'bg-green-400' : 'bg-red-400'
              }`} />
            </div>
            <p className="text-2xl font-bold text-dark-900">{card.value}</p>
            <p className="text-stone-500 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-900">Recent Orders</h2>
          <button onClick={loadData} className="text-stone-400 hover:text-brand-500 text-sm transition-colors">↻ Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {['Order', 'Table', 'Items', 'Total', 'Status', 'Time'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4"><span className="font-mono font-bold text-dark-900">#{order.order_number}</span></td>
                  <td className="px-6 py-4"><span className="text-stone-600 text-sm">Table {order.table_number}</span></td>
                  <td className="px-6 py-4"><span className="text-stone-600 text-sm">{order.items?.length || 0} items</span></td>
                  <td className="px-6 py-4"><span className="font-semibold text-dark-900">{formatCurrency(order.total)}</span></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4"><span className="text-stone-400 text-sm">{formatTime(order.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentOrders.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-stone-400">No orders yet today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
