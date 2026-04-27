'use client';

import React, { useState, useEffect } from 'react';
import { FaCut, FaExchangeAlt, FaQuoteLeft, FaSave, FaPlay, FaGhost, FaCrosshairs, FaCheckCircle, FaVolumeUp } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { speak } from '@/lib/core/tts';

const ProductionStudio = () => {
  const [step, setStep] = useState(1); // 1: Extraction, 2: Placement, 3: Text
  const [extractedEntity, setExtractedEntity] = useState<any>(null);
  const [targetScene, setTargetScene] = useState<string>('');
  const [tacticalText, setTacticalText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('Jamie');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Character Placement State
  const [transform, setTransform] = useState({ 
    x: 0, 
    y: 0, 
    scale: 1,
    maskRadius: 80, 
    maskFeather: 20,
    brightness: 110, // %
    contrast: 120    // %
  });

  const availableVoices = ['Jamie', 'Spike', 'Ghost'];

  const handlePlayScript = () => {
    if (!tacticalText) return;
    speak(tacticalText, selectedVoice);
  };

  const [availableClips, setAvailableClips] = useState([
    { id: 'clip-001', name: 'Alleyway_Recon.mp4', path: '/videos/anime_spike.mp4' },
    { id: 'clip-002', name: 'Office_Infiltration.mp4', path: '/videos/jamie_base.mp4' }
  ]);
  const [newClip, setNewClip] = useState({ name: '', path: '' });
  const [showIngest, setShowIngest] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);

  const [importUrl, setImportUrl] = useState('');
  const [isAcquiring, setIsAcquiring] = useState(false);

  const handleAcquire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    
    setIsAcquiring(true);
    try {
      const res = await fetch('/api/admin/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success: ${data.asset} has been added to your local library.`);
        setImportUrl('');
        // Refresh the list by triggering a harvest
        handleHarvest();
      } else {
        alert(`Failed: ${data.details || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Acquisition Failed:", err);
    }
    setIsAcquiring(false);
  };

  const handleHarvest = async () => {
    setIsHarvesting(true);
    try {
      const res = await fetch('/api/admin/harvest', { method: 'POST' });
      const data = await res.json();
      if (data.discovered) {
        setAvailableClips(data.discovered); // Replace with actual current files
        if (!isAcquiring) alert(`Success: ${data.discovered.length} assets synchronized from local library.`);
      }
    } catch (err) {
      console.error("Harvest Failed:", err);
    }
    setIsHarvesting(false);
  };

  const handleAddClip = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `clip-${Math.random().toString(36).substring(7)}`;
    setAvailableClips([...availableClips, { ...newClip, id }]);
    setNewClip({ name: '', path: '' });
    setShowIngest(false);
  };

  const handleRasterize = async (clip: any) => {
    setIsProcessing(true);
    // Simulate Character Extraction
    await new Promise(r => setTimeout(r, 2000));
    
    // Apply pre-analyzed mask settings if they exist for trending clips
    if (clip.autoMask) {
      setTransform(prev => ({
        ...prev,
        ...clip.autoMask,
        x: clip.autoMask.x ?? 0,
        y: clip.autoMask.y ?? 0
      }));
    } else {
      // Reset to defaults for standard clips
      setTransform({ 
        x: 0, 
        y: 0, 
        scale: 1,
        maskRadius: 80, 
        maskFeather: 20,
        brightness: 110,
        contrast: 120
      });
    }

    setExtractedEntity({
      uid: `EXTRACT-${Math.random().toString(36).substring(7)}`,
      name: `Operator_${clip.name.split('_')[0]}`,
      visual: { assetPath: clip.path, meshColor: '#3b82f6' },
      isExtracted: true,
      sourceClip: clip.path
    });
    
    setIsProcessing(false);
    setStep(2);
  };

  const handleRerasterize = async () => {
    setIsProcessing(true);
    // Simulate Scene Placement
    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);
    setStep(3);
  };

  const [isRendering, setIsRendering] = useState(false);

  // Layer Compositing State
  const [compositing, setCompositing] = useState({
    blendMode: 'normal', // normal, screen, multiply, overlay, hard-light
    vibePreset: 'none',   // tactical, noir, vapor, glitch
    motionPath: 'none',   // float, pan-left, zoom-in
    opacity: 100
  });

  const vibePresets: any = {
    none: { filter: 'none', label: 'RAW' },
    tactical: { filter: 'sepia(0.3) hue-rotate(90deg) brightness(1.1) contrast(1.2)', label: 'TACTICAL' },
    noir: { filter: 'grayscale(1) contrast(1.5) brightness(0.9)', label: 'NOIR' },
    vapor: { filter: 'hue-rotate(280deg) saturate(2) brightness(1.2)', label: 'VAPOR' },
    glitch: { filter: 'saturate(5) hue-rotate(180deg) invert(0.1)', label: 'GLITCH' }
  };

  const blendModes = ['normal', 'screen', 'multiply', 'overlay', 'hard-light', 'difference'];

  // Audio Engineering State
  const [audioConfig, setAudioConfig] = useState({
    backgroundTrack: '/audio/intro.mp3',
    backgroundVolume: 30, // %
    subjectVolume: 100,    // %
    isMuted: false
  });

  const [availableAudio, setAvailableAudio] = useState([
    { id: 'bg-001', name: 'Tactical_Ambience.mp3', path: '/audio/intro.mp3' }
  ]);

  const handleFinalize = async () => {
    setIsRendering(true);
    try {
      const recipe = {
        targetScene,
        extractedEntity,
        transform,
        compositing, 
        audioConfig, // New Audio Metadata
        script: tacticalText,
        voice: selectedVoice,
        timestamp: new Date().toISOString()
      };

      const res = await fetch('/api/admin/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe)
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Success! Your production recipe has been saved to the /exports folder. \n\nIn a full production environment, the Render Engine would now generate your MP4 from this data.`);
      }
    } catch (err) {
      console.error("Render Failed:", err);
    }
    setIsRendering(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-8 text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header & Progress */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/5 pb-12">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white">Production <span className="text-blue-500">Studio</span></h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-2">Layer_Based_Compositing // v1.1</p>
          </div>

          <div className="flex items-center gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${step === i ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}>
                <span className="text-[10px] font-black">{i === 1 ? 'EXTRACTION' : i === 2 ? 'PLACEMENT' : 'FINALIZE'}</span>
                {step > i && <FaCheckCircle size={10} />}
              </div>
            ))}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* STEP 1: EXTRACTION */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-12 space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-blue-400">
                    <FaCut size={24} />
                    <h2 className="text-2xl font-black uppercase tracking-tight">Step 1: Character Extraction</h2>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <form onSubmit={handleAcquire} className="flex gap-2">
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
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        + Upload New Clip
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {availableClips.map(clip => (
                    <div key={clip.id} className="group relative bg-slate-900 border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all">
                      <video src={clip.path} muted loop autoPlay className="w-full aspect-video object-cover opacity-40 group-hover:opacity-100 transition-opacity" />
                      <div className="p-6 flex justify-between items-center">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{clip.name}</span>
                        <button 
                          onClick={() => handleRasterize(clip)}
                          disabled={isProcessing}
                          className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:scale-105 transition-all"
                        >
                          {isProcessing ? 'Extracting...' : 'Select Character'}
                        </button>
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
                        <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-white/5 pb-4">Upload Video Clip</h3>
                        <form onSubmit={handleAddClip} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Clip Name</label>
                            <input 
                              required
                              value={newClip.name}
                              onChange={e => setNewClip({...newClip, name: e.target.value})}
                              placeholder="e.g., Rooftop_Chase.mp4"
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
                                      // Create a local URL for the video so it can play in the browser
                                      const localPath = URL.createObjectURL(file);
                                      setNewClip({ 
                                        name: file.name, 
                                        path: localPath 
                                      });
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <p className="text-[8px] text-slate-500 font-mono italic">Local files will be used for this session.</p>
                          </div>
                          <button 
                            type="submit"
                            className="w-full py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-blue-500 transition-all shadow-xl"
                          >
                            Add to Library
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* STEP 2: PLACEMENT */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-12 space-y-8"
              >
                <div className="flex items-center gap-4 text-purple-400">
                  <FaExchangeAlt size={24} />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Step 2: Scene Placement</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-4 bg-slate-900 border border-white/10 rounded-[2rem] p-8 space-y-6">
                    <div className="space-y-4">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Extracted Subject</span>
                      <div className="aspect-square bg-black rounded-2xl overflow-hidden border border-blue-500/30 relative flex items-center justify-center">
                        <video 
                          src={extractedEntity?.visual?.assetPath} 
                          autoPlay 
                          muted 
                          loop 
                          style={{ 
                            filter: `contrast(${transform.contrast}%) brightness(${transform.brightness}%) grayscale(0.5)`,
                            maskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`,
                            WebkitMaskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`
                          }}
                          className="w-full h-full object-cover scale-110" 
                        />
                        <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                      </div>
                      <h3 className="text-lg font-black uppercase italic text-white leading-none">{extractedEntity?.name}</h3>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Post-Production FX</span>
                        <div className="flex gap-1">
                          {['GEOM', 'FX'].map(t => (
                            <button key={t} className="px-2 py-0.5 rounded bg-white/5 text-[7px] font-black uppercase text-white/40 hover:text-white transition-all">{t}</button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Vibe Presets */}
                        <div className="space-y-2">
                          <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Color Grade (LUT)</label>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.keys(vibePresets).map(v => (
                              <button 
                                key={v}
                                onClick={() => setCompositing({...compositing, vibePreset: v})}
                                className={`py-2 rounded-lg text-[7px] font-black uppercase border transition-all ${compositing.vibePreset === v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}
                              >
                                {vibePresets[v].label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Blend Modes */}
                        <div className="space-y-2">
                          <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Layer Blend Mode</label>
                          <select 
                            value={compositing.blendMode}
                            onChange={e => setCompositing({...compositing, blendMode: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white outline-none focus:border-blue-500"
                          >
                            {blendModes.map(m => (
                              <option key={m} value={m} className="bg-slate-900">{m.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-mono uppercase"><span>Horizontal Pos</span><span>{transform.x}%</span></div>
                            <input type="range" min="-50" max="50" value={transform.x} onChange={e => setTransform({...transform, x: parseInt(e.target.value)})} className="w-full accent-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-mono uppercase"><span>Vertical Pos</span><span>{transform.y}%</span></div>
                            <input type="range" min="-50" max="50" value={transform.y} onChange={e => setTransform({...transform, y: parseInt(e.target.value)})} className="w-full accent-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-mono uppercase"><span>Subject Scale</span><span>{transform.scale}x</span></div>
                            <input type="range" min="0.5" max="2" step="0.1" value={transform.scale} onChange={e => setTransform({...transform, scale: parseFloat(e.target.value)})} className="w-full accent-blue-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 bg-slate-900 border border-white/10 rounded-[2rem] p-8 space-y-6">
                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Select Background Scene</span>
                    <div className="grid grid-cols-2 gap-4">
                      {availableClips.map(clip => (
                        <button
                          key={clip.id}
                          onClick={() => setTargetScene(clip.path)}
                          className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${targetScene === clip.path ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                        >
                          <video src={clip.path} muted loop autoPlay className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    
                    {/* Interactive Live Preview */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/5">
                      {targetScene ? (
                        <>
                          <video src={targetScene} autoPlay muted loop className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <motion.video 
                              src={extractedEntity?.visual?.assetPath} 
                              autoPlay 
                              muted 
                              loop 
                              style={{ 
                                x: `${transform.x}%`, 
                                y: `${transform.y}%`, 
                                scale: transform.scale,
                                mixBlendMode: compositing.blendMode as any,
                                filter: `${vibePresets[compositing.vibePreset].filter} contrast(${transform.contrast}%) brightness(${transform.brightness}%)`,
                                maskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`,
                                WebkitMaskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`
                              }}
                              className="h-4/5 w-auto object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-700 uppercase tracking-widest">
                          [ Awaiting_Scene_Selection ]
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleRerasterize}
                      disabled={!targetScene || isProcessing}
                      className="w-full py-4 bg-purple-600 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-2xl hover:bg-purple-500 transition-all disabled:opacity-20"
                    >
                      {isProcessing ? 'Merging Layers...' : 'Confirm Character Placement'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: TEXT OVERLAY */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-12 space-y-8"
              >
                <div className="flex items-center gap-4 text-emerald-400">
                  <FaQuoteLeft size={24} />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Step 3: Add Text Overlay</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-7 relative aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                    <video src={targetScene} autoPlay muted loop className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.video 
                        src={extractedEntity?.visual?.assetPath} 
                        autoPlay 
                        muted 
                        loop 
                        style={{ 
                          x: `${transform.x}%`, 
                          y: `${transform.y}%`, 
                          scale: transform.scale,
                          filter: `contrast(${transform.contrast}%) brightness(${transform.brightness}%)`,
                          maskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`,
                          WebkitMaskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`
                        }}
                        className="h-4/5 w-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                      />
                    </div>
                    <div className="absolute bottom-12 left-12 right-12">
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white text-3xl font-black italic uppercase tracking-tighter leading-none drop-shadow-lg"
                      >
                        {tacticalText || 'Your text will appear here...'}
                      </motion.p>
                    </div>
                  </div>

                  <div className="md:col-span-5 bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                    {/* Audio Engineering Section */}
                    <div className="space-y-4 pb-6 border-b border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Audio Engineering</span>
                        <div className="flex items-center gap-2">
                          <label className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase cursor-pointer hover:bg-white/10 transition-all">
                            + Load MP3
                            <input 
                              type="file" 
                              accept="audio/mpeg" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  const newTrack = { id: `audio-${Math.random()}`, name: file.name, path: url };
                                  setAvailableAudio([...availableAudio, newTrack]);
                                  setAudioConfig({...audioConfig, backgroundTrack: url});
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Background Score</label>
                          <select 
                            value={audioConfig.backgroundTrack}
                            onChange={e => setAudioConfig({...audioConfig, backgroundTrack: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white outline-none focus:border-blue-500"
                          >
                            {availableAudio.map(track => (
                              <option key={track.id} value={track.path} className="bg-slate-900">{track.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[7px] font-mono uppercase text-white/40"><span>BGM Vol</span><span>{audioConfig.backgroundVolume}%</span></div>
                            <input 
                              type="range" min="0" max="100" 
                              value={audioConfig.backgroundVolume} 
                              onChange={e => setAudioConfig({...audioConfig, backgroundVolume: parseInt(e.target.value)})} 
                              className="w-full accent-blue-500" 
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[7px] font-mono uppercase text-white/40"><span>Voice Vol</span><span>{audioConfig.subjectVolume}%</span></div>
                            <input 
                              type="range" min="0" max="150" 
                              value={audioConfig.subjectVolume} 
                              onChange={e => setAudioConfig({...audioConfig, subjectVolume: parseInt(e.target.value)})} 
                              className="w-full accent-blue-500" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Hidden Audio for Preview */}
                      <audio 
                        src={audioConfig.backgroundTrack} 
                        autoPlay 
                        loop 
                        muted={audioConfig.isMuted || step !== 3}
                        ref={(el) => { if (el) el.volume = audioConfig.backgroundVolume / 100; }}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Script & Voice</span>
                      <div className="flex gap-2">
                        {availableVoices.map(voice => (
                          <button 
                            key={voice}
                            onClick={() => setSelectedVoice(voice)}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${selectedVoice === voice ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-500'}`}
                          >
                            {voice}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea 
                      value={tacticalText}
                      onChange={(e) => setTacticalText(e.target.value)}
                      placeholder="Type your story or dialogue here..."
                      className="w-full h-48 bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-mono text-white placeholder:text-white/10 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handlePlayScript}
                        disabled={!tacticalText}
                        className="py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                      >
                        <FaVolumeUp /> Preview Voice
                      </button>
                      <button 
                        onClick={handleFinalize}
                        disabled={isRendering}
                        className="py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50"
                      >
                        {isRendering ? 'Rendering...' : 'Finalize & Save'}
                      </button>
                    </div>

                    <button 
                      onClick={() => setStep(1)}
                      className="w-full py-4 text-[9px] font-mono text-white/20 uppercase hover:text-white transition-all"
                    >
                      [ Start Over ]
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ProductionStudio;
