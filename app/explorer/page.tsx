'use client';
import { useState, useEffect, Suspense, useCallback } from 'react';
import ExplorerMap from '@/components/ExplorerMap';
import JamieChat from '@/components/JamieChat';
import { FaMapMarkedAlt, FaSearch, FaBolt, FaRoute, FaHeartbeat } from 'react-icons/fa';
import { calculatePulseScore } from '@/lib/intelligence/neighborhoodIntelligence';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeProvider';
import type { AtlasPulsePlace } from '@/components/explorer/AtlasPulseMarker';

type AtlasPulseState = {
  name: string;
  scope: string;
  progress: {
    percent: number;
    boundPlaces: number;
    livePlaces: number;
    totalSeededPlaces: number;
    plannedRegions: number;
  };
  places: AtlasPulsePlace[];
};

function ExplorerContent() {
  const { intelligence } = useTheme();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  const [selection, setSelection] = useState<any>(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [areaIntel, setAreaIntel] = useState({ pulseScore: 0, tourRecommendation: '' });
  const [atlasPulse, setAtlasPulse] = useState<AtlasPulseState | null>(null);

  const fetchProperties = useCallback(async () => {
    if (!selection) return;
    setLoading(true);
    try {
      const url = selection.type === 'polygon' 
        ? `/api/properties/search?polygon=${selection.data}`
        : `/api/properties/search?radius=${selection.data}`;
      
      const res = await fetch(url);
      const json = await res.json();
      
      // Fix: Standardized API response uses data.data for payload
      const data = json.data || json;
      const propertyArray = Array.isArray(data) ? data : (data.properties || [data]);
      // Ensure we filter out any potential non-object artifacts if data was a single object
      const finalArray = Array.isArray(propertyArray) ? propertyArray.filter(p => typeof p === 'object' && p !== null) : [];
      setProperties(finalArray as any);

      // Calculate area-wide market context
      if (finalArray.length > 0) {
        const totalScore = finalArray.reduce((acc: number, p: any) => 
          acc + calculatePulseScore(p.location_geo?.coordinates || [0,0], [], intelligence.grill.coordinates), 0);
        const avgScore = Math.round(totalScore / finalArray.length);
        
        setAreaIntel({
          pulseScore: avgScore,
          tourRecommendation: finalArray.length > 1 
            ? `Suggested tour starts at ${finalArray[0].name}. A clockwise route may make the best use of daylight.`
            : 'One property is available in this area.'
        });
      } else {
        setAreaIntel({ pulseScore: 0, tourRecommendation: 'No properties found in this area.' });
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [selection, intelligence.grill.coordinates]);

  // Initial load for all properties or specific target
  useEffect(() => {
    const initializeExplorer = async () => {
      setLoading(true);
      try {
        if (targetId) {
          const res = await fetch(`/api/properties/${targetId}`);
          if (res.ok) {
            const json = await res.json();
            const property = json.data || json;
            setProperties([property]);
            
            setAreaIntel({
              pulseScore: calculatePulseScore(property.location_geo?.coordinates || [0,0], [], intelligence.grill.coordinates),
              tourRecommendation: `Selected property: ${property.name}. Local context is available.`
            });
          }
        } else {
          // Fetch all properties for the full property view
          const res = await fetch('/api/properties?pageSize=100');
          if (res.ok) {
            const json = await res.json();
            const data = json.data || json;
            setProperties(data.properties || []);
          }
        }
      } catch (error) {
        console.error('Failed to initialize explorer grid:', error);
      } finally {
        setLoading(false);
      }
    };
    initializeExplorer();
  }, [targetId, intelligence.grill.coordinates]);

  useEffect(() => {
    const loadAtlasPulse = async () => {
      try {
        const res = await fetch('/api/atlas-pulse', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        setAtlasPulse(json.atlasPulse || null);
      } catch (error) {
        console.error('Failed to load Atlas Pulse layer:', error);
      }
    };

    loadAtlasPulse();
  }, []);

  // Sync selection with Jamie
  useEffect(() => {
    if (selection) {
      fetchProperties();
    }
  }, [selection, fetchProperties]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      {/* Full-Screen Map Layer */}
      <div className="absolute inset-0">
        <ExplorerMap
          onSelectionChange={setSelection}
          results={properties}
          atlasPulsePlaces={atlasPulse?.places || []}
        />
      </div>

      {atlasPulse && <AtlasPulseExplorerPanel atlasPulse={atlasPulse} />}

      {/* Stats Overlay (Left) */}
      {selection && (
        <div className={`absolute left-16 z-10 animate-in slide-in-from-left-10 duration-500 ${atlasPulse ? 'top-48' : 'top-5'}`}>
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
                  <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Lifestyle Pulse</p>
                  <p className="text-sm font-bold text-green-400 flex items-center gap-1">
                    <FaHeartbeat /> {areaIntel.pulseScore}%
                  </p>
                </div>
              </div>

              {areaIntel.tourRecommendation && (
                <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1 text-[8px] font-black text-blue-400 uppercase tracking-widest">
                    <FaRoute /> Suggested Tour Route
                  </div>
                  <p className="text-[10px] text-white/80 italic leading-relaxed">
                    {areaIntel.tourRecommendation}
                  </p>
                </div>
              )}
              
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic border-t border-white/5 pt-3">
                Selection includes {selection.type === 'polygon' ? 'a custom-defined area' : 'a radius around your point'}. Jamie can review nearby activity, local context, and property yield estimates for this area.
              </p>

              {/* Location context */}
              <div className="mt-4 p-4 bg-orange-600/10 border border-orange-500/20 rounded-2xl group hover:bg-orange-600/20 transition-all">
                <h4 className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Location Context</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Review neighborhood flow and property proximity in real time. Spatial search helps compare areas beyond a standard list view.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jamie Integration (Floating Chat) */}
      <JamieChat propertyData={properties} />

      {/* Narrative Status Overlay (Bottom Right) */}
      <div className="absolute bottom-10 right-10 z-20 flex flex-col items-end gap-2 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-1000">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </div>
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">MLS Feed: Active</span>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-xl flex items-center gap-2 opacity-50">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Search Latency: &lt;10ms</span>
        </div>
      </div>
      
      {/* Global Navigation Link */}
      <div className="absolute bottom-10 left-10 z-20">
        <a 
          href="/properties" 
          className="flex items-center gap-3 bg-white text-black px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-blue-600 hover:text-white transition-all group"
        >
          <FaSearch className="group-hover:rotate-12 transition-transform" />
          Back to Properties
        </a>
      </div>
    </main>
  );
}

function AtlasPulseExplorerPanel({ atlasPulse }: { atlasPulse: AtlasPulseState }) {
  const leadPlace = atlasPulse.places[0];

  return (
    <div className="absolute left-16 top-5 z-10 w-[350px] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200/20 bg-slate-950/85 p-4 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-200">
            <FaMapMarkedAlt />
            <p className="text-[10px] font-black uppercase tracking-[0.24em]">Atlas Pulse</p>
          </div>
          <h2 className="mt-2 text-lg font-black">Physical TAH Layer</h2>
        </div>
        <div className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 font-mono text-xs text-amber-100">
          {atlasPulse.progress.percent}%
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-amber-300" style={{ width: `${atlasPulse.progress.percent}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Bound</p>
          <p className="mt-1 text-sm font-black text-amber-100">{atlasPulse.progress.boundPlaces}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Seeded</p>
          <p className="mt-1 text-sm font-black text-amber-100">{atlasPulse.progress.totalSeededPlaces}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2">
          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">Regions</p>
          <p className="mt-1 text-sm font-black text-amber-100">{atlasPulse.progress.plannedRegions}</p>
        </div>
      </div>

      {leadPlace && (
        <p className="mt-4 text-xs leading-5 text-slate-300">
          <FaBolt className="mr-2 inline text-amber-300" />
          {leadPlace.name} is live as the first bound place marker. Click the amber marker for its physical TAH detail.
        </p>
      )}

      <a
        href="/atlas"
        className="mt-4 inline-flex rounded-full bg-amber-300 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-white"
      >
        Open Atlas Pulse
      </a>
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white font-black uppercase tracking-widest">Initializing Map Explorer...</div>}>
      <ExplorerContent />
    </Suspense>
  );
}
