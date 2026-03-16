'use client';

import { useEffect, useState } from 'react';
import { restaurantApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Restaurant, User } from '@/lib/types';

export default function SettingsPage() {
  const user = getUser();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [kitchenUsers, setKitchenUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [brandingForm, setBrandingForm] = useState({
    name: '',
    welcome_text: '',
    primary_color: '#ef4444',
    secondary_color: '#fef2f2',
    logo_url: ''
  });

  const [newKitchenUser, setNewKitchenUser] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.restaurant_id) return;
        const [res, kUsers] = await Promise.all([
          restaurantApi.getRestaurant(user.restaurant_id),
          restaurantApi.getKitchenUsers()
        ]);
        setRestaurant(res);
        setKitchenUsers(kUsers);
        setBrandingForm({
          name: res.name,
          welcome_text: res.welcome_text,
          primary_color: res.primary_color,
          secondary_color: res.secondary_color,
          logo_url: res.logo_url || ''
        });
      } catch (err: any) {
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.restaurant_id]);

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await restaurantApi.updateBranding(brandingForm);
      setSuccess('Branding updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const handleAddKitchenUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await restaurantApi.addKitchenUser(newKitchenUser);
      setKitchenUsers([...kitchenUsers, newUser]);
      setNewKitchenUser({ name: '', email: '', password: '' });
      setSuccess('Kitchen user added!');
    } catch (err: any) {
      setError(err.message || 'Failed to add kitchen user');
    }
  };

  const handleRemoveKitchenUser = async (id: string) => {
    if (!confirm('Remove this kitchen user?')) return;
    try {
      await restaurantApi.removeKitchenUser(id);
      setKitchenUsers(kitchenUsers.filter(u => u.id !== id));
      setSuccess('Kitchen user removed');
    } catch (err: any) {
      setError('Failed to remove kitchen user');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-dark-900">Restaurant Settings</h1>
        <p className="text-stone-500">Manage your branding and staff access.</p>
      </header>

      {success && <div className="bg-emerald-50 text-emerald-600 px-6 py-4 rounded-2xl text-sm font-bold border border-emerald-100">{success}</div>}
      {error && <div className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-sm font-bold border border-red-100">{error}</div>}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Branding Form */}
        <div className="bg-white rounded-[2rem] border border-stone-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-dark-900 mb-6 flex items-center gap-2">
            🎨 Branding & Appearance
          </h2>
          <form onSubmit={handleUpdateBranding} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 ml-1">Restaurant Name</label>
              <input type="text" value={brandingForm.name} onChange={e => setBrandingForm({...brandingForm, name: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 ml-1">Welcome Message</label>
              <textarea value={brandingForm.welcome_text} onChange={e => setBrandingForm({...brandingForm, welcome_text: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 ml-1">Primary Color</label>
                <div className="flex gap-2">
                  <input type="color" value={brandingForm.primary_color} onChange={e => setBrandingForm({...brandingForm, primary_color: e.target.value})}
                    className="h-10 w-10 p-0 border-none rounded-lg cursor-pointer bg-transparent" />
                  <input type="text" value={brandingForm.primary_color} onChange={e => setBrandingForm({...brandingForm, primary_color: e.target.value})}
                    className="flex-1 px-3 rounded-xl bg-stone-50 border-none text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 ml-1">Secondary Color</label>
                <div className="flex gap-2">
                  <input type="color" value={brandingForm.secondary_color} onChange={e => setBrandingForm({...brandingForm, secondary_color: e.target.value})}
                    className="h-10 w-10 p-0 border-none rounded-lg cursor-pointer bg-transparent" />
                  <input type="text" value={brandingForm.secondary_color} onChange={e => setBrandingForm({...brandingForm, secondary_color: e.target.value})}
                    className="flex-1 px-3 rounded-xl bg-stone-50 border-none text-xs font-mono" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-300 uppercase tracking-widest mb-2 ml-1">Logo URL</label>
              <input type="text" value={brandingForm.logo_url} onChange={e => setBrandingForm({...brandingForm, logo_url: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold" placeholder="https://..." />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Branding'}
            </button>
          </form>
        </div>

        {/* Kitchen Users */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] border border-stone-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-dark-900 mb-6 flex items-center gap-2">
              👨‍🍳 Kitchen Team
            </h2>
            <div className="space-y-4 mb-8">
              {kitchenUsers.length === 0 ? (
                <p className="text-stone-400 text-sm italic">No kitchen users yet.</p>
              ) : (
                kitchenUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-100">
                    <div>
                      <p className="font-bold text-dark-900 text-sm">{user.name}</p>
                      <p className="text-[10px] text-stone-400 font-medium tracking-tight">{user.email}</p>
                    </div>
                    <button onClick={() => handleRemoveKitchenUser(user.id)} className="text-stone-300 hover:text-red-500 transition-colors p-2 text-xl">
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <h3 className="text-xs font-black text-stone-300 uppercase tracking-widest mb-4 ml-1">Add New Member</h3>
            <form onSubmit={handleAddKitchenUser} className="space-y-4">
              <input type="text" placeholder="Member Name" required value={newKitchenUser.name} onChange={e => setNewKitchenUser({...newKitchenUser, name: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold" />
              <input type="email" placeholder="Email Address" required value={newKitchenUser.email} onChange={e => setNewKitchenUser({...newKitchenUser, email: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold" />
              <input type="password" placeholder="Temporary Password" required value={newKitchenUser.password} onChange={e => setNewKitchenUser({...newKitchenUser, password: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 text-sm font-bold" />
              <button type="submit" className="w-full bg-dark-900 hover:bg-dark-800 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all">
                Add to Kitchen
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
