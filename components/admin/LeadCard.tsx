'use client';

import React from 'react';
import { 
  FaUser, FaEnvelope, FaPhone, FaHome, 
  FaBolt, FaUndo, FaClock, FaTag, FaRv, FaBuilding,
  FaRocket, FaCrosshairs, FaCheckCircle, FaExclamationCircle
} from 'react-icons/fa';
import ProtocolTriggerGrid from './ProtocolTriggerGrid';

interface LeadCardProps {
  lead: any;
  onReengage: (id: string) => void;
  reengagingId: string | null;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onReengage, reengagingId }) => {
  return (
    <div className='bg-slate-900 border border-white/5 p-6 rounded-2xl transition-all hover:border-blue-500/30 group relative overflow-hidden'>
      <div className={`absolute top-0 right-0 w-1 h-full ${lead.status === 'New' ? 'bg-blue-500' : 'bg-slate-700'}`} />
      
      <div className='flex justify-between items-start mb-4'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20'>
            <FaUser size={16} />
          </div>
          <div>
            <h3 className='text-white font-bold tracking-tight'>{lead.name}</h3>
            <div className='text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1'>
              <FaClock size={8} /> {new Date(lead.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className='flex flex-col items-end gap-1'>
          <div className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
            lead.probability > 0.7 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
          }`}>
            {(lead.probability * 100).toFixed(0)}% Probability
          </div>
          <div className='text-[7px] text-slate-600 font-mono italic'>JAMIE_SCORING_V2</div>
        </div>
      </div>

      <div className='space-y-3 mb-6'>
        <div className='flex items-center gap-2 text-[11px] text-slate-300'>
          <FaEnvelope className='text-blue-500/50' /> {lead.email}
        </div>
        {lead.phone && (
          <div className='flex items-center gap-2 text-[11px] text-slate-300'>
            <FaPhone className='text-blue-500/50' /> {lead.phone}
          </div>
        )}
        <div className='flex items-center gap-2 text-[11px] text-blue-400 font-bold'>
          {lead.property?.type === 'RV' || lead.property?.type === 'RV Park' ? <FaRv /> : <FaBuilding />}
          {lead.property?.name || 'Property Removed'}
        </div>
      </div>

      <div className='pt-4 border-t border-white/5 space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='text-[9px] font-black uppercase text-slate-500 tracking-widest'>Engagement Protocols</div>
          <button 
            onClick={() => onReengage(lead._id)}
            disabled={reengagingId === lead._id}
            className='text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-tighter flex items-center gap-1 transition-all disabled:opacity-50'
          >
            <FaBolt className={reengagingId === lead._id ? 'animate-spin' : ''} />
            {reengagingId === lead._id ? 'Generating...' : 'Refresh Hooks'}
          </button>
        </div>
        
        <ProtocolTriggerGrid lead={lead} />
      </div>
    </div>
  );
};

export default LeadCard;
