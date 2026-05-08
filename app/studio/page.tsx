'use client';

import React, { useState } from 'react';
import { FaExchangeAlt, FaQuoteLeft, FaCheckCircle, FaVolumeUp, FaMicrophone } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudio } from '@/hooks/useStudio';
import { RenderQueueSidebar } from '@/components/studio/RenderQueueSidebar';
import { LibraryStep } from '@/components/studio/LibraryStep';
import { speak } from '@/lib/core/tts';

import { VibeEngine, VibeDictionary } from '@/utils/security/VibeEngine';

const ProductionStudio = () => {
  const {
    step, setStep,
    availableClips,
    leads, renderQueue,
    extractedEntity, setExtractedEntity,
    targetScene, setTargetScene,
    tacticalText, setTacticalText,
    selectedVoice, setSelectedVoice,
    clonedVoices, setClonedVoices,
    selectedLead, setSelectedLead,
    isProcessing, setIsProcessing,
    isHarvesting, isAcquiring, setIsAcquiring,
    isRendering, setIsRendering,
    transform, setTransform,
    compositing, setCompositing,
    audioConfig, setAudioConfig,
    fetchQueue, handleHarvest, handleDeleteAsset
  } = useStudio();

  const vibeSignature = VibeEngine.getVibeSignature(compositing.vibePreset, transform);
  const [showQueue, setShowQueue] = useState(false);
  const availableVoices = ['Jamie', 'Spike', 'Ghost'];

  const handlePlayScript = () => {
    if (!tacticalText) return;
    speak(tacticalText, selectedVoice);
  };

  const handleCloneVoice = () => {
    const name = prompt("Enter a name for your cloned voice preset:");
    if (name) {
      setClonedVoices([...clonedVoices, { id: `CLONE-${Date.now()}`, name }]);
      alert(`Voice "${name}" has been cloned and saved to your presets.`);
    }
  };

  const blendModes = ['normal', 'screen', 'multiply', 'overlay', 'hard-light', 'difference'];

  const handleAcquire = async (url: string) => {
    setIsAcquiring(true);
    try {
      const res = await fetch('/api/admin/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success: ${data.asset} acquired.`);
        handleHarvest();
      }
    } catch (err) {
      console.error("Acquisition Failed:", err);
    }
    setIsAcquiring(false);
  };

  const handleRasterize = async (clip: any) => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    
    if (clip.autoMask) {
      setTransform(prev => ({ ...prev, ...clip.autoMask, x: clip.autoMask.x ?? 0, y: clip.autoMask.y ?? 0 }));
    } else {
      setTransform({ x: 0, y: 0, scale: 1, maskRadius: 80, maskFeather: 20, brightness: 110, contrast: 120 });
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

  const handleDirectVoiceover = (clip: any) => {
    setTargetScene(clip.path);
    setExtractedEntity(null);
    setStep(3);
  };

  const handleBatchRender = async () => {
    try {
      const res = await fetch('/api/admin/render/batch', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      const interval = setInterval(async () => {
        await fetchQueue();
        if (renderQueue.every(j => j.status !== 'PROCESSING')) clearInterval(interval);
      }, 3000);
    } catch (err) {
      console.error("Batch Start Failed:", err);
    }
  };

  const handleDeliverBriefing = async (job: any) => {
    if (!selectedLead) return alert("Please select a target client first.");
    try {
      const res = await fetch('/api/leads/reengage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead,
          briefingUrl: `/briefing/render/${job.jobId}`,          notes: `Personalized market briefing: ${targetScene.split('/').pop()}`
        })
      });
      if (res.ok) alert("Briefing delivered.");
    } catch (err) {
      console.error("Delivery Failed:", err);
    }
  };

  const handleFinalize = async () => {
    setIsRendering(true);
    try {
      const recipe = { targetScene, extractedEntity, transform, compositing, audioConfig, script: tacticalText, voice: selectedVoice, timestamp: new Date().toISOString() };
      const res = await fetch('/api/admin/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recipe) });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert(`Success! Render Complete.`);
          window.open(data.downloadUrl, '_blank');
        }
      }
    } catch (err) {
      console.error("Render Failed:", err);
    }
    setIsRendering(false);
  };

  const handleQueueRecipe = async () => {
    const recipe = { targetScene, extractedEntity, transform, compositing, audioConfig, script: tacticalText, voice: selectedVoice, timestamp: new Date().toISOString() };
    try {
      const res = await fetch('/api/admin/render/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recipe) });
      if (res.ok) { fetchQueue(); setShowQueue(true); }
    } catch (err) {
      console.error("Queue Failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-8 text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/5 pb-12">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter text-white">Production <span className="text-blue-500">Studio</span></h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.4em] mt-2">Professional_Intelligence // v1.2</p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => { fetchQueue(); setShowQueue(true); }}
              className="relative px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase hover:bg-white/10 transition-all"
            >
              Queue
              {renderQueue.filter(j => j.status === 'PENDING').length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] border-2 border-slate-950">
                  {renderQueue.filter(j => j.status === 'PENDING').length}
                </span>
              )}
            </button>
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${step === i ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}>
                <span className="text-[10px] font-black">{i === 1 ? 'LIBRARY' : i === 2 ? 'COMPOSITING' : 'FINALIZE'}</span>
                {step > i && <FaCheckCircle size={10} />}
              </div>
            ))}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
          <RenderQueueSidebar 
            isOpen={showQueue} 
            onClose={() => setShowQueue(false)} 
            jobs={renderQueue} 
            onBatchRender={handleBatchRender} 
            onDeliver={handleDeliverBriefing}
            onDirectVoiceover={(job) => {
              handleDirectVoiceover({ path: job.outputUrl, name: `RE-RENDER_${job.jobId}` });
              setShowQueue(false);
            }} 
          />

          <AnimatePresence mode="wait">
            {step === 1 && (
              <LibraryStep 
                availableClips={availableClips} 
                isHarvesting={isHarvesting} 
                isAcquiring={isAcquiring} 
                isProcessing={isProcessing} 
                handleHarvest={handleHarvest} 
                handleDeleteAsset={handleDeleteAsset} 
                handleAcquire={handleAcquire} 
                handleRasterize={handleRasterize}
                handleDirectVoiceover={handleDirectVoiceover} 
              />
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="lg:col-span-12 space-y-8">
                <div className="flex items-center gap-4 text-purple-400">
                  <FaExchangeAlt size={24} />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Step 2: Professional Compositing</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-4 bg-slate-900 border border-white/10 rounded-[2rem] p-8 space-y-6">
                    <div className="space-y-4">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Extracted Subject</span>
                      <div className="aspect-square bg-black rounded-2xl overflow-hidden border border-blue-500/30 relative flex items-center justify-center">
                        <video 
                          src={extractedEntity?.visual?.assetPath} 
                          autoPlay muted loop 
                          style={{ 
                            filter: VibeEngine.computeFilter(compositing.vibePreset, transform),
                            maskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`,
                            WebkitMaskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`
                          }}
                          className="w-full h-full object-cover scale-110" 
                        />
                      </div>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-white/5">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Color Grade (LUT)</label>
                          <span className="text-[7px] font-mono text-blue-500 uppercase">Hash: {vibeSignature.substring(0, 8)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {Object.keys(VibeDictionary).map(v => (
                            <button 
                              key={v} 
                              onClick={() => setCompositing({...compositing, vibePreset: v})} 
                              className={`py-2 rounded-lg text-[7px] font-black uppercase border transition-all ${compositing.vibePreset === v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/20'}`}
                            >
                              {(VibeDictionary as any)[v].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Layer Blend Mode</label>
                        <select value={compositing.blendMode} onChange={e => setCompositing({...compositing, blendMode: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white outline-none focus:border-blue-500">
                          {blendModes.map(m => <option key={m} value={m} className="bg-slate-900">{m.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2"><div className="flex justify-between text-[8px] font-mono uppercase"><span>Horizontal Pos</span><span>{transform.x}%</span></div><input type="range" min="-50" max="50" value={transform.x} onChange={e => setTransform({...transform, x: parseInt(e.target.value)})} className="w-full accent-blue-500" /></div>
                        <div className="space-y-2"><div className="flex justify-between text-[8px] font-mono uppercase"><span>Vertical Pos</span><span>{transform.y}%</span></div><input type="range" min="-50" max="50" value={transform.y} onChange={e => setTransform({...transform, y: parseInt(e.target.value)})} className="w-full accent-blue-500" /></div>
                        <div className="space-y-2"><div className="flex justify-between text-[8px] font-mono uppercase"><span>Subject Scale</span><span>{transform.scale}x</span></div><input type="range" min="0.5" max="2" step="0.1" value={transform.scale} onChange={e => setTransform({...transform, scale: parseFloat(e.target.value)})} className="w-full accent-blue-500" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 bg-slate-900 border border-white/10 rounded-[2rem] p-8 space-y-6">
                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Select Background Scene</span>
                    <div className="grid grid-cols-2 gap-4">
                      {availableClips.map(clip => (
                        <button key={clip.id} onClick={() => setTargetScene(clip.path)} className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${targetScene === clip.path ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-white/5 opacity-40 hover:opacity-100'}`}><video src={clip.path} muted loop autoPlay className="w-full h-full object-cover" /></button>
                      ))}
                    </div>
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/5">
                      {targetScene ? (
                        <>
                          <video src={targetScene} autoPlay muted loop className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <motion.video 
                              src={extractedEntity?.visual?.assetPath} 
                              autoPlay muted loop 
                              style={{ 
                                x: `${transform.x}%`, y: `${transform.y}%`, scale: transform.scale,
                                mixBlendMode: compositing.blendMode as any,
                                filter: VibeEngine.computeFilter(compositing.vibePreset, transform),
                                maskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`,
                                WebkitMaskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`
                              }}
                              className="h-4/5 w-auto object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                            />
                          </div>
                        </>
                      ) : <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-700 uppercase tracking-widest">[ Awaiting_Scene_Selection ]</div>}
                    </div>
                    <button onClick={() => setStep(3)} disabled={!targetScene || isProcessing} className="w-full py-4 bg-purple-600 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-2xl hover:bg-purple-500 transition-all disabled:opacity-20">Confirm Placement</button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="lg:col-span-12 space-y-8">
                <div className="flex items-center gap-4 text-emerald-400"><FaQuoteLeft size={24} /><h2 className="text-2xl font-black uppercase tracking-tight">Step 3: Intelligence & Delivery</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-7 relative aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                    <video src={targetScene} autoPlay muted loop className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.video src={extractedEntity?.visual?.assetPath} autoPlay muted loop style={{ x: `${transform.x}%`, y: `${transform.y}%`, scale: transform.scale, filter: `contrast(${transform.contrast}%) brightness(${transform.brightness}%)`, maskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)`, WebkitMaskImage: `radial-gradient(circle, black ${transform.maskRadius - transform.maskFeather}%, transparent ${transform.maskRadius}%)` }} className="h-4/5 w-auto object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]" />
                    </div>
                    <div className="absolute bottom-12 left-12 right-12"><motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-white text-3xl font-black italic uppercase tracking-tighter leading-none drop-shadow-lg">{tacticalText || 'Awaiting script...'}</motion.p></div>
                  </div>
                  <div className="md:col-span-5 bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                    <div className="space-y-4 pb-6 border-b border-white/5">
                      <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voice Protocol</span></div>
                      <div className="flex gap-2">
                        <select 
                          value={selectedVoice} 
                          onChange={e => setSelectedVoice(e.target.value)} 
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white outline-none focus:border-blue-500"
                        >
                          {availableVoices.map(v => <option key={v} value={v} className="bg-slate-900">{v.toUpperCase()}</option>)}
                          {clonedVoices.map(cv => <option key={cv.id} value={cv.id} className="bg-slate-900">{cv.name.toUpperCase()} (CLONE)</option>)}
                        </select>
                        <button 
                          onClick={handleCloneVoice}
                          className="px-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                          title="Clone your own voice"
                        >
                          <FaMicrophone size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4 pb-6 border-b border-white/5">
                      <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Assignment</span></div>
                      <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-white outline-none focus:border-blue-500">
                        <option value="" className="bg-slate-900 text-slate-500">SELECT TARGET CLIENT...</option>
                        {leads.map(lead => <option key={lead._id} value={lead._id} className="bg-slate-900">{lead.firstName} {lead.lastName} ({lead.email})</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                      <textarea value={tacticalText} onChange={(e) => setTacticalText(e.target.value)} placeholder="Type executive summary..." className="w-full h-48 bg-black/40 border border-white/5 rounded-2xl p-6 text-sm font-mono text-white placeholder:text-white/10 focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={handlePlayScript} className="py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"><FaVolumeUp /> Preview</button>
                        <button onClick={handleFinalize} disabled={isRendering} className="py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl disabled:opacity-50">{isRendering ? 'Rendering...' : 'Finalize & Render'}</button>
                      </div>
                      <button onClick={handleQueueRecipe} className="w-full py-4 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg">Add to Queue</button>
                    </div>
                    <button onClick={() => setStep(1)} className="w-full py-4 text-[9px] font-mono text-white/20 uppercase hover:text-white transition-all">[ Start Over ]</button>
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
