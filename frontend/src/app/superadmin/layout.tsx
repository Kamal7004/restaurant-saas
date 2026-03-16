'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth';
import Link from 'next/link';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!isAuthenticated() || user?.role !== 'super_admin') {
      router.push('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-dark-900 text-white border-b border-dark-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/superadmin" className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <span className="font-black tracking-tighter text-xl uppercase">Platform Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { clearAuth(); router.push('/login'); }}
              className="text-stone-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>

      <footer className="text-center py-8 text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em]">
        Golden Fork SaaS • Genesis Engine v2.0
      </footer>
    </div>
  );
}
