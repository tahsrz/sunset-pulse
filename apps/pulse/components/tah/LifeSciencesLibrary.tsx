'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Network, Info, Database } from 'lucide-react';
import { LifeSciencesShard } from './LifeSciencesShard';
import type { CartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';

type LifeSciencesLibraryProps = {
  metadata: CartridgeMetadata;
  initialPreviews: any[];
};

export function LifeSciencesLibrary({ metadata, initialPreviews }: LifeSciencesLibraryProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(initialPreviews);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(initialPreviews);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/tah?q=${encodeURIComponent(query)}&limit=20`);
        const data = await response.json();
        // Filter results for this specific cartridge
        const filtered = data.results.filter((r: any) => r.source === metadata.source);
        setResults(filtered);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, initialPreviews, metadata.source]);

  const handleNavigate = async (index: number) => {
    // In a real implementation, we would have a specific API to get a shard by index
    // For now, let's search for a unique string if we can, or just show an info message
    alert(`Navigating to shard index ${index} via WebGraph. (Implementation pending shard-by-index API)`);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
          {isSearching ? <Loader2 size={20} className="animate-spin text-lime-400" /> : <Search size={20} />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${metadata.shardCount} taxa in ${metadata.displayTitle}...`}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-5 pl-12 pr-6 text-xl text-white outline-none transition focus:border-lime-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-lime-400/10"
        />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {results.length > 0 ? (
          results.map((result, i) => (
            <LifeSciencesShard 
              key={i} 
              text={result.text} 
              links={result.links || []} 
              onNavigate={handleNavigate}
            />
          ))
        ) : (
          <div className="col-span-2 rounded-2xl border border-dashed border-white/10 p-20 text-center">
            <Info className="mx-auto mb-4 text-slate-500" size={48} />
            <h3 className="text-xl font-bold text-white">No taxa found</h3>
            <p className="mt-2 text-slate-400">Try searching for a kingdom (Animalia), rank (genus), or specific scientific name.</p>
          </div>
        )}
      </div>

      <div className="mt-12 flex items-center justify-center gap-8 border-t border-white/5 pt-12 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-600">
        <div className="flex items-center gap-2">
          <Network size={16} />
          <span>Graph Navigation Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <Database size={16} />
          <span>{metadata.shardCount} Indexed Shards</span>
        </div>
      </div>
    </div>
  );
}
