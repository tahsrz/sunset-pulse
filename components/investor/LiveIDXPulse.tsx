'use client';

import React, { useEffect, useState } from 'react';
import { FaBroadcastTower, FaHome } from 'react-icons/fa';

interface ListingLog {
  id: string;
  name: string;
  timestamp: string;
}

const LiveIDXPulse = () => {
  const [logs, setLogs] = useState<ListingLog[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Simulate the incoming Pulse Stream
    const mockListings = [
      { id: 'TX-48293', name: '4822 Holly Ridge Dr' },
      { id: 'TX-90210', name: '123 Beverly Hills Blvd' },
      { id: 'TX-76262', name: '800 Keller Pkwy' },
      { id: 'TX-33401', name: '1500 Ocean Dr' },
      { id: 'TX-75001', name: '5000 Belt Line Rd' }
    ];

    let interval: NodeJS.Timeout;

    if (isActive) {
      interval = setInterval(() => {
        const randomListing = mockListings[Math.floor(Math.random() * mockListings.length)];
        const newLog: ListingLog = {
          id: `${randomListing.id}-${Math.floor(Math.random() * 1000)}`,
          name: randomListing.name,
          timestamp: new Date().toLocaleTimeString()
        };
        setLogs(prev => [newLog, ...prev].slice(0, 5));
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-[10px] space-y-3 backdrop-blur-md">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <FaBroadcastTower className={isActive ? "text-green-500 animate-pulse" : "text-white/20"} />
          <span className="uppercase tracking-widest font-black italic">IDX_LIVE_FEED</span>
        </div>
        <button 
          onClick={() => setIsActive(!isActive)}
          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all ${
            isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          {isActive ? 'Terminate_Link' : 'Establish_Link'}
        </button>
      </div>

      <div className="space-y-2 h-[100px] overflow-hidden relative">
        {logs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/10 italic">
            Waiting for Uplink...
          </div>
        )}
        {logs.map(log => (
          <div key={log.id} className="flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-2">
              <FaHome className="text-blue-500/50" />
              <span className="text-white/60 truncate max-w-[120px]">{log.name}</span>
            </div>
            <span className="text-blue-400/80 font-black tracking-tighter">[{log.timestamp}]</span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-white/5 flex justify-between items-center opacity-40 italic">
        <span>Source: Repliers.io</span>
        <span>Lat: 32.934 | Lng: -97.229</span>
      </div>
    </div>
  );
};

export default LiveIDXPulse;
