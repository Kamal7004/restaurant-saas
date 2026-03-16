'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.token, data.user);
      
      // Redirect based on role
      if (data.user.role === 'super_admin') {
        router.push('/superadmin');
      } else if (data.user.role === 'kitchen') {
        router.push('/kitchen');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50 p-4">
      <div className="w-full max-w-md animate-fade-in text-center px-4">
        <div className="mb-10">
          <div className="text-6xl mb-4 drop-shadow-sm">🍴</div>
          <h1 className="text-4xl font-extrabold text-dark-900 tracking-tight">The Golden Fork</h1>
          <p className="text-stone-400 mt-2 font-bold uppercase tracking-widest text-xs">Restaurant OS</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-[2.5rem] border border-stone-200 p-10 shadow-2xl shadow-orange-100/50 text-left">
          <h2 className="text-xl font-black text-dark-900 mb-8 flex items-center gap-3">
            Welcome back <span className="text-brand-500 text-2xl">👋</span>
          </h2>
          
          {error && <div className="bg-red-50 text-red-600 px-5 py-4 rounded-2xl text-xs font-bold mb-6 border border-red-100">{error}</div>}
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="name@restaurant.com"
                className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Your secure password"
                className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-none focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm font-bold" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-dark-900 hover:bg-dark-800 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-10">
            {loading ? 'Checking...' : 'Sign In Now'}
          </button>

          <div className="mt-8 text-center">
            <p className="text-stone-400 text-[11px] font-bold uppercase tracking-widest">
              Don&apos;t have a restaurant?
            </p>
            <Link href="/signup" className="text-brand-500 font-black text-sm hover:text-brand-600 transition-colors inline-block mt-1">
              Create Your Own →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
