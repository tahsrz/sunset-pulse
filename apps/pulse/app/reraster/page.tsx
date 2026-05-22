'use client';

import React, { useState } from 'react';
import { FaVideo, FaMagic, FaSave, FaTerminal, FaRobot } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MemeRerasterPage = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedVibe, setExtractedVibe] = useState<any>(null);

  const handleReraster = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/jamie/reraster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          description: description,
          transcription: "Simulated transcription based on visual analysis..."
        })
      });
      const data = await response.json();
      setExtractedVibe(data);
      toast.success('Vibe Mask Extracted!');
    } catch (error) {
      toast.error('Rerastering failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-24 px-6 text-white font-mono">
      <ToastContainer theme="dark" />
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-4">
            Meme <span className="text-rose-500">Rerasterizer</span>
          </h1>
          <p className="text-slate-500">Extract semantic vibes from video and convert them into Linguistic CSS for agentic output.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-4">Video Source / URL</label>
              <input 
                type="text" 
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://tiktok.com/..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-xs focus:border-rose-500 outline-none"
              />
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-4">Content Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's happening and why it's funny..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-xs h-32 focus:border-rose-500 outline-none resize-none"
              />
            </div>

            <button 
              onClick={handleReraster}
              disabled={isProcessing || !videoUrl}
              className="w-full py-4 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-3"
            >
              {isProcessing ? <FaRobot className="animate-spin" /> : <FaMagic />}
              Identify Vibe Mask
            </button>
          </div>

          <div className="space-y-6">
            {extractedVibe ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-blue-600/10 border border-blue-500/20 rounded-3xl"
              >
                <div className="flex items-center gap-3 text-blue-500 mb-6">
                  <FaTerminal />
                  <span className="text-xs font-black uppercase tracking-widest">Linguistic CSS Generated</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-white/30 uppercase mb-1">Vibe ID</div>
                    <div className="text-emerald-400 font-bold">.{extractedVibe.vibe_id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/30 uppercase mb-1">Structural Logic</div>
                    <div className="text-xs p-4 bg-black/40 rounded-xl border border-white/5 leading-relaxed italic">
                      {extractedVibe.logic}
                    </div>
                  </div>
                  <button className="flex items-center gap-2 text-[10px] uppercase font-black text-white/50 hover:text-white transition-colors">
                    <FaSave /> Save to Ozriel's Registry
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center p-12 text-center opacity-30">
                <FaVideo size={48} className="mb-4" />
                <div className="text-[10px] uppercase font-black tracking-widest">Awaiting Transmission</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemeRerasterPage;
