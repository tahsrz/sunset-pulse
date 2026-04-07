import React from 'react';

interface ReconGridProps {
  valuations: any[];
}

const ReconGrid: React.FC<ReconGridProps> = ({ valuations }) => {
  return (
    <div className='space-y-4'>
      {valuations.map((v) => (
        <div key={v._id} className='bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all'>
          <div className='flex justify-between items-start mb-2'>
            <div className='text-[10px] font-black uppercase text-blue-400 truncate max-w-[150px]'>{v.address}</div>
            <div className='text-xs font-black text-white'>${v.estimate?.toLocaleString()}</div>
          </div>
          <div className='flex gap-2 mb-3'>
            {v.features?.map((f: string, i: number) => (
              <span key={i} className='text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-white/40 border border-white/5'>{f}</span>
            ))}
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='bg-black/40 p-2 rounded-lg border border-white/5'>
              <div className='text-[8px] opacity-40 uppercase font-bold'>ML Confidence</div>
              <div className='text-[10px] font-mono text-green-400'>{(v.ml_adjustments?.confidence_score * 100).toFixed(0)}%</div>
            </div>
            <div className='bg-black/40 p-2 rounded-lg border border-white/5'>
              <div className='text-[8px] opacity-40 uppercase font-bold'>Trend Index</div>
              <div className='text-[10px] font-mono text-blue-400'>{v.ml_adjustments?.price_trend_index}x</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReconGrid;
