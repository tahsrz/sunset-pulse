'use client';
import { useState, useEffect } from 'react';
import { 
  FaHistory, FaClock, FaUser, FaDatabase, 
  FaBrain, FaBolt, FaExclamationTriangle, FaCommentDots 
} from 'react-icons/fa';
import { supabase, subscribeToEvents } from '@/lib/supabase';

const IntelligenceTimeline = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('intelligence_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setEvents(data);
      setLoading(false);
    };

    fetchEvents();

    const sub = subscribeToEvents((payload) => {
      setEvents(prev => [payload.new, ...prev.slice(0, 19)]);
    });

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, []);

  const getEventIcon = (type) => {
    switch(type) {
      case 'SPRINT_INITIALIZED': return <FaBrain className='text-purple-400' />;
      case 'COLLECTION_SYNC': return <FaBolt className='text-red-400' />;
      case 'SPATIAL_INTEL': return <FaCommentDots className='text-orange-400' />;
      case 'VIEW_MODE_SHIFT': return <FaDatabase className='text-blue-400' />;
      default: return <FaHistory className='text-slate-400' />;
    }
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center gap-3 mb-6'>
        <div className='p-2 bg-slate-800 rounded-lg text-slate-400'>
          <FaHistory size={12} />
        </div>
        <h3 className='text-xs font-black uppercase tracking-widest text-white'>Intelligence Audit Stream</h3>
      </div>

      <div className='space-y-4 overflow-y-auto pr-2 custom-scrollbar'>
        {events.map((event) => (
          <div key={event.id} className='relative pl-6 border-l border-white/5 pb-4 last:pb-0'>
            <div className='absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center'>
              <div className='w-1 h-1 rounded-full bg-white/40' />
            </div>
            
            <div className='flex justify-between items-start mb-1'>
              <div className='flex items-center gap-2'>
                <span className='text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/5'>
                  {event.event_type}
                </span>
                <span className='text-[10px] font-bold text-white/80'>{event.actor_name || 'SYSTEM'}</span>
              </div>
              <div className='text-[8px] font-mono text-slate-600 flex items-center gap-1'>
                <FaClock size={8} /> {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className='bg-white/[0.02] border border-white/5 p-3 rounded-xl hover:bg-white/[0.04] transition-all group'>
              <div className='flex gap-3'>
                <div className='mt-1 opacity-50 group-hover:opacity-100 transition-opacity'>
                  {getEventIcon(event.event_type)}
                </div>
                <p className='text-[10px] text-slate-400 leading-relaxed font-mono'>
                  {event.description}
                </p>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && !loading && (
          <div className='text-center py-10 opacity-20 text-[10px] font-black uppercase tracking-widest'>
            No Historical Data Captured
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceTimeline;
