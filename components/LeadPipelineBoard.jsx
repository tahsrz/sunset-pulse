'use client';
import { useState, useEffect } from 'react';
import { 
  FaUser, FaChevronRight, FaFilter, FaListUl, 
  FaGripVertical, FaCircle, FaPlus
} from 'react-icons/fa';

const STAGES = ['New', 'Cultivate', 'Appointment', 'Active', 'Under Contract', 'Closed'];

const LeadPipelineBoard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const { data, error } = await window.supabase
          .from('leads')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (data) setLeads(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching pipeline leads:', err);
      }
    };

    fetchPipeline();
  }, []);

  const getLeadsByStage = (stage) => {
    return leads.filter(l => l.stage === stage);
  };

  const getStageColor = (stage) => {
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
    <div className='flex flex-col h-full'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-blue-500/20 rounded-lg text-blue-400'>
            <FaListUl size={12} />
          </div>
          <h3 className='text-xs font-black uppercase tracking-widest text-white'>Asset Pipeline Grid</h3>
        </div>
        <button className='bg-white/5 hover:bg-white/10 p-2 rounded-lg border border-white/10 transition-all'>
          <FaPlus size={10} className='text-white/60' />
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4'>
        {STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage);
          return (
            <div key={stage} className='flex flex-col min-w-[180px]'>
              <div className='flex items-center justify-between mb-3 px-1'>
                <div className='flex items-center gap-2'>
                  <div className={`w-1.5 h-1.5 rounded-full ${getStageColor(stage).split(' ')[0]}`} />
                  <span className='text-[10px] font-black uppercase tracking-widest text-white/50'>{stage}</span>
                </div>
                <span className='text-[10px] font-mono text-white/20'>{stageLeads.length}</span>
              </div>

              <div className='space-y-3 flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-2 min-h-[300px]'>
                {stageLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className='bg-slate-900 border border-white/5 p-3 rounded-xl hover:border-white/20 transition-all group cursor-pointer'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <h4 className='text-[11px] font-bold text-white truncate max-w-[100px]'>{lead.name}</h4>
                      <FaGripVertical className='text-white/10 opacity-0 group-hover:opacity-100 transition-opacity' size={10} />
                    </div>
                    
                    <div className='flex flex-col gap-1'>
                      <div className='text-[9px] text-slate-500 font-mono'>${lead.budget?.toLocaleString()}</div>
                      <div className='flex items-center justify-between mt-2'>
                        <div className='flex -space-x-1'>
                          <div className='w-4 h-4 rounded-full bg-blue-500 border border-slate-900 flex items-center justify-center text-[6px] font-black'>J</div>
                        </div>
                        <div className='text-[8px] font-black text-green-400'>{lead.probability}%</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {stageLeads.length === 0 && (
                  <div className='h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl'>
                    <div className='text-[8px] font-black uppercase text-white/10 tracking-tighter italic'>Void Corridor</div>
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
