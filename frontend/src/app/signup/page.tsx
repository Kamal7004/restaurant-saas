'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import Link from 'next/link';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.signup(formData);
      setAuth(data.token, data.user);
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50 py-12 px-4">
      <div className="w-full max-w-xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍴</div>
          <h1 className="text-3xl font-bold text-dark-900">Start Your SaaS Journey</h1>
          <p className="text-stone-500 mt-2 text-lg">Create your restaurant and get started in minutes.</p>
        </div>
        
        <form onSubmit={handleSignup} className="bg-white rounded-[2rem] border border-stone-200 p-10 shadow-xl shadow-orange-100/50">
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-sm mb-6 border border-red-100">{error}</div>}
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Restaurant Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. The Golden Fork"
                value={formData.restaurantName} 
                onChange={e => setFormData({...formData, restaurantName: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" 
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Owner Name</label>
              <input 
                type="text" 
                required
                placeholder="Full Name"
                value={formData.ownerName} 
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" 
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
              <input 
                type="tel" 
                required
                placeholder="+1 (555) 000-0000"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" 
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="admin@restaurant.com"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" 
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Restaurant Address</label>
              <textarea 
                required
                placeholder="Full physical address"
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" 
                rows={2}
              />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-dark-900 hover:bg-dark-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50">
            {loading ? 'Creating Account...' : 'Create My Restaurant'}
          </button>

          <p className="text-center mt-6 text-stone-400 text-sm font-bold">
            Already have an account? <Link href="/login" className="text-brand-500 hover:text-brand-600 transition-colors">Log In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
