import React from 'react';
import { toast } from 'react-toastify';

interface LeadGroupGridProps {
  groupedLeads: any;
}

const LeadGroupGrid: React.FC<LeadGroupGridProps> = ({ groupedLeads }) => {
  return (
    <div className="space-y-6">
      {Object.values(groupedLeads).map((group: any, idx) => (
        <div key={idx} className='group cursor-pointer'>
          <div className='flex justify-between items-end mb-2'>
            <h4 className='text-sm font-bold uppercase tracking-tight truncate max-w-[200px] text-white'>{group.name}</h4>
            <div className='flex items-center gap-3'>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info(`Generating analysis for ${group.name}...`);
                }}
                className='text-[8px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all'
              >
                GENERATE ANALYSIS
              </button>
              <span className='text-[10px] font-mono text-green-400'>${(group.monthlyRate * 0.1).toFixed(0)} PROJ. FEE</span>
            </div>
          </div>
          <div className='w-full bg-white/5 h-1 rounded-full overflow-hidden'>
            <div className='bg-blue-500 h-full w-2/3 opacity-50 group-hover:opacity-100 transition-all' />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LeadGroupGrid;
