import React from 'react';
import { FaChartLine, FaInfoCircle } from 'react-icons/fa';

interface MarketIntelligenceProps {
  rentData: any;
}

const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ rentData }) => {
  if (!rentData) return null;

  return (
    <div className='bg-slate-900 border border-blue-500/20 p-8 rounded-2xl shadow-2xl mt-8 relative overflow-hidden group transition-all duration-500 hover:border-blue-500/40'>
      <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'>
        <FaChartLine size={80} className='text-blue-400' />
      </div>
      
      <h3 className='text-xl font-black text-white mb-8 uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4 flex items-center gap-3'>
        Market Intelligence <span className='text-[8px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded not-italic tracking-widest'>RENTCAST_API</span>
      </h3>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10'>
        <div className='bg-slate-950/80 border border-white/5 p-6 rounded-2xl'>
          <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2'>
            Est. Market Rent <FaInfoCircle className='text-[8px]' />
          </div>
          <div className='text-2xl font-black text-white italic'>
            ${rentData.rent?.toLocaleString()} <span className='text-[10px] text-slate-500 not-italic'>/mo</span>
          </div>
        </div>

        <div className='bg-slate-950/80 border border-white/5 p-6 rounded-2xl'>
          <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>Confidence Score</div>
          <div className='flex items-end gap-2'>
            <div className='text-2xl font-black text-green-400 italic'>{(rentData.confidenceScore * 100).toFixed(0)}%</div>
            <div className='h-2 w-full bg-slate-800 rounded-full mb-2 overflow-hidden'>
              <div 
                className='h-full bg-green-500 transition-all duration-1000' 
                style={{ width: `${rentData.confidenceScore * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className='bg-slate-950/80 border border-white/5 p-6 rounded-2xl'>
          <div className='text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2'>Rent Range</div>
          <div className='text-sm font-bold text-slate-400'>
            ${rentData.rentRangeLow?.toLocaleString()} — ${rentData.rentRangeHigh?.toLocaleString()}
          </div>
        </div>
      </div>

      <p className='text-[9px] text-slate-500 mt-6 uppercase tracking-widest italic'>
        * Intelligence data fetched in real-time. Jamie is using this to calculate potential ROI.
      </p>
    </div>
  );
};

export default MarketIntelligence;
