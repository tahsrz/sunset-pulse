'use client';

import React, { useState, useRef } from 'react';
import { FaVideo, FaMicrochip, FaGlobeAmericas, FaSave, FaCrosshairs, FaSkull, FaCheckCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const VibeWorldExtractor = ({ onVibeExtracted }: { onVibeExtracted: (vibe: any) => void }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState('/videos/anime_spike.mp4');
  const [extractedVibe, setExtractedVibe] = useState<any>(null);
  const [neuralPoint, setNeuralPoint] = useState<{ x: number, y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const videos = [
    { name: 'Spike_Recon', path: '/videos/anime_spike.mp4' },
    { name: 'Jamie_Internal', path: '/videos/jamie_base.mp4' }
  ];

  const handleVideoClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setNeuralPoint({ x, y });
    setExtractedVibe(null); // Clear previous results when new point is picked
  };

  const handleExtract = async () => {
    if (!neuralPoint) return;
    setIsExtracting(true);
    
    // Simulate Spatial Neural Extraction
    await new Promise(resolve => setTimeout(resolve, 2500));

    const mockExtracted = {
      vibeId: `vibe-spatial-${Math.random().toString(36).substring(7)}`,
      name: `Spatial_World_${Math.round(neuralPoint.x)}_${Math.round(neuralPoint.y)}`,
      description: `Semantic world extracted from spatial anchor [X:${neuralPoint.x.toFixed(1)}, Y:${neuralPoint.y.toFixed(1)}].`,
      linguisticLogic: {
        tone: neuralPoint.x > 50 ? 'aggressive' : 'analytical',
        pacing: neuralPoint.y > 50 ? 'staccato' : 'fluid',
        vocabulary: ['spatial', 'anchor', 'sector', 'coordinate', 'precision']
      },
      visualParameters: {
        meshColor: selectedVideo.includes('spike') ? '#f87171' : '#3b82f6',
        bloomIntensity: 1.5,
        glitchFrequency: 0.15,
        particleDensity: 100
      },
      sourceVideoPath: selectedVideo,
      metadata: {
        anchorX: neuralPoint.x.toString(),
        anchorY: neuralPoint.y.toString()
      }
    };

    setExtractedVibe(mockExtracted);
    setIsExtracting(false);
  };

  const handleSave = async () => {
    if (!extractedVibe) return;
    const res = await fetch('/api/jamie/vibes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extractedVibe)
    });
    if (res.ok) {
      onVibeExtracted(extractedVibe);
      setExtractedVibe(null);
      setNeuralPoint(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden">
      <div className="flex justify-between items-center border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
            <FaCrosshairs size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Vibe Extractor</h3>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest italic">Click_video_to_pick_a_vibe</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {videos.map(v => (
            <button
              key={v.path}
              onClick={() => { setSelectedVideo(v.path); setNeuralPoint(null); setExtractedVibe(null); }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedVideo === v.path ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
            >
              {v.name.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Video Feed */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur opacity-30 group-hover:opacity-100 transition-opacity" />
        <div 
          ref={containerRef}
          onClick={handleVideoClick}
          className="relative aspect-video bg-black rounded-2xl overflow-hidden cursor-crosshair border border-white/10"
        >
          <video 
            ref={videoRef}
            src={selectedVideo}
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
          />
          
          {/* Neural Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence>
              {neuralPoint && (
                <motion.div 
                  initial={{ scale: 4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute w-12 h-12 border-2 border-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                  style={{ left: `${neuralPoint.x}%`, top: `${neuralPoint.y}%` }}
                >
                  <div className="w-1 h-1 bg-blue-500 rounded-full" />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-blue-500/20 rounded-full" 
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono text-blue-400 bg-black/80 px-2 py-0.5 rounded border border-blue-500/30 uppercase">
                    Point: {Math.round(neuralPoint.x)}% / {Math.round(neuralPoint.y)}%
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">
            <span>Feed: Active</span>
            <span>Mode: Vibe Pick</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <button
          onClick={handleExtract}
          disabled={!neuralPoint || isExtracting}
          className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-white/20 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs transition-all shadow-2xl flex items-center justify-center gap-4 group"
        >
          {isExtracting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing Vibe...
            </>
          ) : (
            <>
              <FaMicrochip size={14} className="group-hover:rotate-12 transition-transform" />
              Extract Vibe from Point
            </>
          )}
        </button>

        <AnimatePresence>
          {extractedVibe && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl space-y-6 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FaCheckCircle size={10} className="text-blue-500" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Vibe Extracted</span>
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tighter italic text-white">{extractedVibe.name}</h4>
                </div>
                <div 
                  className="w-10 h-10 rounded-2xl rotate-45 border-2 border-blue-500 flex items-center justify-center bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                >
                  <div className="w-4 h-4 bg-blue-500 rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="block text-[8px] text-slate-500 uppercase font-mono mb-1">Overall Tone</span>
                  <span className="text-[10px] font-bold uppercase text-blue-400 italic">{extractedVibe.linguisticLogic.tone}</span>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="block text-[8px] text-slate-500 uppercase font-mono mb-1">Video Pacing</span>
                  <span className="text-[10px] font-bold uppercase text-blue-400 italic">{extractedVibe.linguisticLogic.pacing}</span>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                <FaSave /> Save to Vibe Dictionary
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VibeWorldExtractor;
