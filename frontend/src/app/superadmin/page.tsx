'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ total_restaurants: 0, total_orders: 0, total_revenue: 0 });
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, resData] = await Promise.all([
          superAdminApi.getStats(),
          superAdminApi.getRestaurants()
        ]);
        setStats(statsData);
        setRestaurants(resData);
      } catch (err: any) {
        setError('Failed to load platform data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleStatus = async (id: string, current: number) => {
    try {
      const next = current === 1 ? 0 : 1;
      await superAdminApi.updateRestaurantStatus(id, next);
      setRestaurants(restaurants.map(r => r.id === id ? { ...r, is_active: next } : r));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Restaurants', value: stats.total_restaurants, icon: '🏪', color: 'indigo' },
          { label: 'Platform Revenue', value: formatCurrency(stats.total_revenue), icon: '💰', color: 'emerald' },
          { label: 'Total Orders', value: stats.total_orders, icon: '📦', color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[2rem] p-8 border border-stone-100 shadow-sm flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-3xl shadow-inner`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-dark-900 tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Restaurants List */}
      <div className="bg-white rounded-[2.5rem] border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-stone-50 flex items-center justify-between">
          <h2 className="text-2xl font-black text-dark-900 tracking-tight">Active Restaurants</h2>
          <span className="px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">{restaurants.length} Registered</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Restaurant</th>
                <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Owner</th>
                <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Volume</th>
                <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {restaurants.map((res) => (
                <tr key={res.id} className="hover:bg-stone-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      {res.logo_url ? (
                        <img src={res.logo_url} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-xl">🏠</div>
                      )}
                      <div>
                        <p className="font-bold text-dark-900">{res.name}</p>
                        <p className="text-[10px] text-stone-400 font-medium tracking-tight">ID: {res.id.split('-')[0]}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-dark-900">{res.owner_name || 'N/A'}</p>
                    <p className="text-[10px] text-stone-400 font-medium">{res.owner_email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-black text-dark-900 text-sm">{res.total_orders} Orders</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      res.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {res.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => toggleStatus(res.id, res.is_active)}
                      className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                        res.is_active ? 'text-red-500 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600'
                      }`}
                    >
                      {res.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
