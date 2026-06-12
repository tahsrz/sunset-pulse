'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaUtensils, FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface MenuItem {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isAvailable: boolean;
}

type BulkImportRow = {
  sourceName: string;
  price: number | null;
  item?: MenuItem;
  confidence: 'exact' | 'close' | 'review' | 'none';
  reason: string;
};

const normalizeProductName = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(oz|ounce|ounces)\b/g, 'oz')
    .replace(/\b(liter|litre)\b/g, 'liter')
    .replace(/\s+/g, ' ')
    .trim();

const productTokens = (value: string) =>
  normalizeProductName(value)
    .split(' ')
    .filter((token) => token.length > 1);

function parseBulkPriceLines(input: string, items: MenuItem[]): BulkImportRow[] {
  const normalizedItems = items.map((item) => ({
    item,
    normalizedName: normalizeProductName(item.name),
    tokens: productTokens(item.name),
  }));

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s+\$?(\d+(?:\.\d{1,2})?)$/);

      if (!match) {
        return {
          sourceName: line,
          price: null,
          confidence: 'none',
          reason: 'Line needs a product name followed by a price.',
        };
      }

      const sourceName = match[1].trim();
      const price = Number(match[2]);
      const normalizedSource = normalizeProductName(sourceName);
      const exactMatch = normalizedItems.find(({ normalizedName }) => normalizedName === normalizedSource);

      if (exactMatch) {
        return {
          sourceName,
          price,
          item: exactMatch.item,
          confidence: 'exact',
          reason: 'Exact name match.',
        };
      }

      const containedMatch = normalizedItems.find(
        ({ normalizedName }) =>
          normalizedName.includes(normalizedSource) || normalizedSource.includes(normalizedName)
      );

      if (containedMatch) {
        return {
          sourceName,
          price,
          item: containedMatch.item,
          confidence: 'close',
          reason: 'Close name match.',
        };
      }

      const sourceTokens = productTokens(sourceName);
      const scoredMatches = normalizedItems
        .map(({ item, tokens }) => {
          const overlap = sourceTokens.filter((token) => tokens.includes(token)).length;
          const score = overlap / Math.max(sourceTokens.length, tokens.length, 1);
          return { item, score };
        })
        .filter(({ score }) => score >= 0.5)
        .sort((a, b) => b.score - a.score);

      if (scoredMatches[0]) {
        return {
          sourceName,
          price,
          item: scoredMatches[0].item,
          confidence: 'review',
          reason: 'Token match. Review before applying.',
        };
      }

      return {
        sourceName,
        price,
        confidence: 'none',
        reason: 'No menu item match found.',
      };
    });
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
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);
  const bulkRows = parseBulkPriceLines(bulkText, items);
  const applicableBulkRows = bulkRows.filter(
    (row) => row.item?._id && row.price !== null && row.confidence !== 'none'
  );
  const changedBulkRows = applicableBulkRows.filter((row) => row.item && row.price !== row.item.price);

  const fetchMenu = useCallback(async () => {
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
  }, [agentId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

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

  const handleApplyBulkImport = async () => {
    if (changedBulkRows.length === 0) {
      toast.info('No matched price changes to apply.');
      return;
    }

    setApplyingBulk(true);
    try {
      const failures: string[] = [];

      for (const row of changedBulkRows) {
        if (!row.item?._id || row.price === null) continue;

        const res = await fetch('/api/menu', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: row.item._id,
            price: row.price,
          }),
        });

        if (!res.ok) {
          failures.push(row.sourceName);
        }
      }

      if (failures.length > 0) {
        toast.error(`Bulk import updated with ${failures.length} failed item${failures.length === 1 ? '' : 's'}.`);
      } else {
        toast.success(`Applied ${changedBulkRows.length} menu price update${changedBulkRows.length === 1 ? '' : 's'}.`);
        setBulkText('');
        setShowBulkImporter(false);
      }

      fetchMenu();
    } catch (error) {
      toast.error('Bulk price import failed.');
    } finally {
      setApplyingBulk(false);
    }
  };

  const categories = ['Burger', 'Sides', 'Drinks', 'Intelligence', 'Specials'];

  return (
    <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 mt-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-2 flex items-center gap-2">
            <FaUtensils /> Tactical Menu Architect
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Manage Hub Products & Intelligence Units</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowBulkImporter(!showBulkImporter)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all"
          >
            {showBulkImporter ? <FaTimes /> : <FaCheckCircle />} {showBulkImporter ? 'Cancel' : 'Bulk Prices'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all"
          >
            {showAddForm ? <FaTimes /> : <FaPlus />} {showAddForm ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </header>

      {showBulkImporter && (
        <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div>
              <label htmlFor="bulk-price-import" className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2">
                Paste price list
              </label>
              <textarea
                id="bulk-price-import"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'Beef Jerky 9.99\nCandy Bar 2.79\nMonster Large 4.89'}
                className="w-full min-h-56 bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-xs text-white focus:border-emerald-500 outline-none font-mono leading-6"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleApplyBulkImport}
                  disabled={applyingBulk || changedBulkRows.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[10px] rounded-lg px-4 py-2"
                >
                  {applyingBulk ? 'Applying...' : `Apply ${changedBulkRows.length} Changes`}
                </button>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  {applicableBulkRows.length} matched / {bulkRows.length} parsed
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 overflow-hidden overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[1fr_1fr_0.7fr_0.8fr] bg-slate-900 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>Input</span>
                  <span>Matched Item</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                {bulkRows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[10px] text-slate-600 uppercase tracking-widest font-black">
                    Paste one product and price per line to preview matches.
                  </div>
                ) : (
                  bulkRows.map((row, index) => {
                    const changed = row.item && row.price !== null && row.price !== row.item.price;
                    const statusClass =
                      row.confidence === 'exact'
                        ? 'text-emerald-300'
                        : row.confidence === 'close'
                          ? 'text-cyan-300'
                          : row.confidence === 'review'
                            ? 'text-amber-300'
                            : 'text-red-300';

                    return (
                      <div
                        key={`${row.sourceName}-${index}`}
                        className="grid grid-cols-[1fr_1fr_0.7fr_0.8fr] gap-3 border-t border-white/10 px-4 py-3 text-[11px] text-slate-300"
                      >
                        <span className="font-bold text-white">{row.sourceName}</span>
                        <span>{row.item ? row.item.name : 'No match'}</span>
                        <span className="text-right font-mono">
                          {row.price === null ? 'Invalid' : (
                            <>
                              {row.item && <span className="text-slate-600">${row.item.price.toFixed(2)} {'->'} </span>}
                              <span className={changed ? 'text-emerald-300' : 'text-slate-400'}>${row.price.toFixed(2)}</span>
                            </>
                          )}
                        </span>
                        <span className={`text-right font-black uppercase tracking-widest ${statusClass}`}>
                          {row.confidence === 'none' ? row.reason : row.confidence}
                        </span>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
