'use client';

import { useEffect, useState } from 'react';
import { tableApi } from '@/lib/api';
import { Table } from '@/lib/types';

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ table_number: '', name: '', capacity: '4' });
  const [qrData, setQrData] = useState<{ tableId: string; url: string; dataUrl: string } | null>(null);

  const loadTables = async () => {
    try { const data = await tableApi.getTables(); setTables(data as Table[]); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTables(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tableApi.createTable({ table_number: parseInt(form.table_number), name: form.name, capacity: parseInt(form.capacity) });
      setShowForm(false);
      setForm({ table_number: '', name: '', capacity: '4' });
      loadTables();
    } catch (err) { console.error(err); }
  };

  const generateQR = async (tableId: string) => {
    try {
      const data = await tableApi.generateQR(tableId);
      setQrData({ tableId, url: (data as any).table_url, dataUrl: (data as any).qr_code_url });
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Tables & QR Codes</h1>
          <p className="text-stone-500 mt-1">{tables.length} tables</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">+ Add Table</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <form onSubmit={handleCreate} className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-semibold text-dark-900 mb-1">Table #</label>
              <input type="number" value={form.table_number} onChange={e => setForm({...form, table_number: e.target.value})} required
                className="w-24 px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-900 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                className="w-48 px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-900 mb-1">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})}
                className="w-24 px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" />
            </div>
            <button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">Create</button>
          </form>
        </div>
      )}

      {qrData && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm text-center">
          <h3 className="font-semibold text-dark-900 mb-3">QR Code</h3>
          <img src={qrData.dataUrl} alt="QR Code" className="mx-auto w-48 h-48 mb-3" />
          <p className="text-stone-400 text-xs break-all">{qrData.url}</p>
          <button onClick={() => setQrData(null)} className="mt-3 text-sm text-stone-400 hover:text-stone-600 transition-colors">Close</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm card-hover">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-lg font-bold text-brand-600">{table.table_number}</div>
                <div>
                  <p className="font-semibold text-dark-900">{table.name}</p>
                  <p className="text-stone-400 text-xs">Seats {table.capacity}</p>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full ${table.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <button onClick={() => generateQR(table.id)}
              className="w-full bg-stone-50 hover:bg-stone-100 text-dark-900 py-2 rounded-xl text-sm font-medium transition-colors">
              📱 Generate QR Code
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
