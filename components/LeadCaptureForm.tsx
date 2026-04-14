'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LeadSchema } from '@/lib/core/validation';
import { toast } from 'react-toastify';
import { FaUser, FaEnvelope, FaPhone, FaPaperPlane, FaSync, FaDollarSign, FaCalendarAlt, FaStar } from 'react-icons/fa';
import { z } from 'zod';
import LeadCaptureSuccess from './lead-capture/LeadCaptureSuccess';
import LeadIntelligenceBar from './lead-capture/LeadIntelligenceBar';

// Derive the form data type from the ZOD schema
type LeadFormData = z.infer<typeof LeadSchema>;

interface LeadCaptureFormProps {
  propertyId: string;
  propertyName: string;
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({ propertyId, propertyName }) => {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      property: propertyId,
      idxViewed: true,
      probability: 50,
      status: 'new',
      budget: 0,
      timeframe: 'unknown',
      tourRequested: false,
    },
  });

  const watchAll = watch();
  
  const calculateLiveProbability = (): number => {
    let score = 30;
    if (watchAll.name && watchAll.name.length > 2) score += 10;
    if (watchAll.email && watchAll.email.includes('@')) score += 10;
    if (watchAll.phone && watchAll.phone.length > 5) score += 15;
    if (watchAll.budget && watchAll.budget > 0) score += 5;
    if (watchAll.timeframe && watchAll.timeframe !== 'unknown') score += 10;
    if (watchAll.tourRequested) score += 20;
    return Math.min(score, 99);
  };

  const liveProb = calculateLiveProbability();

  const onSubmit = async (data: LeadFormData) => {
    // Convert budget to number
    data.budget = Number(data.budget);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 201) {
        toast.success('Inquiry received! We will contact you shortly.');
        setIsSubmitted(true);
        reset();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to send inquiry');
      }
    } catch (error) {
      console.error('Inquiry submission error:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (isSubmitted) {
    return <LeadCaptureSuccess propertyName={propertyName} />;
  }

  return (
    <div className='group relative bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] overflow-hidden'>
      <div className='absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700' />
      
      <h3 className='relative text-xl font-bold text-white mb-8 uppercase tracking-wider border-l-4 border-blue-500 pl-4'>
        Request Information
        <span className='absolute -bottom-2 left-4 w-12 h-0.5 bg-blue-500/50' />
      </h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className='relative space-y-6'>
        <LeadIntelligenceBar probability={liveProb} />

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <label className='block text-[10px] font-bold text-blue-400/70 uppercase tracking-widest ml-1'>Full Name</label>
            <div className='relative group/input'>
              <FaUser className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
              <input
                {...register('name')}
                className={`w-full bg-slate-950/50 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-700`}
                placeholder='Full Name'
              />
            </div>
            {errors.name && <p className='text-red-500 text-[10px] font-bold mt-1 ml-1 animate-pulse'>{(errors.name as any).message}</p>}
          </div>

          <div className='space-y-2'>
            <label className='block text-[10px] font-bold text-blue-400/70 uppercase tracking-widest ml-1'>Email Address</label>
            <div className='relative group/input'>
              <FaEnvelope className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
              <input
                {...register('email')}
                className={`w-full bg-slate-950/50 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-700`}
                placeholder='Email'
              />
            </div>
            {errors.email && <p className='text-red-500 text-[10px] font-bold mt-1 ml-1 animate-pulse'>{(errors.email as any).message}</p>}
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='space-y-2'>
            <label className='block text-[10px] font-bold text-blue-400/70 uppercase tracking-widest ml-1'>Phone</label>
            <div className='relative group/input'>
              <FaPhone className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
              <input
                {...register('phone')}
                className='w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-700'
                placeholder='Phone'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='block text-[10px] font-bold text-blue-400/70 uppercase tracking-widest ml-1'>Max Budget ($)</label>
            <div className='relative group/input'>
              <FaDollarSign className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
              <input
                type='number'
                {...register('budget')}
                className='w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-700'
                placeholder='Budget'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <label className='block text-[10px] font-bold text-blue-400/70 uppercase tracking-widest ml-1'>Timeframe</label>
            <div className='relative group/input'>
              <FaCalendarAlt className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
              <select
                {...register('timeframe')}
                className='w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 appearance-none'
              >
                <option value='unknown'>Select Timeframe</option>
                <option value='immediate'>Immediate</option>
                <option value='1-3 months'>1-3 Months</option>
                <option value='3-6 months'>3-6 Months</option>
                <option value='6+ months'>6+ Months</option>
              </select>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl group/vip cursor-pointer transition-all hover:bg-blue-500/10'>
          <input
            type='checkbox'
            {...register('tourRequested')}
            className='w-5 h-5 rounded border-white/10 bg-slate-950/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all cursor-pointer'
          />
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <FaStar className='text-amber-400 text-xs animate-pulse' />
              <span className='text-[10px] font-black text-white uppercase tracking-widest'>Request Priority VIP Tour</span>
            </div>
            <p className='text-[8px] text-blue-400/60 uppercase font-bold mt-0.5'>Direct intelligence intercept with a lead agent (3x Velocity Boost)</p>
          </div>
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='group/btn relative w-full overflow-hidden bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all duration-300 active:scale-[0.98] uppercase tracking-widest text-xs shadow-[0_10px_20px_rgba(37,99,235,0.2)]'
        >
          <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] transition-transform' />
          <span className='flex items-center justify-center gap-3'>
            {isSubmitting ? (
              <FaSync className='animate-spin' />
            ) : (
              <>
                <FaPaperPlane className='group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform' /> 
                Send Inquiry
              </>
            )}
          </span>
        </button>
        
        <div className='pt-2'>
          <div className='flex items-center gap-2 justify-center opacity-40 group-hover:opacity-100 transition-opacity duration-500'>
            <div className='h-[1px] w-8 bg-blue-500' />
            <p className='text-[8px] font-bold text-blue-400 uppercase tracking-widest'>
              Secure Intelligence Intercept
            </p>
            <div className='h-[1px] w-8 bg-blue-500' />
          </div>
        </div>
      </form>
    </div>
  );
};

export default LeadCaptureForm;
