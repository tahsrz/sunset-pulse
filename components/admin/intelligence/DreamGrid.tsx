import React from 'react';
import { FaBolt } from 'react-icons/fa';

interface DreamGridProps {
  dreams: any[];
}

const DreamGrid: React.FC<DreamGridProps> = ({ dreams }) => {
  return (
    <div className='space-y-4'>
      {dreams.map((dream, idx) => (
        <div key={idx} className='bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all group'>
          <div className='flex items-center gap-2 mb-2'>
            <div className='p-1.5 bg-amber-500/20 rounded-lg text-amber-400'>
              <FaBolt size={10} />
            </div>
            <h4 className='text-[10px] font-black uppercase tracking-widest text-amber-400'>{dream.properties?.category || 'Insight'}</h4>
          </div>
          <h3 className='text-sm font-bold text-white mb-1'>{dream.properties?.title}</h3>
          <p className='text-[10px] text-slate-400 leading-relaxed line-clamp-2'>{dream.properties?.description}</p>
          <div className='mt-3 flex justify-between items-center'>
            <div className='text-[8px] font-black text-slate-500 uppercase'>Intelligence: {dream.properties?.intelligence_score}%</div>
            <div className='text-[8px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase'>JAMIE_SPATIAL_MEM</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DreamGrid;
