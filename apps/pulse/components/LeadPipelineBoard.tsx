'use client';

import { useState, useEffect } from 'react';
import { 
  FaUser, FaChevronRight, FaFilter, FaListUl, 
  FaGripVertical, FaCircle, FaPlus
} from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

const STAGES = ['New', 'Cultivate', 'Appointment', 'Active', 'Under Contract', 'Closed'];

interface Lead {
  id: string;
  name: string;
  email: string;
  stage: string;
  budget?: number;
  probability: number;
  updated_at: string;
  [key: string]: any;
}

const LeadPipelineBoard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (data) setLeads(data as Lead[]);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching pipeline leads:', err);
      }
    };

    fetchPipeline();
  }, []);

  const getLeadsByStage = (stage: string) => {
    return leads.filter(l => l.stage === stage);
  };

  const getStageColor = (stage: string) => {
    switch(stage) {
      case 'New': return 'text-blue-400 bg-blue-400/10';
      case 'Cultivate': return 'text-amber-400 bg-amber-400/10';
      case 'Appointment': return 'text-purple-400 bg-purple-400/10';
      case 'Active': return 'text-green-400 bg-green-400/10';
      case 'Under Contract': return 'text-orange-400 bg-orange-400/10';
      case 'Closed': return 'text-emerald-400 bg-emerald-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  return (
    <div className='flex flex-col h-full bg-slate-950 p-6 rounded-3xl border border-white/5 shadow-2xl'>
      <div className='flex items-center justify-between mb-8'>
        <div className='flex items-center gap-4'>
          <div className='p-3 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/20'>
            <FaListUl size={16} />
          </div>
          <div>
            <h3 className='text-sm font-black uppercase tracking-widest text-white'>Lead Pipeline</h3>
            <p className='text-[10px] text-slate-500 uppercase font-bold tracking-tighter'>Strategic Sales Management</p>
          </div>
        </div>
        <button className='bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all group'>
          <FaPlus size={12} className='text-white/60 group-hover:text-white transition-colors' />
        </button>
      </div>

      <div className='flex gap-6 overflow-x-auto pb-6 scrollbar-hide'>
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage);
          return (
            <div key={stage} className='flex flex-col min-w-[280px] w-[280px]'>
              <div className='flex items-center justify-between mb-4 px-2'>
                <div className='flex items-center gap-3'>
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)] ${getStageColor(stage).split(' ')[0]}`} />
                  <span className='text-[11px] font-black uppercase tracking-[0.1em] text-white/70'>{stage}</span>
                </div>
                <div className='px-2 py-0.5 bg-white/5 rounded text-[10px] font-mono text-white/40 border border-white/5'>
                  {stageLeads.length}
                </div>
              </div>

              <div className='space-y-4 flex-1 bg-white/[0.01] border border-white/5 rounded-[2rem] p-4 min-h-[500px] backdrop-blur-sm'>
                {stageLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className='bg-slate-900/80 border border-white/5 p-4 rounded-2xl hover:border-blue-500/30 transition-all group cursor-pointer shadow-lg hover:shadow-blue-500/5'
                  >
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex flex-col'>
                        <h4 className='text-[12px] font-bold text-white truncate max-w-[180px] group-hover:text-blue-400 transition-colors'>{lead.name}</h4>
                        <span className='text-[9px] text-slate-500 font-mono mt-0.5'>{lead.email}</span>
                      </div>
                      <FaGripVertical className='text-white/10 opacity-0 group-hover:opacity-100 transition-opacity mt-1' size={12} />
                    </div>
                    
                    <div className='flex flex-col gap-3'>
                      <div className='flex items-center justify-between'>
                        <div className='text-[10px] text-slate-400 font-bold'>
                          {lead.budget ? `$${lead.budget.toLocaleString()}` : 'No Budget Set'}
                        </div>
                        <div className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          lead.probability > 70 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {lead.probability}%
                        </div>
                      </div>
                      
                      <div className='pt-3 border-t border-white/5 flex items-center justify-between'>
                        <div className='flex -space-x-2'>
                          <div className='w-6 h-6 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-white shadow-lg'>J</div>
                        </div>
                        <div className='text-[8px] text-slate-600 font-bold uppercase tracking-widest'>Active Engagement</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {stageLeads.length === 0 && (
                  <div className='h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[1.5rem] p-6 text-center group/empty'>
                    <div className='p-4 bg-white/[0.02] rounded-full mb-3 group-hover/empty:bg-white/[0.04] transition-all'>
                      <FaFilter className='text-white/5 text-xl' />
                    </div>
                    <div className='text-[9px] font-black uppercase text-white/20 tracking-widest'>No Leads in Stage</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeadPipelineBoard;
