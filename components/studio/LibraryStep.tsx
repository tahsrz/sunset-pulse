import React, { useState } from 'react';
import { FaCut, FaPlay, FaGhost, FaVolumeUp, FaUpload } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface LibraryStepProps {
  availableClips: any[];
  isHarvesting: boolean;
  isAcquiring: boolean;
  isProcessing: boolean;
  handleHarvest: () => void;
  handleDeleteAsset: (id: string) => void;
  handleAcquire: (url: string) => void;
  handleRasterize: (clip: any) => void;
  handleDirectVoiceover: (clip: any) => void;
}

export const LibraryStep: React.FC<LibraryStepProps> = ({
  availableClips, isHarvesting, isAcquiring, isProcessing,
  handleHarvest, handleDeleteAsset, handleAcquire, handleRasterize, handleDirectVoiceover
}) => {
  const [importUrl, setImportUrl] = useState('');
  const [showIngest, setShowIngest] = useState(false);
  const [newClip, setNewClip] = useState({ name: '', path: '' });

  const onAcquireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (importUrl) {
      handleAcquire(importUrl);
      setImportUrl('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 text-blue-400">
          <FaCut size={24} />
          <h2 className="text-2xl font-black uppercase tracking-tight">Step 1: Character Extraction</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <form onSubmit={onAcquireSubmit} className="flex gap-2">
            <input 
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              placeholder="Paste video URL (YT/Twitter/TikTok)..."
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono w-64 focus:border-blue-500 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={isAcquiring || !importUrl}
              className="px-4 py-3 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all disabled:opacity-20"
            >
              {isAcquiring ? 'Acquiring...' : 'Acquire Asset'}
            </button>
          </form>

          <div className="flex gap-4">
            <button 
              onClick={handleHarvest}
              disabled={isHarvesting}
              className="px-6 py-3 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
            >
              {isHarvesting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaPlay size={10} />}
              {isHarvesting ? 'Syncing...' : 'Sync Local Library'}
            </button>
            <button 
              onClick={() => setShowIngest(true)}
              className="px-6 py-3 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
            >
              <FaUpload size={10} /> Upload for Voiceover
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {availableClips.map(clip => (
          <div key={clip._id || clip.id} className="group relative bg-slate-900 border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all">
            <video src={clip.path} muted loop autoPlay className="w-full aspect-video object-cover opacity-40 group-hover:opacity-100 transition-opacity" />
            <div className="p-6 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{clip.name}</span>
                {clip.metadata?.tags && (
                  <div className="flex gap-1 mt-1">
                    {clip.metadata.tags.map((t: string) => (
                      <span key={t} className="text-[6px] bg-white/5 px-1 py-0.5 rounded text-white/40">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {clip._id && (
                  <button 
                    onClick={() => handleDeleteAsset(clip._id)}
                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    title="Purge Asset"
                  >
                    <FaGhost size={12} />
                  </button>
                )}
                <button 
                  onClick={() => handleDirectVoiceover(clip)}
                  className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                  title="Direct Voiceover"
                >
                  <FaVolumeUp /> Voiceover
                </button>
                <button 
                  onClick={() => handleRasterize(clip)}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:scale-105 transition-all"
                >
                  {isProcessing ? 'Extracting...' : 'Extract & Composite'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Upload Clip */}
      <AnimatePresence>
        {showIngest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIngest(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-4">Upload Video for Voiceover</h3>
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  if (newClip.path) {
                    handleDirectVoiceover({ name: newClip.name, path: newClip.path });
                    setShowIngest(false);
                  }
                }} 
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Clip Name</label>
                  <input 
                    required
                    value={newClip.name}
                    onChange={e => setNewClip({...newClip, name: e.target.value})}
                    placeholder="e.g., Tactical_Briefing.mp4"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Video Source</label>
                  <div className="flex gap-2">
                    <input 
                      readOnly
                      value={newClip.path}
                      placeholder="No file selected"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white/40 outline-none"
                    />
                    <label className="px-4 py-3 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
                      Browse
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const localPath = URL.createObjectURL(file);
                            setNewClip({ name: file.name, path: localPath });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={!newClip.path}
                  className="w-full py-4 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-20"
                >
                  Launch Voiceover Studio
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
