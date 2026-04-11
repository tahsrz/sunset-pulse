'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { ABIDAN_DATA } from '@/constants/abidan';
import { VIBE_DICTIONARY } from '@/constants/vibes';
import { FaCode, FaTerminal, FaTrash, FaTimes, FaShieldAlt, FaSync, FaBook, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

const DevPortal: React.FC = () => {
  const { 
    isDevMode, 
    setDevMode, 
    protocolLogs, 
    clearProtocolLogs, 
    selectedAbidan, 
    setSelectedAbidan,
    branding,
    setBranding,
    updateBranding,
    ghostDeckConfig,
    updateGhostDeckConfig
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'SYSTEM'>('LOGS');
  const [isSaving, setIsSaving] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  const handleSetDefault = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding })
      });
      if (res.ok) {
        toast.success('Theme set as system default');
      } else {
        throw new Error('Failed to save default theme');
      }
    } catch (error) {
      toast.error('Failed to update system default');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (portalRef.current && !portalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 z-[60] bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 p-3 rounded-full text-blue-400 hover:text-blue-300 hover:border-blue-500 transition-all shadow-2xl animate-pulse"
        title="Open Dev Portal"
      >
        <FaCode size={20} />
      </button>
    );
  }

  return (
    <div ref={portalRef} className="fixed bottom-6 right-6 z-[60] w-[400px] h-[600px] bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-blue-600/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white">
            <FaTerminal size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter text-white italic">System_Dashboard</h3>
            <p className="text-[8px] font-mono text-blue-400 uppercase tracking-widest">Access_Level: Administrator</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
          <FaTimes size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-black/20">
        <button 
          onClick={() => setActiveTab('LOGS')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LOGS' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Event_Stream
        </button>
        <button 
          onClick={() => setActiveTab('SYSTEM')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SYSTEM' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          System_Controls
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'LOGS' ? (
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
        ) : (
          <div className="space-y-6">
            {/* Global Switches */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <h4 className="text-[10px] font-black uppercase text-blue-400 mb-4 tracking-widest flex items-center gap-2">
                <FaCode /> Core_Configuration
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">Enable Wireframe Debug</span>
                <button 
                  onClick={() => setDevMode(!isDevMode)}
                  className={`w-10 h-5 rounded-full transition-all relative ${isDevMode ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDevMode ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Mantle Selection */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <h4 className="text-[10px] font-black uppercase text-purple-400 mb-4 tracking-widest flex items-center gap-2">
                <FaShieldAlt /> Agent_Profiles
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {ABIDAN_DATA.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAbidan(a)}
                    className={`p-2 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all ${selectedAbidan.id === a.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-500 hover:text-white hover:border-white/10'}`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe Overrides */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black uppercase text-orange-400 tracking-widest flex items-center gap-2">
                  <FaSync /> Interface_Themes
                </h4>
                <button 
                  onClick={handleSetDefault}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[8px] font-black text-blue-400 hover:bg-blue-600 hover:text-white transition-all uppercase disabled:opacity-50"
                  title="Make Current Theme Default"
                >
                  <FaSave size={10} className={isSaving ? 'animate-spin' : ''} />
                  {isSaving ? 'Saving...' : 'Set_Default'}
                </button>
              </div>

              <div className="mb-4 p-3 bg-black/40 border border-white/5 rounded-xl">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest block mb-2">Current_Protocol:</span>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full border border-white/20" 
                    style={{ backgroundColor: branding.primaryColor }}
                  />
                  <span className="text-[10px] font-mono text-white/80">
                    {Object.entries(VIBE_DICTIONARY).find(([_, val]) => val.primaryColor === branding.primaryColor)?.[0] || 'Custom_Override'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.keys(VIBE_DICTIONARY).slice(0, 12).map(v => (
                  <button
                    key={v}
                    onClick={() => updateBranding((VIBE_DICTIONARY as any)[v])}
                    className={`px-3 py-1.5 bg-black/40 border rounded-lg text-[8px] font-bold transition-all uppercase ${
                      branding.primaryColor === (VIBE_DICTIONARY as any)[v].primaryColor 
                        ? 'border-blue-500 text-blue-400' 
                        : 'border-white/5 text-slate-400 hover:text-blue-400 hover:border-blue-500/50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Briefing Protocol */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <h4 className="text-[10px] font-black uppercase text-green-400 mb-4 tracking-widest flex items-center gap-2">
                <FaBook /> Presentation_Settings
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/70 uppercase">Presentation Mode</span>
                  <button 
                    onClick={() => updateGhostDeckConfig({ presentationMode: !ghostDeckConfig.presentationMode })}
                    className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.presentationMode ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.presentationMode ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/70 uppercase">Auto-Flight Path</span>
                  <button 
                    onClick={() => updateGhostDeckConfig({ autoFlight: !ghostDeckConfig.autoFlight })}
                    className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.autoFlight ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.autoFlight ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/70 uppercase">Lock Orientation</span>
                  <button 
                    onClick={() => updateGhostDeckConfig({ lockOrientation: !ghostDeckConfig.lockOrientation })}
                    className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.lockOrientation ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.lockOrientation ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/70 uppercase font-bold text-green-400">Sequential Mode</span>
                  <button 
                    onClick={() => updateGhostDeckConfig({ 
                      sequentialMode: !ghostDeckConfig.sequentialMode,
                      autoFlight: true,
                      lockOrientation: true
                    })}
                    className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.sequentialMode ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.sequentialMode ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                
                <div className="h-[1px] w-full bg-white/5 my-1" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/70 uppercase">Auto-Play Slides</span>
                  <button 
                    onClick={() => updateGhostDeckConfig({ autoPlay: !ghostDeckConfig.autoPlay })}
                    className={`w-8 h-4 rounded-full transition-all relative ${ghostDeckConfig.autoPlay ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ghostDeckConfig.autoPlay ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {ghostDeckConfig.autoPlay && (
                  <div className="flex flex-col gap-1.5 px-1 py-1">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest">Slide Duration (ms)</span>
                    <input 
                      type="range" 
                      min="2000" 
                      max="15000" 
                      step="500"
                      value={ghostDeckConfig.autoPlayDelay}
                      onChange={(e) => updateGhostDeckConfig({ autoPlayDelay: parseInt(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-blue-400/60">
                      <span>2s</span>
                      <span>{ghostDeckConfig.autoPlayDelay}ms</span>
                      <span>15s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 bg-black/40 border-t border-white/10 font-mono text-[8px] text-slate-500 flex justify-between">
        <span>SESSION_UPTIME: 04:12:88</span>
        <span>LATENCY: 24ms</span>
        <span className="text-blue-500 animate-pulse">GRID_STABLE</span>
      </div>
    </div>
  );
};

export default DevPortal;
