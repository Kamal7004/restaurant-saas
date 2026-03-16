'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/menu', label: 'Menu', icon: '🍕' },
  { href: '/admin/orders', label: 'Orders', icon: '📋' },
  { href: '/admin/tables', label: 'Tables', icon: '🪑' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const user = getUser();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍴</span>
              <span className="font-bold text-dark-900">Golden Fork</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.href} href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-stone-500 hover:text-dark-900 hover:bg-stone-50'
                  }`}>
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/kitchen" className="text-sm text-stone-500 hover:text-brand-500 transition-colors">
              🖥️ Kitchen
            </Link>
            <span className="text-sm text-stone-400">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm text-stone-400 hover:text-red-500 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center py-1 px-3 text-xs ${
                pathname === item.href ? 'text-brand-500' : 'text-stone-400'
              }`}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
