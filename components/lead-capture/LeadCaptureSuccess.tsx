'use client';

import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

interface LeadCaptureSuccessProps {
  propertyName: string;
}

const LeadCaptureSuccess: React.FC<LeadCaptureSuccessProps> = ({ propertyName }) => {
  return (
    <div className='bg-blue-900/40 border border-blue-400/50 p-8 rounded-2xl text-center backdrop-blur-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-in fade-in zoom-in duration-700'>
      <div className='relative inline-block'>
        <FaCheckCircle className='text-blue-400 text-5xl mx-auto mb-4 animate-bounce' />
        <div className='absolute inset-0 bg-blue-400 blur-2xl opacity-20 animate-pulse' />
      </div>
      <h3 className='text-2xl font-bold text-white mb-2 uppercase tracking-tight'>Inquiry Received</h3>
      <p className='text-blue-100/70 text-sm font-medium'>
        Your interest in <span className='text-blue-300 font-bold'>{propertyName}</span> has been logged. Our team will follow up soon.
      </p>
      <div className='mt-6 h-1 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50' />
    </div>
  );
};

export default LeadCaptureSuccess;
