'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50 to-amber-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🍴</span>
          <span className="font-bold text-xl text-dark-900">The Golden Fork</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-stone-500 hover:text-dark-900 font-semibold text-sm transition-colors">
            Login
          </Link>
          <Link href="/signup" className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">
            Sign Up →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 py-20 text-center">
        <div className="animate-fade-in">
          <div className="text-7xl mb-6">🍽️</div>
          <h1 className="text-5xl md:text-6xl font-bold text-dark-900 mb-6 leading-tight">
            Restaurant SaaS<br />
            <span className="text-brand-500">QR Code Ordering</span>
          </h1>
          <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-10">
            Scan, browse the menu, order from your table — no waiting, no hassle. 
            Real-time kitchen display and admin dashboard included.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/signup" className="bg-dark-900 hover:bg-dark-800 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors shadow-lg shadow-stone-200">
              Get Started →
            </Link>
            <Link href="/kitchen" className="bg-white border border-stone-200 hover:border-brand-300 text-dark-900 px-8 py-3.5 rounded-xl font-semibold transition-colors shadow-sm">
              Kitchen Display
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '📱', title: 'QR Code Ordering', desc: 'Customers scan a QR code at their table to browse the menu and place orders instantly.' },
            { icon: '👨‍🍳', title: 'Kitchen Display', desc: 'Real-time order updates via Socket.io. Kitchen staff see new orders immediately.' },
            { icon: '📊', title: 'Admin Dashboard', desc: 'Track orders, manage menu items, view stats, and generate QR codes for tables.' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm card-hover">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg text-dark-900 mb-2">{f.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* URLs */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-bold text-dark-900 mb-6 text-center">Quick Links</h2>
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="grid gap-3">
            {[
              { url: '/admin/dashboard', label: 'Admin Dashboard', desc: 'Manage restaurant' },
              { url: '/admin/menu', label: 'Menu Management', desc: 'Add/edit menu items' },
              { url: '/admin/orders', label: 'Order Management', desc: 'View all orders' },
              { url: '/admin/tables', label: 'Tables & QR Codes', desc: 'Manage tables' },
              { url: '/kitchen', label: 'Kitchen Display', desc: 'Live order screen' },
            ].map((link, i) => (
              <Link key={i} href={link.url} className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-colors group">
                <div>
                  <span className="font-semibold text-dark-900 group-hover:text-brand-500 transition-colors">{link.label}</span>
                  <span className="text-stone-400 text-sm ml-3">{link.desc}</span>
                </div>
                <span className="text-stone-300 group-hover:text-brand-500 transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-stone-400 text-sm">
        <p>🍴 The Golden Fork SaaS Platform</p>
        <p className="mt-1">Default login: admin@goldenfork.com / admin123</p>
      </footer>
    </div>
  );
}
