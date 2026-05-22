'use client';

import React from 'react';
import { 
  FaUser, FaEnvelope, FaPhone, FaHome, 
  FaBolt, FaUndo, FaClock, FaTag, FaBus, FaBuilding,
  FaRocket, FaCrosshairs, FaCheckCircle, FaExclamationCircle
} from 'react-icons/fa';
import EngagementTriggerGrid from './EngagementTriggerGrid';
import { Lead } from '@/lib/types';

interface LeadCardProps {
  lead: Lead;
  onRefreshLeads: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onRefreshLeads }) => {
  const property = lead.property as any; // Assuming populated for UI
  
  return (
    <div className='bg-slate-900 border border-white/5 p-6 rounded-2xl transition-all hover:border-blue-500/30 group relative overflow-hidden'>
      <div className={`absolute top-0 right-0 w-1 h-full ${lead.status === 'new' ? 'bg-blue-500' : 'bg-slate-700'}`} />
      
      <div className='flex justify-between items-start mb-4'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20'>
            <FaUser size={16} />
          </div>
          <div>
            <h3 className='text-white font-bold tracking-tight'>{lead.name}</h3>
            <div className='text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1'>
              <FaClock size={8} /> {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
        <div className='flex flex-col items-end gap-1'>
          <div className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
            lead.probability > 70 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
          }`}>
            {lead.probability}% Probability
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
          {property?.type === 'RV' || property?.type === 'RV Park' ? <FaBus /> : <FaBuilding />}
          {property?.name || 'Property Removed'}
        </div>
      </div>

      <div className='pt-4 border-t border-white/5'>
        <EngagementTriggerGrid lead={lead} onRefreshSuccess={onRefreshLeads} />
      </div>
    </div>
  );
};

export default LeadCard;
