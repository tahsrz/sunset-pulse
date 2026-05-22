'use client';

import React from 'react';
import { FaTrash, FaSync } from 'react-icons/fa';

interface DevPortalLogsProps {
  protocolLogs: any[];
  clearProtocolLogs: () => void;
}

const DevPortalLogs: React.FC<DevPortalLogsProps> = ({ protocolLogs, clearProtocolLogs }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[9px] font-mono text-slate-500 uppercase italic">Monitoring {protocolLogs.length} system events...</span>
        <button 
          onClick={clearProtocolLogs}
          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
          title="Clear Logs"
        >
          <FaTrash size={12} />
        </button>
      </div>
      
      {protocolLogs.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-slate-600 border border-dashed border-white/5 rounded-2xl">
          <FaSync className="animate-spin-slow mb-2 opacity-20" size={24} />
          <span className="text-[8px] uppercase tracking-widest font-mono">Listening for system updates...</span>
        </div>
      ) : (
        protocolLogs.map(log => (
          <div key={log.id} className="p-3 bg-white/5 border border-white/5 rounded-xl font-mono text-[9px] group hover:border-blue-500/30 transition-all">
            <div className="flex justify-between mb-1">
              <span className={`font-black ${
                log.type === 'THEME' ? 'text-purple-400' : 
                log.type === 'DRONE' ? 'text-blue-400' : 
                log.type === 'AUTH' ? 'text-green-400' : 'text-orange-400'
              }`}>
                [{log.type}]
              </span>
              <span className="text-white/20">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="text-white/80 leading-relaxed">{log.action}</div>
            {log.metadata && (
              <pre className="mt-2 p-2 bg-black/40 rounded text-[8px] text-blue-300/60 overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default DevPortalLogs;
