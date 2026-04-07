'use client';

import React from 'react';
import { toast } from 'react-toastify';

interface ProtocolTriggerGridProps {
  lead: any;
  onSendHook?: (lead: any, type: string) => void;
}

const ProtocolTriggerGrid: React.FC<ProtocolTriggerGridProps> = ({ lead, onSendHook }) => {
  const protocols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const sendHook = (type: string) => {
    if (onSendHook) {
      onSendHook(lead, type);
      return;
    }

    const hook = lead.reengagementHook?.[type.toLowerCase()];
    if (hook) {
      toast.success(`Protocol ${type} Engaged: ${hook}`);
      // In a real app, this would trigger an API call to send SMS/Email
    } else {
      toast.error(`Protocol ${type} Offline for this lead.`);
    }
  };

  return (
    <div className='flex flex-wrap gap-1 mt-2 max-w-[200px]'>
      {protocols.map(char => {
        const isActive = !!lead.reengagementHook?.[char.toLowerCase()];
        return (
          <button
            key={char}
            onClick={() => sendHook(char)}
            className={`w-6 h-6 flex items-center justify-center text-[8px] font-black rounded border transition-all ${
              isActive 
                ? 'bg-blue-600 border-blue-400 text-white hover:bg-blue-500 hover:scale-110 shadow-lg shadow-blue-900/20' 
                : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
            }`}
            title={isActive ? `Protocol ${char}: ${lead.reengagementHook[char.toLowerCase()]}` : `Protocol ${char} Offline`}
            disabled={!isActive}
          >
            {char}
          </button>
        );
      })}
    </div>
  );
};

export default ProtocolTriggerGrid;
