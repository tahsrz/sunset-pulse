'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ABIDAN_DATA, AbidanCharacter } from '@/constants/abidan';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';

interface QuadrantStyle {
  background: string;
  color: string;
}

interface Branding {
  primaryColor: string;
  fontFamily: string;
  borderRadius: string;
  navBackground?: string;
  mainBackground?: string;
  quadrants: {
    topLeft: QuadrantStyle;
    topRight: QuadrantStyle;
    bottomLeft: QuadrantStyle;
    bottomRight: QuadrantStyle;
  }
}

interface ProtocolLog {
  id: string;
  timestamp: string;
  type: 'THEME' | 'DRONE' | 'AUTH' | 'DATA';
  action: string;
  metadata?: any;
}

interface GhostDeckConfig {
  autoFlight: boolean;
  manualControl: boolean;
  lockOrientation: boolean;
  presentationMode: boolean;
  sequentialMode: boolean;
  autoPlay: boolean;
  autoPlayDelay: number;
}

interface ThemeContextType {
  branding: Branding;
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
  stagedBranding: Branding | null;
  updateBranding: (newSettings: any) => void;
  stageBranding: (newSettings: any) => void;
  confirmBranding: () => void;
  cancelStaging: () => void;
  isDevMode: boolean;
  setDevMode: (active: boolean) => void;
  isAdvancedMode: boolean;
  setAdvancedMode: (active: boolean) => void;
  isLefthandMode: boolean;
  setLefthandMode: (active: boolean) => void;
  customKeybind: string;
  setCustomKeybind: (key: string) => void;
  selectedAbidan: AbidanCharacter;
  setSelectedAbidan: (abidan: AbidanCharacter) => void;
  protocolLogs: ProtocolLog[];
  logProtocol: (type: ProtocolLog['type'], action: string, metadata?: any) => void;
  clearProtocolLogs: () => void;
  ghostDeckConfig: GhostDeckConfig;
  updateGhostDeckConfig: (config: Partial<GhostDeckConfig>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultBranding: Branding = {
  primaryColor: '#2563eb',
  fontFamily: 'Inter',
  borderRadius: '8px',
  navBackground: '#1d4ed8',
  mainBackground: '#f8fafc',
  quadrants: {
    topLeft: { background: 'transparent', color: 'inherit' },
    topRight: { background: 'transparent', color: 'inherit' },
    bottomLeft: { background: 'transparent', color: 'inherit' },
    bottomRight: { background: 'transparent', color: 'inherit' },
  }
};

export function ThemeProvider({ 
  children, 
  branding: initialBranding 
}: { 
  children: ReactNode; 
  branding: Branding; 
}) {
  const { user } = useAuth();
  const [branding, setBranding] = useState<Branding>(() => {
    const base = { ...defaultBranding, ...initialBranding };
    base.quadrants = { ...defaultBranding.quadrants, ...initialBranding?.quadrants };
    return base;
  });
  
  const [stagedBranding, setStagedBranding] = useState<Branding | null>(null);
  const [isDevMode, setDevModeState] = useState(false);
  const [isAdvancedMode, setAdvancedModeState] = useState(false);
  const [isLefthandMode, setLefthandModeState] = useState(false);
  const [customKeybind, setCustomKeybindState] = useState('P');
  const [selectedAbidan, setSelectedAbidanState] = useState<AbidanCharacter>(ABIDAN_DATA[0]);
  const [protocolLogs, setProtocolLogs] = useState<ProtocolLog[]>([]);
  const [ghostDeckConfig, setGhostDeckConfig] = useState<GhostDeckConfig>({
    autoFlight: true,
    manualControl: false,
    lockOrientation: true,
    presentationMode: false,
    sequentialMode: false,
    autoPlay: false,
    autoPlayDelay: 5000
  });

  const updateGhostDeckConfig = (config: Partial<GhostDeckConfig>) => {
    setGhostDeckConfig(prev => ({ ...prev, ...config }));
    logProtocol('DATA', 'Briefing Protocol Updated', config);
  };

  const logProtocol = (type: ProtocolLog['type'], action: string, metadata?: any) => {
    const newLog: ProtocolLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type,
      action,
      metadata
    };
    setProtocolLogs(prev => [newLog, ...prev].slice(0, 100));
    console.log(`[PROTOCOL_LOG] ${type}: ${action}`, metadata || '');
  };

  const clearProtocolLogs = () => setProtocolLogs([]);

  useEffect(() => {
    // 1. Initial Load and Auth-based settings
    const savedDev = localStorage.getItem('jamie_dev_mode');
    const savedLefthand = localStorage.getItem('jamie_lefthand_mode');
    
    if (user) {
      if (typeof user.user_metadata?.isAdvancedMode !== 'undefined') {
        setAdvancedModeState(user.user_metadata.isAdvancedMode);
      }
      if (user.user_metadata?.customKeybind) {
        setCustomKeybindState(user.user_metadata.customKeybind);
      }
      if (typeof user.user_metadata?.isLefthandMode !== 'undefined') {
        setLefthandModeState(user.user_metadata.isLefthandMode);
      }
    } else {
      const savedAdvanced = localStorage.getItem('jamie_advanced_mode');
      const savedKeybind = localStorage.getItem('jamie_custom_keybind');
      if (savedAdvanced === 'true') setAdvancedModeState(true);
      if (savedKeybind) setCustomKeybindState(savedKeybind);
      if (savedLefthand === 'true') setLefthandModeState(true);
    }
    
    if (savedDev === 'true') {
      setDevModeState(true);
    }

    const savedAbidanId = localStorage.getItem('selected_abidan');
    if (savedAbidanId) {
      const found = ABIDAN_DATA.find(a => a.id === savedAbidanId);
      if (found) setSelectedAbidanState(found);
    }

    // 2. Real-time Site Config Subscription
    const channel = supabase
      .channel('public:site_config')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'site_config',
        filter: 'agent_id=eq.taz-realty-001'
      }, (payload) => {
        console.log('🔄 [THEME_SYNC] Site config update received:', payload.new);
        if (payload.new.branding) {
          setBranding(payload.new.branding);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const setSelectedAbidan = (abidan: AbidanCharacter) => {
    setSelectedAbidanState(abidan);
    localStorage.setItem('selected_abidan', abidan.id);
    console.log(`🛡️ [ABIDAN_CORE] Mantle assumed: ${abidan.name} (${abidan.mantle})`);
  };

  const setDevMode = (active: boolean) => {
    if (active && !user?.user_metadata?.isSubscribed) {
      toast.error('Subscription required for Dev Mode access.');
      console.warn('🔒 [JAMIE_SECURITY] Dev Mode access denied. Active subscription not found.');
      return;
    }
    setDevModeState(active);
    localStorage.setItem('jamie_dev_mode', active ? 'true' : 'false');
  };

  const syncSettings = async (updates: { isAdvancedMode?: boolean, customKeybind?: string, isLefthandMode?: boolean }) => {
    if (!user) return;
    
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!res.ok) throw new Error('Failed to sync settings');
    } catch (error) {
      console.error('Settings sync error:', error);
    }
  };

  const setAdvancedMode = (active: boolean) => {
    setAdvancedModeState(active);
    localStorage.setItem('jamie_advanced_mode', active ? 'true' : 'false');
    if (active) {
      toast.info('Advanced Mode Activated', { icon: '⚡' });
    }
    syncSettings({ isAdvancedMode: active });
  };

  const setLefthandMode = (active: boolean) => {
    setLefthandModeState(active);
    localStorage.setItem('jamie_lefthand_mode', active ? 'true' : 'false');
    if (active) {
      toast.info('Lefthand Mode Activated', { icon: '↔️' });
    }
    syncSettings({ isLefthandMode: active });
  };

  const setCustomKeybind = (key: string) => {
    const forbiddenKeys = ['T', 'N', 'W', 'S', 'F', 'L', 'R'];
    const upperKey = key.toUpperCase();

    if (forbiddenKeys.includes(upperKey)) {
      toast.error(`Key "${upperKey}" is reserved for browser shortcuts. Please choose another.`);
      return;
    }

    setCustomKeybindState(upperKey);
    localStorage.setItem('jamie_custom_keybind', upperKey);
    toast.success(`Keybind updated to: Shift + ${upperKey}`);
    syncSettings({ customKeybind: upperKey });
  };

  const updateBranding = (newSettings: any) => {
    setBranding((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.quadrants) {
        updated.quadrants = { ...prev.quadrants, ...newSettings.quadrants };
      }
      return updated;
    });
    setStagedBranding(null);
  };

  const stageBranding = (newSettings: any) => {
    setStagedBranding((prev) => {
      const base = prev || branding;
      const updated = { ...base, ...newSettings };
      if (newSettings.quadrants) {
        updated.quadrants = { ...base.quadrants, ...newSettings.quadrants };
      }
      return updated;
    });
  };

  const confirmBranding = () => {
    if (stagedBranding) {
      setBranding(stagedBranding);
      setStagedBranding(null);
    }
  };

  const cancelStaging = () => {
    setStagedBranding(null);
  };

  useEffect(() => {
    const target = stagedBranding || branding;
    if (target) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', target.primaryColor);
      root.style.setProperty('--font-family', target.fontFamily);
      root.style.setProperty('--border-radius', target.borderRadius);
      root.style.setProperty('--nav-bg', target.navBackground || '');
      root.style.setProperty('--main-bg', target.mainBackground || '');
      
      root.style.setProperty('--tl-bg', target.quadrants.topLeft.background);
      root.style.setProperty('--tr-bg', target.quadrants.topRight.background);
      root.style.setProperty('--bl-bg', target.quadrants.bottomLeft.background);
      root.style.setProperty('--br-bg', target.quadrants.bottomRight.background);
      
      root.style.setProperty('--tl-color', target.quadrants.topLeft.color);
      root.style.setProperty('--tr-color', target.quadrants.topRight.color);
      root.style.setProperty('--bl-color', target.quadrants.bottomLeft.color);
      root.style.setProperty('--br-color', target.quadrants.bottomRight.color);
    }
  }, [branding, stagedBranding]);

  return (
    <ThemeContext.Provider value={{ 
      branding, 
      setBranding,
      stagedBranding, 
      updateBranding, 
      stageBranding, 
      confirmBranding, 
      cancelStaging, 
      isDevMode, 
      setDevMode,
      isAdvancedMode,
      setAdvancedMode,
      isLefthandMode,
      setLefthandMode,
      customKeybind,
      setCustomKeybind,
      selectedAbidan,
      setSelectedAbidan,
      protocolLogs,
      logProtocol,
      clearProtocolLogs,
      ghostDeckConfig,
      updateGhostDeckConfig
    }}>
      <div 
        style={{ 
          '--primary-color': (stagedBranding || branding)?.primaryColor,
          fontFamily: (stagedBranding || branding)?.fontFamily 
        } as React.CSSProperties}
        className="min-h-screen transition-all duration-500 bg-[var(--main-bg)]"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
