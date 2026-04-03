'use client';
import { useState, useEffect } from 'react';
import { 
  FaBolt, FaCheckCircle, FaClock, FaExclamationCircle, 
  FaPlay, FaPause, FaSync, FaDatabase, FaRocket
} from 'react-icons/fa';
import { subscribeToSprintTasks } from '@/lib/supabase';

const JamieSprintDashboard = ({ activeSprintId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeSprintId) return;

    // Initial fetch of tasks for the sprint
    const fetchTasks = async () => {
      try {
        const { data, error } = await window.supabase
          .from('tasks')
          .select('*')
          .eq('sprint_id', activeSprintId)
          .order('created_at', { ascending: true });
        
        if (data) setTasks(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sprint tasks:', err);
      }
    };

    fetchTasks();

    // Subscribe to real-time updates WIP
    const subscription = subscribeToSprintTasks(activeSprintId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setTasks(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
      } else if (payload.eventType === 'DELETE') {
        setTasks(prev => prev.filter(t => t.id === payload.old.id));
      }
    });

    return () => {
      if (subscription) window.supabase.removeChannel(subscription);
    };
  }, [activeSprintId]);

  if (!activeSprintId) {
    return (
      <div className='flex flex-col items-center justify-center h-full py-10 opacity-30'>
        <FaRocket size={40} className='mb-4' />
        <div className='text-xs font-black uppercase tracking-[0.3em]'>No Active Sprint</div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='p-2 bg-green-500/20 rounded-lg text-green-400'>
            <FaBolt size={12} />
          </div>
          <h3 className='text-xs font-black uppercase tracking-widest text-white'>Live Sprint Execution</h3>
        </div>
        <div className='text-[10px] font-mono text-green-400 animate-pulse'>ACTIVE_LOGIC_STREAM</div>
      </div>

      <div className='space-y-3'>
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className={`bg-white/5 border ${task.status === 'Complete' ? 'border-green-500/30' : 'border-white/10'} p-4 rounded-xl hover:bg-white/10 transition-all group`}
          >
            <div className='flex justify-between items-start mb-2'>
              <div className='flex flex-col'>
                <div className='flex items-center gap-2'>
                  <h4 className='text-[11px] font-bold text-white uppercase tracking-tight'>{task.title}</h4>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                    task.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                    task.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className='text-[9px] text-slate-500 font-mono mt-0.5'>{task.api_endpoint}</div>
              </div>
              <div className='flex items-center gap-2'>
                <div className='text-right'>
                  <div className='text-[10px] font-mono text-blue-400'>{task.duration_minutes}M</div>
                </div>
                {task.status === 'Complete' ? (
                  <FaCheckCircle className='text-green-500' size={14} />
                ) : (
                  <div className='w-3 h-3 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin' />
                )}
              </div>
            </div>
            
            <p className='text-[10px] text-slate-400 leading-relaxed italic mb-3'>"{task.description}"</p>
            
            <div className='flex justify-between items-center'>
              <div className='flex items-center gap-2'>
                <div className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                  task.status === 'Complete' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {task.status}
                </div>
              </div>
              <button className='opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white'>
                Intercept Manual
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && !loading && (
          <div className='text-center py-10 opacity-20 text-[10px] font-black uppercase tracking-widest'>
            Initializing Task Matrix...
          </div>
        )}
      </div>

      <div className='pt-4 border-t border-white/5'>
        <button className='w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 transition-all flex items-center justify-center gap-2'>
          <FaSync size={10} /> Recalibrate Sprint Logic
        </button>
      </div>
    </div>
  );
};

export default JamieSprintDashboard;
