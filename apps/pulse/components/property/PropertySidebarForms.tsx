'use client';

import React, { useState } from 'react';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import TourRequestForm from './TourRequestForm';

interface PropertySidebarFormsProps {
  propertyId: string;
  propertyName: string;
}

const PropertySidebarForms: React.FC<PropertySidebarFormsProps> = ({ propertyId, propertyName }) => {
  const [formMode, setFormMode] = useState<'inquiry' | 'tour'>('inquiry');

  return (
    <div className="space-y-4">
      {/* Premium Form Mode Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
        <button
          onClick={() => setFormMode('inquiry')}
          className={`py-3 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${
            formMode === 'inquiry'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-400/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          Quick Inquiry
        </button>
        <button
          onClick={() => setFormMode('tour')}
          className={`py-3 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg transition-all ${
            formMode === 'tour'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-400/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          Schedule Showing
        </button>
      </div>

      <div className="transition-all duration-300">
        {formMode === 'inquiry' ? (
          <LeadCaptureForm propertyId={propertyId} propertyName={propertyName} />
        ) : (
          <TourRequestForm propertyId={propertyId} propertyName={propertyName} />
        )}
      </div>
    </div>
  );
};

export default PropertySidebarForms;
