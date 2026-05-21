'use client';
import { useState, useEffect, Suspense, useCallback } from 'react';
import ExplorerMap from '@/components/ExplorerMap';
import JamieChat from '@/components/JamieChat';
import { FaMapMarkedAlt, FaSearch, FaBolt, FaRoute, FaHeartbeat } from 'react-icons/fa';
import { calculatePulseScore } from '@/lib/intelligence/neighborhoodIntelligence';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeProvider';

function ExplorerContent() {
  const { intelligence } = useTheme();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  const [selection, setSelection] = useState<any>(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [areaIntel, setAreaIntel] = useState({ pulseScore: 0, tourRecommendation: '' });

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
                  <p className="text-[8px] text-slate-500 uppercase font-black mb-1">
                    {properties.filter((p: any) => (p.price || 0) > 0).length >= properties.filter((p: any) => (p.rates?.monthly || 0) > 0).length 
                      ? 'Avg Sale Price' 
                      : 'Avg Monthly Rent'}
                  </p>
                  <p className="text-sm font-bold text-blue-400">
                    ${properties.length > 0 
                      ? (() => {
                          const sales = properties.filter((p: any) => (p.price || 0) > 0);
                          const rentals = properties.filter((p: any) => (p.rates?.monthly || 0) > 0);
                          
                          if (sales.length >= rentals.length && sales.length > 0) {
                            return Math.round(sales.reduce((acc, p: any) => acc + (p.price || 0), 0) / sales.length).toLocaleString();
                          } else if (rentals.length > 0) {
                            return Math.round(rentals.reduce((acc, p: any) => acc + (p.rates.monthly || 0), 0) / rentals.length).toLocaleString();
                          }
                          return '0';
                        })()
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

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-white font-black uppercase tracking-widest">Initializing Map Explorer...</div>}>
      <ExplorerContent />
    </Suspense>
  );
}
