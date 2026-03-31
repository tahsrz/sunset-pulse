'use client';
import { useTheme } from '@/context/ThemeProvider';
import { FaFlask, FaCheck, FaTimes, FaPalette } from 'react-icons/fa';

const VIBE_DICTIONARY = {
  "Dark Mode": { "primaryColor": "#3b82f6", "mainBackground": "#0f172a", "navBackground": "#1e293b", "quadrants": { "topLeft": { "background": "#0f172a", "color": "#f8fafc" }, "topRight": { "background": "#1e293b", "color": "#f8fafc" }, "bottomLeft": { "background": "#1e293b", "color": "#f8fafc" }, "bottomRight": { "background": "#0f172a", "color": "#f8fafc" } } },
  "Cyberpunk": { "primaryColor": "#eab308", "mainBackground": "#000000", "navBackground": "#111111", "quadrants": { "topLeft": { "background": "#000000", "color": "#fbbf24" }, "topRight": { "background": "#111111", "color": "#ffffff" }, "bottomLeft": { "background": "#111111", "color": "#ffffff" }, "bottomRight": { "background": "#000000", "color": "#fbbf24" } } },
  "Tactical": { "primaryColor": "#ef4444", "mainBackground": "#000000", "navBackground": "#000000", "quadrants": { "topLeft": { "background": "#000000", "color": "#ffffff" }, "topRight": { "background": "#111111", "color": "#ef4444" }, "bottomLeft": { "background": "#111111", "color": "#ef4444" }, "bottomRight": { "background": "#000000", "color": "#ffffff" } } },
  "Minimalist": { "primaryColor": "#6366f1", "mainBackground": "#ffffff", "navBackground": "#f8fafc", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#1e293b" }, "topRight": { "background": "#f1f5f9", "color": "#1e293b" }, "bottomLeft": { "background": "#f1f5f9", "color": "#1e293b" }, "bottomRight": { "background": "#ffffff", "color": "#1e293b" } } },
  "Moody": { "primaryColor": "#8b5cf6", "mainBackground": "#020617", "navBackground": "#0f172a", "quadrants": { "topLeft": { "background": "#020617", "color": "#f8fafc" }, "topRight": { "background": "#0f172a", "color": "#8b5cf6" }, "bottomLeft": { "background": "#0f172a", "color": "#8b5cf6" }, "bottomRight": { "background": "#020617", "color": "#f8fafc" } } },
  "Forest": { "primaryColor": "#10b981", "mainBackground": "#064e3b", "navBackground": "#065f46", "quadrants": { "topLeft": { "background": "#064e3b", "color": "#ecfdf5" }, "topRight": { "background": "#065f46", "color": "#ecfdf5" }, "bottomLeft": { "background": "#065f46", "color": "#ecfdf5" }, "bottomRight": { "background": "#064e3b", "color": "#ecfdf5" } } },
  "Sunset": { "primaryColor": "#f43f5e", "mainBackground": "#4c1d95", "navBackground": "#701a75", "quadrants": { "topLeft": { "background": "#4c1d95", "color": "#fff1f2" }, "topRight": { "background": "#701a75", "color": "#fff1f2" }, "bottomLeft": { "background": "#701a75", "color": "#fff1f2" }, "bottomRight": { "background": "#4c1d95", "color": "#fff1f2" } } },
  "Oceanic": { "primaryColor": "#06b6d4", "mainBackground": "#083344", "navBackground": "#164e63", "quadrants": { "topLeft": { "background": "#083344", "color": "#ecfeff" }, "topRight": { "background": "#164e63", "color": "#06b6d4" }, "bottomLeft": { "background": "#164e63", "color": "#06b6d4" }, "bottomRight": { "background": "#083344", "color": "#ecfeff" } } },
  "Luxury": { "primaryColor": "#d4af37", "mainBackground": "#000000", "navBackground": "#1a1a1a", "quadrants": { "topLeft": { "background": "#000000", "color": "#d4af37" }, "topRight": { "background": "#1a1a1a", "color": "#ffffff" }, "bottomLeft": { "background": "#1a1a1a", "color": "#ffffff" }, "bottomRight": { "background": "#000000", "color": "#d4af37" } } },
  "Terminal": { "primaryColor": "#22c55e", "mainBackground": "#050505", "navBackground": "#0a0a0a", "quadrants": { "topLeft": { "background": "#050505", "color": "#22c55e" }, "topRight": { "background": "#0a0a0a", "color": "#4ade80" }, "bottomLeft": { "background": "#0a0a0a", "color": "#4ade80" }, "bottomRight": { "background": "#050505", "color": "#22c55e" } } },
  "Neon": { "primaryColor": "#ff00ff", "mainBackground": "#000000", "navBackground": "#000000", "quadrants": { "topLeft": { "background": "#000000", "color": "#ff00ff" }, "topRight": { "background": "#111111", "color": "#00ffff" }, "bottomLeft": { "background": "#111111", "color": "#00ffff" }, "bottomRight": { "background": "#000000", "color": "#ff00ff" } } },
  "Desert": { "primaryColor": "#f59e0b", "mainBackground": "#78350f", "navBackground": "#92400e", "quadrants": { "topLeft": { "background": "#78350f", "color": "#fef3c7" }, "topRight": { "background": "#92400e", "color": "#fcd34d" }, "bottomLeft": { "background": "#92400e", "color": "#fcd34d" }, "bottomRight": { "background": "#78350f", "color": "#fef3c7" } } },
  "Lavender": { "primaryColor": "#a78bfa", "mainBackground": "#f5f3ff", "navBackground": "#ede9fe", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#5b21b6" }, "topRight": { "background": "#f5f3ff", "color": "#7c3aed" }, "bottomLeft": { "background": "#f5f3ff", "color": "#7c3aed" }, "bottomRight": { "background": "#ffffff", "color": "#5b21b6" } } },
  "Industrial": { "primaryColor": "#64748b", "mainBackground": "#1e293b", "navBackground": "#334155", "quadrants": { "topLeft": { "background": "#1e293b", "color": "#cbd5e1" }, "topRight": { "background": "#334155", "color": "#94a3b8" }, "bottomLeft": { "background": "#334155", "color": "#94a3b8" }, "bottomRight": { "background": "#1e293b", "color": "#cbd5e1" } } },
  "Sky": { "primaryColor": "#38bdf8", "mainBackground": "#f0f9ff", "navBackground": "#e0f2fe", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#0369a1" }, "topRight": { "background": "#f0f9ff", "color": "#0ea5e9" }, "bottomLeft": { "background": "#f0f9ff", "color": "#0ea5e9" }, "bottomRight": { "background": "#ffffff", "color": "#0369a1" } } },
  "Solar": { "primaryColor": "#f59e0b", "mainBackground": "#fff7ed", "navBackground": "#ffedd5", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#b45309" }, "topRight": { "background": "#fff7ed", "color": "#d97706" }, "bottomLeft": { "background": "#fff7ed", "color": "#d97706" }, "bottomRight": { "background": "#ffffff", "color": "#b45309" } } },
  "Glacier": { "primaryColor": "#7dd3fc", "mainBackground": "#f0f9ff", "navBackground": "#e0f2fe", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#0c4a6e" }, "topRight": { "background": "#f0f9ff", "color": "#0369a1" }, "bottomLeft": { "background": "#f0f9ff", "color": "#0369a1" }, "bottomRight": { "background": "#ffffff", "color": "#0c4a6e" } } },
  "Vintage": { "primaryColor": "#92400e", "mainBackground": "#fffbeb", "navBackground": "#fef3c7", "quadrants": { "topLeft": { "background": "#fffbeb", "color": "#78350f" }, "topRight": { "background": "#fef3c7", "color": "#92400e" }, "bottomLeft": { "background": "#fef3c7", "color": "#92400e" }, "bottomRight": { "background": "#fffbeb", "color": "#78350f" } } },
  "Midnight": { "primaryColor": "#6366f1", "mainBackground": "#020617", "navBackground": "#000000", "quadrants": { "topLeft": { "background": "#000000", "color": "#6366f1" }, "topRight": { "background": "#020617", "color": "#818cf8" }, "bottomLeft": { "background": "#020617", "color": "#818cf8" }, "bottomRight": { "background": "#000000", "color": "#6366f1" } } },
  "Volcano": { "primaryColor": "#f97316", "mainBackground": "#1c1917", "navBackground": "#0c0a09", "quadrants": { "topLeft": { "background": "#0c0a09", "color": "#f97316" }, "topRight": { "background": "#1c1917", "color": "#fb923c" }, "bottomLeft": { "background": "#1c1917", "color": "#fb923c" }, "bottomRight": { "background": "#0c0a09", "color": "#f97316" } } },
  "Zen": { "primaryColor": "#10b981", "mainBackground": "#f0fdf4", "navBackground": "#dcfce7", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#064e3b" }, "topRight": { "background": "#f0fdf4", "color": "#059669" }, "bottomLeft": { "background": "#f0fdf4", "color": "#059669" }, "bottomRight": { "background": "#ffffff", "color": "#064e3b" } } },
  "Mars": { "primaryColor": "#ef4444", "mainBackground": "#450a0a", "navBackground": "#7f1d1d", "quadrants": { "topLeft": { "background": "#450a0a", "color": "#fca5a5" }, "topRight": { "background": "#7f1d1d", "color": "#ef4444" }, "bottomLeft": { "background": "#7f1d1d", "color": "#ef4444" }, "bottomRight": { "background": "#450a0a", "color": "#fca5a5" } } },
  "Deep Sea": { "primaryColor": "#0ea5e9", "mainBackground": "#082f49", "navBackground": "#0c4a6e", "quadrants": { "topLeft": { "background": "#082f49", "color": "#bae6fd" }, "topRight": { "background": "#0c4a6e", "color": "#0ea5e9" }, "bottomLeft": { "background": "#0c4a6e", "color": "#0ea5e9" }, "bottomRight": { "background": "#082f49", "color": "#bae6fd" } } },
  "Gold Rush": { "primaryColor": "#facc15", "mainBackground": "#000000", "navBackground": "#1a1a1a", "quadrants": { "topLeft": { "background": "#000000", "color": "#facc15" }, "topRight": { "background": "#1a1a1a", "color": "#ffffff" }, "bottomLeft": { "background": "#1a1a1a", "color": "#ffffff" }, "bottomRight": { "background": "#000000", "color": "#facc15" } } },
  "Cyber Lime": { "primaryColor": "#84cc16", "mainBackground": "#050505", "navBackground": "#0a0a0a", "quadrants": { "topLeft": { "background": "#050505", "color": "#84cc16" }, "topRight": { "background": "#0a0a0a", "color": "#bef264" }, "bottomLeft": { "background": "#0a0a0a", "color": "#bef264" }, "bottomRight": { "background": "#050505", "color": "#84cc16" } } },
  "Aurora": { "primaryColor": "#a855f7", "mainBackground": "#0f172a", "navBackground": "#1e1b4b", "quadrants": { "topLeft": { "background": "#0f172a", "color": "#2dd4bf" }, "topRight": { "background": "#1e1b4b", "color": "#a855f7" }, "bottomLeft": { "background": "#1e1b4b", "color": "#a855f7" }, "bottomRight": { "background": "#0f172a", "color": "#2dd4bf" } } },
  "Coffee": { "primaryColor": "#78350f", "mainBackground": "#fff7ed", "navBackground": "#ffedd5", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#78350f" }, "topRight": { "background": "#fff7ed", "color": "#92400e" }, "bottomLeft": { "background": "#fff7ed", "color": "#92400e" }, "bottomRight": { "background": "#ffffff", "color": "#78350f" } } },
  "Vampire": { "primaryColor": "#991b1b", "mainBackground": "#000000", "navBackground": "#000000", "quadrants": { "topLeft": { "background": "#000000", "color": "#991b1b" }, "topRight": { "background": "#111111", "color": "#f87171" }, "bottomLeft": { "background": "#111111", "color": "#f87171" }, "bottomRight": { "background": "#000000", "color": "#991b1b" } } },
  "Holographic": { "primaryColor": "#f472b6", "mainBackground": "#f8fafc", "navBackground": "#f1f5f9", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#818cf8" }, "topRight": { "background": "#f8fafc", "color": "#2dd4bf" }, "bottomLeft": { "background": "#f8fafc", "color": "#2dd4bf" }, "bottomRight": { "background": "#ffffff", "color": "#818cf8" } } },
  "Carbon": { "primaryColor": "#64748b", "mainBackground": "#0a0a0a", "navBackground": "#171717", "quadrants": { "topLeft": { "background": "#0a0a0a", "color": "#ffffff" }, "topRight": { "background": "#171717", "color": "#3b82f6" }, "bottomLeft": { "background": "#171717", "color": "#3b82f6" }, "bottomRight": { "background": "#0a0a0a", "color": "#ffffff" } } },
  "Cyber Purple": { "primaryColor": "#a855f7", "mainBackground": "#020008", "navBackground": "#0f001a", "quadrants": { "topLeft": { "background": "#020008", "color": "#a855f7" }, "topRight": { "background": "#0f001a", "color": "#d8b4fe" }, "bottomLeft": { "background": "#0f001a", "color": "#d8b4fe" }, "bottomRight": { "background": "#020008", "color": "#a855f7" } } },
  "Nordic": { "primaryColor": "#0ea5e9", "mainBackground": "#f8fafc", "navBackground": "#f1f5f9", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#0f172a" }, "topRight": { "background": "#f8fafc", "color": "#0369a1" }, "bottomLeft": { "background": "#f8fafc", "color": "#0369a1" }, "bottomRight": { "background": "#ffffff", "color": "#0f172a" } } },
  "Blood Moon": { "primaryColor": "#dc2626", "mainBackground": "#000000", "navBackground": "#110000", "quadrants": { "topLeft": { "background": "#000000", "color": "#dc2626" }, "topRight": { "background": "#110000", "color": "#f87171" }, "bottomLeft": { "background": "#110000", "color": "#f87171" }, "bottomRight": { "background": "#000000", "color": "#dc2626" } } },
  "Mint": { "primaryColor": "#10b981", "mainBackground": "#f0fdf4", "navBackground": "#dcfce7", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#064e3b" }, "topRight": { "background": "#f0fdf4", "color": "#10b981" }, "bottomLeft": { "background": "#f0fdf4", "color": "#10b981" }, "bottomRight": { "background": "#ffffff", "color": "#064e3b" } } },
  "High-Rise": { "primaryColor": "#1d4ed8", "mainBackground": "#f1f5f9", "navBackground": "#e2e8f0", "quadrants": { "topLeft": { "background": "#ffffff", "color": "#1e3a8a" }, "topRight": { "background": "#f1f5f9", "color": "#1d4ed8" }, "bottomLeft": { "background": "#f1f5f9", "color": "#1d4ed8" }, "bottomRight": { "background": "#ffffff", "color": "#1e3a8a" } } }
};

export default function VibeLabPage() {
  const { branding, stagedBranding, stageBranding, confirmBranding, cancelStaging } = useTheme();

  return (
    <div className="min-h-screen p-8 transition-all duration-500">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2 text-[var(--primary-color)]">
            <FaFlask size={32} />
            <h1 className="text-5xl font-black uppercase italic tracking-tighter">Vibe Lab</h1>
          </div>
          <p className="opacity-50 font-mono text-sm">[ EXPERIMENTAL UI MANIPULATION GRID ]</p>
        </div>

        {stagedBranding && (
          <div className="flex gap-4 animate-in slide-in-from-right-4 duration-500">
            <button 
              onClick={cancelStaging}
              className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all"
            >
              <FaTimes /> Revert Grid
            </button>
            <button 
              onClick={confirmBranding}
              className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-full font-black uppercase text-xs shadow-xl shadow-green-500/20 hover:scale-105 transition-all"
            >
              <FaCheck /> Deploy Vibe
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {Object.entries(VIBE_DICTIONARY).map(([name, config]) => (
          <div 
            key={name}
            onClick={() => stageBranding(config)}
            className={`group cursor-pointer bg-white/5 border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:border-[var(--primary-color)] hover:bg-white/10 ${
              stagedBranding === config ? 'ring-2 ring-[var(--primary-color)]' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-black uppercase text-sm tracking-widest">{name}</h3>
              <FaPalette className="opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Mini Quadrant Preview */}
            <div className="grid grid-cols-2 grid-rows-2 h-32 rounded-xl overflow-hidden shadow-2xl border border-white/5 transition-transform group-hover:scale-105 duration-500">
              <div style={{ background: config.quadrants.topLeft.background }} className="border-r border-b border-white/5" />
              <div style={{ background: config.quadrants.topRight.background }} className="border-b border-white/5" />
              <div style={{ background: config.quadrants.bottomLeft.background }} className="border-r border-white/5" />
              <div style={{ background: config.quadrants.bottomRight.background }} />
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-1">
                <div style={{ background: config.primaryColor }} className="w-3 h-3 rounded-full" />
                <div style={{ background: config.mainBackground }} className="w-3 h-3 rounded-full border border-white/10" />
                <div style={{ background: config.navBackground }} className="w-3 h-3 rounded-full border border-white/10" />
              </div>
              <span className="text-[9px] font-black uppercase opacity-30 group-hover:opacity-100 transition-opacity">Stage Vibe</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
