'use client';

import React, { useState } from 'react';
import { FaSchool, FaHospital, FaBus, FaSatellite, FaShieldAlt } from 'react-icons/fa';
import Spinner from '@/components/Spinner';

interface ReconData {
  neighborhood: {
    schools: { count: number; proximity: string; rating: string };
    hospitals: { count: number; proximity: string; type: string };
    transit: { nodes: number; score: string };
    amenities: { total: number };
  };
}

const NeighborhoodRecon = ({ propertyId }: { propertyId: string }) => {
  const [data, setData] = useState<ReconData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const performRecon = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/properties/${propertyId}/recon`);
      if (!res.ok) throw new Error('Recon failed');
      const reconData = await res.json();
      setData(reconData);
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
          <h3 className="text-white font-black uppercase tracking-widest mb-4">Neighborhood Reconnaissance</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Deploy localized intelligence sensors to scan for schools, medical facilities, and transit nodes.
          </p>
          <button 
            onClick={performRecon}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-full transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            Deploy Sensors
          </button>
        </div>
      )}

      {loading && (
        <div className="p-12 flex flex-col items-center gap-4">
          <Spinner loading={loading} />
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Scanning Grid...</p>
        </div>
      )}

      {error && (
        <div className="p-8 text-center">
          <p className="text-red-400 text-xs font-bold uppercase">Intelligence Intercept Failed. Retrying...</p>
          <button onClick={performRecon} className="mt-4 text-blue-400 underline text-xs">Re-scan</button>
        </div>
      )}

      {data && (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4">
              Grid Recon <span className="text-[8px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded not-italic tracking-widest ml-2">LIVE_OSM_FEED</span>
            </h3>
            <div className="flex items-center gap-2 text-green-400 text-[10px] font-black uppercase tracking-widest">
              <FaShieldAlt className="animate-pulse" /> Grid Secure
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SCHOOLS */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                <FaSchool size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Education Facilities</div>
                <div className="text-white font-bold">{data.neighborhood.schools.count} Identified</div>
                <div className="text-[10px] text-blue-400/80 font-mono mt-1">PROX: {data.neighborhood.schools.proximity} // RATE: {data.neighborhood.schools.rating}</div>
              </div>
            </div>

            {/* HOSPITALS */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                <FaHospital size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Medical Grid</div>
                <div className="text-white font-bold">{data.neighborhood.hospitals.count} Nearby</div>
                <div className="text-[10px] text-red-400/80 font-mono mt-1">PROX: {data.neighborhood.hospitals.proximity} // TYPE: {data.neighborhood.hospitals.type}</div>
              </div>
            </div>

            {/* TRANSIT */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                <FaBus size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Transit Nodes</div>
                <div className="text-white font-bold">{data.neighborhood.transit.nodes} Stations</div>
                <div className="text-[10px] text-green-400/80 font-mono mt-1">ACCESS: {data.neighborhood.transit.score}</div>
              </div>
            </div>

            {/* GENERAL AMENITIES */}
            <div className="bg-slate-950/80 border border-white/5 p-5 rounded-xl flex items-start gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
                <FaSatellite size={20} />
              </div>
              <div>
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Point Density</div>
                <div className="text-white font-bold">{data.neighborhood.amenities.total} Nodes</div>
                <div className="text-[10px] text-yellow-400/80 font-mono mt-1">DENSITY: HIGH // SECTOR: CAPTURED</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => setData(null)}
              className="text-[9px] text-slate-500 hover:text-slate-300 uppercase tracking-widest font-black underline decoration-slate-700"
            >
              Reset Sensors
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeighborhoodRecon;
