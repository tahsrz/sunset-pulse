'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import TacticalCloth, { TacticalClothRef } from '@/components/TacticalCloth';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, Activity, Cpu, Volume2 } from 'lucide-react';
import { speak } from '@/lib/core/tts';

const StorytimePage = () => {
  const [story, setStory] = useState<any>(null);
  const [availableEnvoys, setAvailableEnvoys] = useState<any[]>([]);
  const [availableStories, setAvailableStories] = useState<any[]>([]);
  const [selectedEnvoyId, setSelectedEnvoyId] = useState<string>('');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('CATERPILLAR-01');
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTacticalMode, setIsTacticalMode] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStory, setNewStory] = useState({ uid: '', title: '', originalText: '' });
  const clothRef = useRef<TacticalClothRef>(null);

  useEffect(() => {
    // 1. Fetch available personas for the picker
    fetch('/api/entities/list')
      .then(res => res.json())
      .then(data => {
        const envoys = data.entities.filter((e: any) => e.class === 'ENVOY');
        setAvailableEnvoys(envoys);
      });

    // 2. Fetch available stories
    fetch('/api/storytime')
      .then(res => res.json())
      .then(data => {
        setAvailableStories(data.stories || []);
      });
  }, []);

  useEffect(() => {
    if (!selectedStoryId) return;
    setIsLoading(true);
    // 3. Fetch the story with the specifically selected envoy
    const url = `/api/storytime/${selectedStoryId}${selectedEnvoyId ? `?envoyId=${selectedEnvoyId}` : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setStory(data);
        setCurrentPage(0);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Storytime Load Error:", err);
        setIsLoading(false);
      });
  }, [selectedStoryId, selectedEnvoyId]);

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/storytime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStory),
      });
      const data = await res.json();
      if (data.story) {
        setAvailableStories([...availableStories, data.story]);
        setSelectedStoryId(data.story.uid);
        setShowCreateForm(false);
        setNewStory({ uid: '', title: '', originalText: '' });
      }
    } catch (err) {
      console.error("Create Story Error:", err);
    }
    setIsLoading(false);
  };

  const triggerVisualCue = useCallback((cue: string) => {
    if (!clothRef.current) return;
    
    switch (cue) {
      case 'ripple':
        clothRef.current.applyForce(100, 100, 150, 20);
        break;
      case 'pulse':
        clothRef.current.pet();
        break;
      case 'shake':
        clothRef.current.applyForce(50, 50, 200, 40);
        break;
      case 'glitch':
        clothRef.current.glitch();
        break;
      default:
        break;
    }
  }, []);

  const handleSpeech = useCallback(() => {
    if (story?.pages[currentPage]) {
      const text = isTacticalMode 
        ? story.pages[currentPage].tacticalInterpretation 
        : story.pages[currentPage].originalText;
      speak(text, story.envoyName);
    }
  }, [currentPage, isTacticalMode, story]);

  useEffect(() => {
    if (story?.pages[currentPage]) {
      triggerVisualCue(story.pages[currentPage].visualCue);
      handleSpeech();
    }
  }, [currentPage, handleSpeech, isTacticalMode, story, triggerVisualCue]);

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-primary font-mono animate-pulse">Loading Story...</div>;
  if (!story) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-500 font-mono">ERROR: STORY_NOT_FOUND</div>;

  const page = story.pages[currentPage];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary/30">
      {/* Story Header */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <BookOpen className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-[0.3em] text-white">Project: Storytime</h1>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{story.storyTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              NARRATOR / {story.envoyName}
            </span>
            <span>SECURE_STREAM / ACTIVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
        {/* Left: Studio Controls */}
        <aside className="space-y-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Story Library</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Select Story</label>
                <select 
                  value={selectedStoryId}
                  onChange={(e) => setSelectedStoryId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:border-primary outline-none transition-all"
                >
                  {availableStories.map(s => (
                    <option key={s.uid} value={s.uid}>{s.title}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => setShowCreateForm(true)}
                className="w-full py-2 bg-white/5 border border-dashed border-white/20 rounded-xl text-[9px] font-mono uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all"
              >
                + Add New Story
              </button>
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Narrator Voice</h3>
            <div className="space-y-2">
              {availableEnvoys.map((envoy) => (
                <button
                  key={envoy.uid}
                  onClick={() => setSelectedEnvoyId(envoy.uid)}
                  className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${selectedEnvoyId === envoy.uid ? 'bg-primary/20 border-primary/50 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: envoy.visual?.meshColor, boxShadow: `0 0 8px ${envoy.visual?.meshColor}` }} 
                  />
                  <span className="text-xs font-mono uppercase tracking-tight text-left flex-1">{envoy.name}</span>
                  {selectedEnvoyId === envoy.uid && <Activity size={12} className="text-primary animate-pulse" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Video Export</h3>
            <button
              onClick={() => {
                setIsRendering(true);
                setTimeout(() => {
                  alert("Download Ready: story_clip_part_" + (currentPage + 1) + ".mp4");
                  setIsRendering(false);
                }, 2000);
              }}
              disabled={isRendering}
              className="w-full py-4 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isRendering ? 'Processing...' : 'Download Video Clip'}
            </button>
            <p className="text-[9px] text-center text-slate-500 font-mono italic">Est. time: 4s</p>
          </div>
        </aside>

        {/* Modal: Create Story */}
        <AnimatePresence>
          {showCreateForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCreateForm(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Create New Story</h3>
                  <button onClick={() => setShowCreateForm(false)} className="text-white/20 hover:text-white">
                    <Activity size={18} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreateStory} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Story ID</label>
                      <input 
                        required
                        value={newStory.uid}
                        onChange={e => setNewStory({...newStory, uid: e.target.value})}
                        placeholder="STORY-001"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Title</label>
                      <input 
                        required
                        value={newStory.title}
                        onChange={e => setNewStory({...newStory, title: e.target.value})}
                        placeholder="The Great Reset"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Story Text</label>
                    <textarea 
                      required
                      rows={6}
                      value={newStory.originalText}
                      onChange={e => setNewStory({...newStory, originalText: e.target.value})}
                      placeholder="Type your story here. Use double spacing for new pages."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:border-primary outline-none transition-all resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-4 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Save Story
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Center: The Envoy (The Face) */}
        <section className="flex flex-col items-center justify-center space-y-8">
          <div className="relative group">
            {/* Ambient Glow */}
            <div 
              className="absolute -inset-4 rounded-[2rem] blur-2xl opacity-20 transition-all duration-1000 group-hover:opacity-40"
              style={{ backgroundColor: story.envoyVisual?.meshColor || '#3b82f6' }}
            />
            <TacticalCloth 
              ref={clothRef}
              id={story.envoyName.toUpperCase().replace(' ', '-')}
              status="NARRATING"
              moodColor={story.envoyVisual?.meshColor || '#3b82f6'}
              videoSrc={story.envoyVisual?.assetPath || '/videos/jamie_base.mp4'}
            />
          </div>

          <div className="flex gap-4">
             <button 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-mono text-xs flex items-center gap-4">
              <span className="text-slate-500">PHASE</span>
              <span className="text-primary font-bold">{currentPage + 1} / {story.pages.length}</span>
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(story.pages.length - 1, prev + 1))}
              disabled={currentPage === story.pages.length - 1}
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-20 transition-all text-primary"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </section>

        {/* Right: The Text (The Soul) */}
        <section className="space-y-12">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Narrative Mode</h3>
              <p className="text-xs text-white/40">{isTacticalMode ? 'Guided Interpretation Active' : 'Original Text'}</p>
            </div>
            <button 
              onClick={() => setIsTacticalMode(!isTacticalMode)}
              className={`px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest border transition-all ${isTacticalMode ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-white/40'}`}
            >
              {isTacticalMode ? 'Guided On' : 'Guided Off'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={`${currentPage}-${isTacticalMode}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-8 rounded-3xl relative overflow-hidden transition-colors duration-500 ${isTacticalMode ? 'bg-primary/5 border border-primary/20' : 'bg-white/5 border border-white/10'}`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                {isTacticalMode ? <Activity size={48} /> : <BookOpen size={48} />}
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border ${isTacticalMode ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/10 text-white/60 border-white/20'}`}>
                  {isTacticalMode ? <Activity size={12} className="animate-pulse" /> : <BookOpen size={12} />}
                  {isTacticalMode ? 'Guided Interpretation' : 'Original Text'}
                </div>
                <p className={`text-2xl md:text-3xl font-bold leading-snug ${isTacticalMode ? 'text-white' : 'text-slate-400 font-serif italic'}`}>
                  {isTacticalMode ? page.tacticalInterpretation : page.originalText}
                </p>

                {isTacticalMode && page.humanityScore !== undefined && (
                  <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/5">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${page.humanityScore}%` }}
                        className={`h-full ${page.humanityScore > 80 ? 'bg-intel-green' : page.humanityScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      Humanity: <span className="text-white font-bold">{page.humanityScore}%</span>
                    </span>
                  </div>
                )}
              </div>
              
              {/* Subtle Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none bg-recon-scan opacity-5" />
            </motion.div>
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="block text-[10px] font-mono text-slate-500 uppercase mb-2">Operation vibe</span>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">{page.metadata?.vibe || 'NEUTRAL'}</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <span className="block text-[10px] font-mono text-slate-500 uppercase mb-2">Visual Sync</span>
              <span className="text-xs font-bold uppercase tracking-widest text-intel-green">{page.visualCue || 'NONE'}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StorytimePage;
