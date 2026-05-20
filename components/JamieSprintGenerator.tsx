'use client';
import React, { useState } from 'react';
import { FaBrain, FaRocket, FaClock, FaBolt } from 'react-icons/fa';
import { generateJamieSprint, initializeWorkflow, logEvent } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface JamieSprintGeneratorProps {
  onSprintCreated?: (id: string) => void;
}

const JamieSprintGenerator: React.FC<JamieSprintGeneratorProps> = ({ onSprintCreated }) => {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!goal) return toast.warn("Specify a strategic goal first.");
    
    setLoading(true);
    toast.info("Jamie is building a roadmap...");
    
    try {
      //  Call the Edge Function
      const sprintData = await generateJamieSprint(goal, duration);
      
      //  Initialize in Database via RPC
      const result = await initializeWorkflow(
        sprintData.sprint_name,
        sprintData.business_goal,
        sprintData,
        { urgency: 8, source: 'Dashboard' }
      );

      //  Log Event
      await logEvent({
        type: 'SPRINT_INITIALIZED',
        description: `Jamie architected a ${duration}h sprint for goal: "${goal}"`,
        actorId: 'JAMIE-01',
        actorName: 'JAMIE',
        targetId: result.sprint_id,
        metadata: { goal, duration, sprint_name: sprintData.sprint_name },
        severity: 'INFO'
      });
      
      toast.success("Roadmap created by Jamie.");
      if (onSprintCreated) onSprintCreated(result.sprint_id);
      setGoal('');
    } catch (err) {
      console.error(err);
      toast.error("Jamie could not create the roadmap.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-purple-500/5 border border-purple-500/20 p-6 rounded-2xl relative overflow-hidden group'>
      <div className='absolute -right-4 -top-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform'>
        <FaBrain size={80} className='text-purple-400' />
      </div>
      
      <div className='relative z-10'>
        <div className='flex items-center gap-2 mb-4'>
          <FaRocket className='text-purple-400 animate-pulse' />
          <h2 className='text-xs font-black uppercase tracking-[0.2em] text-white'>Jamie Workflow Generation</h2>
        </div>
        
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Ask Jamie: 'Find a rental for Chris' or 'Analyze North Texas listings'..."
          className='w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-purple-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none h-24 mb-4'
        />
        
        <div className='flex items-center gap-4 mb-4'>
          <div className='flex-1'>
            <div className='text-[8px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1'>
              <FaClock size={8} /> Duration (Hours)
            </div>
            <input 
              type="range" min="1" max="24" value={duration} 
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className='w-full accent-purple-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer'
            />
          </div>
          <div className='text-xl font-mono font-black text-purple-400 w-8'>{duration}H</div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full ${loading ? 'bg-slate-800 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500'} text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <div className='w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              <span>Jamie is working...</span>
            </>
          ) : (
            <>
              <FaBolt size={10} />
              <span>Create Jamie Workflow</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default JamieSprintGenerator;
