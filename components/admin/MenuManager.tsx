'use client';

import { useState, useEffect } from 'react';
import { FaUtensils, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface MenuItem {
  _id?: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isAvailable: boolean;
}

export default function MenuManager({ agentId = 'taz-realty-001' }: { agentId?: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState<MenuItem>({
    name: '',
    price: 0,
    description: '',
    category: 'Intelligence',
    isAvailable: true
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/menu?agentId=${agentId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      toast.error('Failed to load tactical menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [agentId]);

  const handleAdd = async () => {
    if (!newItem.name || newItem.price <= 0) {
      toast.warning('Name and valid Price required.');
      return;
    }

    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, agentId })
      });

      if (res.ok) {
        toast.success('Product added to grid.');
        setNewItem({ name: '', price: 0, description: '', category: 'Intelligence', isAvailable: true });
        setShowAddForm(false);
        fetchMenu();
      }
    } catch (error) {
      toast.error('Failed to deploy product.');
    }
  };

  const handleUpdate = async (item: MenuItem) => {
    try {
      const res = await fetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (res.ok) {
        toast.success('Grid item updated.');
        setEditingItem(null);
        fetchMenu();
      }
    } catch (error) {
      toast.error('Update failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Purge this item from the intelligence hub?')) return;

    try {
      const res = await fetch(`/api/menu?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.info('Item purged.');
        fetchMenu();
      }
    } catch (error) {
      toast.error('Purge failed.');
    }
  };

  const categories = ['Burger', 'Sides', 'Drinks', 'Intelligence', 'Specials'];

  return (
    <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 mt-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-2 flex items-center gap-2">
            <FaUtensils /> Tactical Menu Architect
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Manage Hub Products & Intelligence Units</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all"
        >
          {showAddForm ? <FaTimes /> : <FaPlus />} {showAddForm ? 'Cancel' : 'Add Item'}
        </button>
      </header>

      {showAddForm && (
        <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input 
              type="text" 
              placeholder="Product Name"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:border-blue-500 outline-none"
            />
            <input 
              type="number" 
              placeholder="Price"
              value={newItem.price || ''}
              onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value)})}
              className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:border-blue-500 outline-none"
            />
            <select 
              value={newItem.category}
              onChange={(e) => setNewItem({...newItem, category: e.target.value})}
              className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:border-blue-500 outline-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button 
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] rounded-lg"
            >
              Deploy to Menu
            </button>
            <div className="md:col-span-2 lg:col-span-4">
              <textarea 
                placeholder="Product Description (Tactical usage or ingredients)"
                value={newItem.description}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:border-blue-500 outline-none h-20 mt-2"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500 animate-pulse text-[10px] font-black uppercase tracking-widest">
          Synchronizing Hub Products...
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item._id} className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-500/20 transition-all">
              {editingItem?._id === item._id ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                   <input 
                    type="text" 
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1 text-xs text-white"
                  />
                   <input 
                    type="number" 
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1 text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(editingItem)} className="bg-green-600 p-2 rounded-lg text-white hover:bg-green-500"><FaSave size={12}/></button>
                    <button onClick={() => setEditingItem(null)} className="bg-slate-700 p-2 rounded-lg text-white hover:bg-slate-600"><FaTimes size={12}/></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-bold text-sm tracking-tight">{item.name}</h3>
                      <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase font-black tracking-widest">
                        {item.category}
                      </span>
                      {!item.isAvailable && (
                        <span className="text-[8px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded uppercase font-black tracking-widest">
                          Offline
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 italic leading-relaxed">{item.description || 'No tactical brief available.'}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[8px] text-slate-600 uppercase font-black mb-0.5">Yield</div>
                      <div className="text-sm font-black text-blue-400 font-mono">${item.price.toFixed(2)}</div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item._id!)}
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {items.length === 0 && (
            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
              <FaExclamationCircle className="mx-auto text-slate-700 mb-3" size={24} />
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-[0.2em]">No products identified in current sector.</p>
            </div>
          )}
        </div>
      )}

      <footer className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest italic">Grid Persistence Active</span>
        </div>
        <p className="text-[9px] text-slate-600 italic">"What the agent serves, the neighborhood consumes." — Jamie</p>
      </footer>
    </section>
  );
}
