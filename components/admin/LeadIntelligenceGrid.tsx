'use client';

import React, { useState } from 'react';
import LeadCard from './LeadCard';
import { FaFilter, FaSearch } from 'react-icons/fa';

interface LeadIntelligenceGridProps {
  leads: any[];
  onReengage: (id: string) => void;
  reengagingId: string | null;
}

const LeadIntelligenceGrid: React.FC<LeadIntelligenceGridProps> = ({ leads, onReengage, reengagingId }) => {
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredLeads = leads.filter(l => {
    const statusMatch = filter === 'all' || l.status === filter;
    const categoryMatch = categoryFilter === 'all' || l.leadCategory === categoryFilter;
    const searchMatch = l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5'>
        <div className='flex items-center gap-4 flex-grow max-w-md'>
          <div className='relative flex-grow'>
            <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' size={12} />
            <input 
              type='text' 
              placeholder='Search leads...' 
              className='w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <div className='flex bg-black/40 p-1 rounded-xl border border-white/10'>
            {['all', 'New', 'Contacted'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                  filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredLeads.map(lead => (
          <LeadCard 
            key={lead._id} 
            lead={lead} 
            onReengage={onReengage} 
            reengagingId={reengagingId} 
          />
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <div className='text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/5'>
          <div className='text-slate-600 font-black uppercase tracking-[0.3em] text-xs mb-2'>No Results</div>
          <div className='text-[10px] text-slate-700 font-mono'>No leads match the current filters.</div>
        </div>
      )}
    </div>
  );
};

export default LeadIntelligenceGrid;
