'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LeadSchema } from '@/lib/validation';
import { toast } from 'react-toastify';
import { useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaPaperPlane, FaCheckCircle } from 'react-icons/fa';

const LeadCaptureForm = ({ propertyId, propertyName }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      property: propertyId,
      idxViewed: true,
      probability: 50,
      status: 'new',
    },
  });

  const onSubmit = async (data) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 201) {
        toast.success('Lead captured! Jamie is analyzing your request.');
        setIsSubmitted(true);
        reset();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to capture lead');
      }
    } catch (error) {
      console.error('Lead submission error:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (isSubmitted) {
    return (
      <div className='bg-blue-900/40 border border-blue-400/50 p-8 rounded-2xl text-center backdrop-blur-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-in fade-in zoom-in duration-700'>
        <div className='relative inline-block'>
          <FaCheckCircle className='text-blue-400 text-5xl mx-auto mb-4 animate-bounce' />
          <div className='absolute inset-0 bg-blue-400 blur-2xl opacity-20 animate-pulse' />
        </div>
        <h3 className='text-2xl font-black text-white mb-2 uppercase tracking-tighter italic'>Intelligence Logged</h3>
        <p className='text-blue-100/70 text-sm font-medium'>
          Your interest in <span className='text-blue-300 font-bold'>{propertyName}</span> has been transmitted to Jamie AI.
        </p>
        <div className='mt-6 h-1 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50' />
      </div>
    );
  }

  return (
    <div className='group relative bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] overflow-hidden'>
      {/* Kingdom Hearts-style background glow */}
      <div className='absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700' />
      
      <h3 className='relative text-xl font-black text-white mb-8 uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4'>
        Request Full Intel
        <span className='absolute -bottom-2 left-4 w-12 h-0.5 bg-blue-500/50' />
      </h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className='relative space-y-6'>
        <div className='space-y-2'>
          <label className='block text-[10px] font-black text-blue-400/70 uppercase tracking-widest ml-1'>Agent Name</label>
          <div className='relative group/input'>
            <FaUser className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
            <input
              {...register('name')}
              className={`w-full bg-slate-950/50 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-700`}
              placeholder='IDENTIFY YOURSELF'
            />
          </div>
          {errors.name && <p className='text-red-500 text-[10px] font-bold mt-1 ml-1 animate-pulse'>{errors.name.message}</p>}
        </div>

        <div className='space-y-2'>
          <label className='block text-[10px] font-black text-blue-400/70 uppercase tracking-widest ml-1'>Comm Channel</label>
          <div className='relative group/input'>
            <FaEnvelope className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
            <input
              {...register('email')}
              className={`w-full bg-slate-950/50 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-700`}
              placeholder='SECURE_EMAIL@GRID.COM'
            />
          </div>
          {errors.email && <p className='text-red-500 text-[10px] font-bold mt-1 ml-1 animate-pulse'>{errors.email.message}</p>}
        </div>

        <div className='space-y-2'>
          <label className='block text-[10px] font-black text-blue-400/70 uppercase tracking-widest ml-1'>Direct Line (Optional)</label>
          <div className='relative group/input'>
            <FaPhone className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-blue-400 transition-colors' />
            <input
              {...register('phone')}
              className='w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 placeholder:text-slate-700'
              placeholder='000-000-0000'
            />
          </div>
        </div>

        <button
          type='submit'
          disabled={isSubmitting}
          className='group/btn relative w-full overflow-hidden bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black py-4 rounded-xl transition-all duration-300 active:scale-[0.98] uppercase tracking-[0.2em] text-xs shadow-[0_10px_20px_rgba(37,99,235,0.2)]'
        >
          <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] transition-transform' />
          <span className='flex items-center justify-center gap-3'>
            {isSubmitting ? (
              <FaSync className='animate-spin' />
            ) : (
              <>
                <FaPaperPlane className='group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform' /> 
                Authorize Link
              </>
            )}
          </span>
        </button>
        
        <div className='pt-2'>
          <div className='flex items-center gap-2 justify-center opacity-40 group-hover:opacity-100 transition-opacity duration-500'>
            <div className='h-[1px] w-8 bg-blue-500' />
            <p className='text-[8px] font-black text-blue-400 uppercase tracking-[0.3em]'>
              Jamie AI Intel Layer Active
            </p>
            <div className='h-[1px] w-8 bg-blue-500' />
          </div>
        </div>
      </form>
    </div>
  );
};

export default LeadCaptureForm;
