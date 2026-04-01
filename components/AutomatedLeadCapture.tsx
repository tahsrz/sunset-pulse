'use client';
import { useState } from 'react';
import { FaUser, FaEnvelope, FaPhone, FaBolt } from 'react-icons/fa';

const AutomatedLeadCapture = ({ propertyId, onCapture }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'I would like more information about this property. Tahsin Reza SunsetPulse.',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          property: propertyId,
          source: 'Automated Form',
          // Simulated behavioral data for the Pulse Scoring Engine
          views: 5,
          chatMinutes: 2,
          tourRequested: formData.message.toLowerCase().includes('tour') || formData.message.toLowerCase().includes('see')
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        onCapture?.();
      }
    } catch (error) {
      console.error('Lead Capture Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className='p-8 bg-blue-50 border border-blue-100 rounded-2xl text-center animate-in zoom-in duration-300'>
        <div className='w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30'>
          <FaBolt className='text-white text-2xl' />
        </div>
        <h3 className='text-xl font-black text-slate-900 uppercase tracking-tighter'>Intelligence Logged</h3>
        <p className='text-slate-600 mt-2 font-medium text-sm'>A Sunset Pulse operative will reach out shortly.</p>
      </div>
    );
  }

  return (
    <div className='bg-slate-900 p-8 rounded-3xl shadow-2xl border border-white/5 relative overflow-hidden group'>
      <div className='absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/20 transition-colors'></div>
      
      <h3 className='text-2xl font-black text-white uppercase tracking-tighter mb-2'>Fast-Track Inquiry</h3>
      <p className='text-slate-400 text-xs font-bold uppercase tracking-widest mb-8 flex items-center gap-2'>
        <span className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></span> Secure Channel Active
      </p>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='relative'>
          <FaUser className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm' />
          <input
            type='text'
            name='name'
            placeholder='Full Name'
            required
            className='w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none'
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div className='relative'>
          <FaEnvelope className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm' />
          <input
            type='email'
            name='email'
            placeholder='Intelligence Email'
            required
            className='w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none'
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className='relative'>
          <FaPhone className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm' />
          <input
            type='tel'
            name='phone'
            placeholder='Secure Phone (Optional)'
            className='w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none'
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <textarea
          name='message'
          placeholder='Operational Requirements...'
          rows={3}
          className='w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none'
          value={formData.message}
          onChange={handleChange}
        />

        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3'
        >
          {isSubmitting ? 'Transmitting...' : (
            <>
              Deploy Inquiry <FaBolt className='text-blue-200' />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AutomatedLeadCapture;
