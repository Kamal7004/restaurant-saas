'use client';

import { useEffect, useState } from 'react';
import { menuApi } from '@/lib/api';
import { MenuItem, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', is_available: true, is_featured: false, prep_time_minutes: '15' });

  const loadData = async () => {
    try {
      const [itemsData, catsData] = await Promise.all([menuApi.getItems(), menuApi.getCategories()]);
      setItems(itemsData as MenuItem[]);
      setCategories(catsData as Category[]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category_id: '', is_available: true, is_featured: false, prep_time_minutes: '15' });
    setEditItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name: item.name, description: item.description || '', price: String(item.price),
      category_id: item.category_id || '', is_available: !!item.is_available, is_featured: !!item.is_featured,
      prep_time_minutes: String(item.prep_time_minutes || 15)
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...form, price: parseFloat(form.price), prep_time_minutes: parseInt(form.prep_time_minutes) };
      if (editItem) {
        await menuApi.updateItem(editItem.id, data);
      } else {
        await menuApi.createItem(data);
      }
      resetForm();
      loadData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try { await menuApi.deleteItem(id); loadData(); }
    catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Menu Management</h1>
          <p className="text-stone-500 mt-1">{items.length} items across {categories.length} categories</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
          + Add Item
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h3 className="font-semibold text-dark-900 mb-4">{editItem ? 'Edit Item' : 'Add New Item'}</h3>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-dark-900 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-900 mb-1">Price ($)</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-dark-900 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-900 mb-1">Category</label>
              <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-900 mb-1">Prep Time (min)</label>
              <input type="number" value={form.prep_time_minutes} onChange={e => setForm({...form, prep_time_minutes: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:border-brand-400 outline-none text-sm" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_available} onChange={e => setForm({...form, is_available: e.target.checked})} className="rounded" />
                <span className="text-sm">Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} className="rounded" />
                <span className="text-sm">Featured</span>
              </label>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors">Cancel</button>
              <button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                {editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {['Item', 'Category', 'Price', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-semibold text-dark-900">{item.name}</span>
                      {item.is_featured ? <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ Featured</span> : null}
                      <p className="text-stone-400 text-xs mt-0.5 truncate max-w-xs">{item.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-stone-500 text-sm">{item.category_name || '—'}</span></td>
                  <td className="px-6 py-4"><span className="font-semibold text-dark-900">{formatCurrency(item.price)}</span></td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(item)} className="text-sm text-brand-500 hover:text-brand-600 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-sm text-red-400 hover:text-red-500 transition-colors">Delete</button>
                    </div>
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
