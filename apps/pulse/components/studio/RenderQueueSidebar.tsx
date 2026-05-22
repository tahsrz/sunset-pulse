import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaVolumeUp } from 'react-icons/fa';

interface RenderQueueSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: any[];
  onBatchRender: () => void;
  onDeliver: (job: any) => void;
  onDirectVoiceover: (job: any) => void;
}

export const RenderQueueSidebar: React.FC<RenderQueueSidebarProps> = ({ 
  isOpen, onClose, jobs, onBatchRender, onDeliver, onDirectVoiceover 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-white/10 z-50 p-8 shadow-2xl overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Render Queue</h3>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-all text-xs">CLOSE</button>
            </div>

            <div className="space-y-4">
              {jobs.length === 0 ? (
                <div className="text-[10px] font-mono text-slate-600 uppercase text-center py-12 border border-white/5 rounded-2xl">
                  Queue is empty
                </div>
              ) : (
                jobs.map(job => (
                  <div key={job._id} className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono text-slate-500">{job.jobId}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded ${
                        job.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                        job.status === 'PROCESSING' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                        job.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-500'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-white/80 truncate">
                      {job.recipe.script?.substring(0, 30)}...
                    </div>
                    {job.status === 'PROCESSING' && (
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${job.progress}%` }} />
                      </div>
                    )}
                    {job.outputUrl && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <a href={job.outputUrl} target="_blank" className="block text-center py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-all">
                            MP4
                          </a>
                          <button 
                            onClick={() => onDirectVoiceover(job)}
                            className="py-2 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1"
                          >
                            <FaVolumeUp size={10} /> Voice
                          </button>
                        </div>
                        <button 
                          onClick={() => onDeliver(job)}
                          className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-emerald-500 transition-all shadow-lg"
                        >
                          Deliver Report
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {jobs.some(j => j.status === 'PENDING') && (
              <button 
                onClick={onBatchRender}
                className="w-full mt-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl"
              >
                Start Batch Render
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
