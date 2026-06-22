'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeProvider';
import { FaCode, FaTerminal, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import DevPortalLogs from './dev-portal/DevPortalLogs';
import DevPortalSystem from './dev-portal/DevPortalSystem';

const DevPortal: React.FC = () => {
  const { 
    isDevMode, 
    setDevMode, 
    protocolLogs, 
    clearProtocolLogs, 
    selectedAbidan, 
    setSelectedAbidan,
    branding,
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
        className="fixed bottom-4 right-36 z-[60] bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 p-3 rounded-full text-blue-400 hover:text-blue-300 hover:border-blue-500 transition-all shadow-2xl animate-pulse"
        title="Open Dev Portal"
      >
        <FaCode size={20} />
      </button>
    );
  }

  return (
    <div ref={portalRef} className="fixed bottom-20 right-4 z-[60] h-[min(600px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[400px] bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
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
          <DevPortalLogs 
            protocolLogs={protocolLogs} 
            clearProtocolLogs={clearProtocolLogs} 
          />
        ) : (
          <DevPortalSystem 
            isDevMode={isDevMode}
            setDevMode={setDevMode}
            selectedAbidan={selectedAbidan}
            setSelectedAbidan={setSelectedAbidan}
            branding={branding}
            updateBranding={updateBranding}
            handleSetDefault={handleSetDefault}
            isSaving={isSaving}
            ghostDeckConfig={ghostDeckConfig}
            updateGhostDeckConfig={updateGhostDeckConfig}
          />
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
