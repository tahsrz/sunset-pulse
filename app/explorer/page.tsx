'use client';
import { useState, useEffect, Suspense } from 'react';
import ExplorerMap from '@/components/ExplorerMap';
import JamieChat from '@/components/JamieChat';
import { FaMapMarkedAlt, FaSearch } from 'react-icons/fa';

function ExplorerContent() {
  const [selection, setSelection] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sync selection with Jamie
  useEffect(() => {
    if (selection) {
      fetchProperties();
    }
  }, [selection]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const url = selection.type === 'polygon' 
        ? `/api/properties/search?polygon=${selection.data}`
        : `/api/properties/search?radius=${selection.data}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setProperties(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      {/* Full-Screen Map Layer */}
      <div className="absolute inset-0">
        <ExplorerMap onSelectionChange={setSelection} results={properties} />
      </div>

      {/* Stats Overlay (Left) */}
      {selection && (
        <div className="absolute top-5 left-16 z-10 animate-in slide-in-from-left-10 duration-500">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white italic">Area Analysis</h2>
              <div className="bg-blue-600 px-2 py-1 rounded-md text-[8px] font-black text-white uppercase">
                {loading ? 'Analyzing...' : `${properties.length} Results`}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Avg Rent</p>
                  <p className="text-sm font-bold text-blue-400">
                    ${properties.length > 0 
                      ? Math.round(properties.reduce((acc, p) => acc + (p.rates.monthly || 0), 0) / properties.length).toLocaleString()
                      : '0'}
                  </p>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Density</p>
                  <p className="text-sm font-bold text-white">High</p>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                "Selection encompasses {selection.type === 'polygon' ? 'a custom-defined area' : 'a radius around your point'}. Jamie is now analyzing local business metrics and property yields for this specific coordinate block."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Jamie Integration (Floating Chat) */}
      <JamieChat propertyData={properties} />
      
      {/* Global Navigation Link */}
      <div className="absolute bottom-10 left-10 z-20">
        <a 
          href="/properties" 
          className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-blue-600 hover:text-white transition-all group"
        >
          <FaSearch className="group-hover:rotate-12 transition-transform" />
          Back to Grid
        </a>
      </div>
    </main>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white font-black uppercase tracking-widest">Initializing Map Explorer...</div>}>
      <ExplorerContent />
    </Suspense>
  );
}