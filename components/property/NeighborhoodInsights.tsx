'use client';

import React, { useState } from 'react';
import { FaSchool, FaHospital, FaBus, FaSatellite, FaShieldAlt, FaBrain, FaMapMarkerAlt } from 'react-icons/fa';
import Spinner from '@/components/Spinner';

interface InsightsData {
  neighborhood: {
    pulseScore: number;
    hub: {
      name: string;
      distance: number;
      unit: string;
      status: string;
    };
    schools: { count: number; proximity: string; rating: string };
    hospitals: { count: number; proximity: string; type: string };
    transit: { nodes: number; score: string };
    amenities: { total: number };
  };
}

const NeighborhoodInsights = ({ propertyId }: { propertyId: string }) => {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/properties/${propertyId}/recon`);
      if (!res.ok) throw new Error('Insights retrieval failed');
      const result = await res.json();
      setData(result.data || result);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-slate-900 border border-blue-500/20 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:border-blue-500/40">
      {!data && !loading && (
        <div className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <FaSatellite size={40} className="text-blue-500 animate-pulse" />
          </div>
          <h3 className="text-white font-black uppercase tracking-widest mb-4">Neighborhood Insights</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Analyze local area data for schools, medical facilities, and transit options.
          </p>
          <button 
            onClick={fetchInsights}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-full transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            Retrieve Insights
          </button>
        </div>
      )}

      {loading && (
        <div className="p-12 flex flex-col items-center gap-4">
          <Spinner loading={loading} />
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Synchronizing Neural Grid...</p>
        </div>
      )}

      {error && (
        <div className="p-8 text-center">
          <p className="text-red-400 text-xs font-bold uppercase">Data Retrieval Failed. Retrying...</p>
          <button onClick={fetchInsights} className="mt-4 text-blue-400 underline text-xs">Refresh</button>
        </div>
      )}

      {data && (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4 mb-1">
                Local Insights <span className="text-[8px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded not-italic tracking-widest ml-2">LIVE_FEED</span>
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] pl-5">Cognitive Reconnaissance Active</p>
            </div>
            
            <div className="text-right">
              <div className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Pulse Score</div>
              <div className="text-4xl font-black text-white italic tracking-tighter">
                {data.neighborhood.pulseScore}<span className="text-blue-500">/100</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NEURAL HUB */}
            <div className="md:col-span-2 bg-blue-600/5 border border-blue-500/20 p-6 rounded-xl flex items-center justify-between group hover:bg-blue-600/10 transition-all">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <FaBrain size={24} className="group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <div className="text-blue-500 text-[8px] font-black uppercase tracking-[0.4em] mb-1">Neural Hub Proximity</div>
                  <div className="text-white text-lg font-black uppercase tracking-tighter italic">{data.neighborhood.hub.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-mono">DISTANCE: {data.neighborhood.hub.distance} {data.neighborhood.hub.unit}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${data.neighborhood.hub.status === 'TACTICAL_ADVANTAGE' ? 'text-green-400' : 'text-blue-400'}`}>
                      {data.neighborhood.hub.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:block">
                <FaMapMarkerAlt className="text-blue-500/30 group-hover:text-blue-500 transition-colors" size={32} />
              </div>
            </div>

            {/* SCHOOLS */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                <FaSchool size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Education Facilities</div>
                <div className="text-white font-bold">{data.neighborhood.schools.count} Identified</div>
                <div className="text-[10px] text-blue-400/80 font-mono mt-1">PROXIMITY: {data.neighborhood.schools.proximity} // RATING: {data.neighborhood.schools.rating}</div>
              </div>
            </div>

            {/* HOSPITALS */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                <FaHospital size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Medical Facilities</div>
                <div className="text-white font-bold">{data.neighborhood.hospitals.count} Nearby</div>
                <div className="text-[10px] text-red-400/80 font-mono mt-1">PROXIMITY: {data.neighborhood.hospitals.proximity} // TYPE: {data.neighborhood.hospitals.type}</div>
              </div>
            </div>

            {/* TRANSIT */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                <FaBus size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Transit Access</div>
                <div className="text-white font-bold">{data.neighborhood.transit.nodes} Stations</div>
                <div className="text-[10px] text-green-400/80 font-mono mt-1">ACCESS SCORE: {data.neighborhood.transit.score}</div>
              </div>
            </div>

            {/* GENERAL AMENITIES */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
                <FaSatellite size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Point Density</div>
                <div className="text-white font-bold">{data.neighborhood.amenities.total} Locations</div>
                <div className="text-[10px] text-yellow-400/80 font-mono mt-1">DENSITY: HIGH // REGION: ANALYZED</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
            <div className="flex items-center gap-2 text-green-400 text-[10px] font-black uppercase tracking-widest">
              <FaShieldAlt className="animate-pulse" /> Jamie System Verified
            </div>
            <button 
              onClick={() => setData(null)}
              className="text-[9px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-black underline decoration-slate-700 transition-colors"
            >
              Flush Cached Signals
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodInsights;
