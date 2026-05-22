'use client';

import React, { useState } from 'react';
import { 
  FaCalendarCheck,
  FaClock,
  FaVideo,
  FaLocationDot,
  FaCircleCheck,
  FaPaperPlane,
  FaQuestion,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaHouseCircleCheck,
  FaDollarSign
} from 'react-icons/fa6';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';

interface TourRequestFormProps {
  propertyId: string;
  propertyName: string;
}

const TourRequestForm: React.FC<TourRequestFormProps> = ({ propertyId, propertyName }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    preferredDate: '',
    preferredTime: 'flexible',
    tourType: 'In-Person',
    userName: user?.user_metadata?.full_name || '',
    userEmail: user?.email || '',
    userPhone: '',
    message: '',
    timeframe: 'unknown',
    budget: '',
    preApproval: 'not yet',
    sellingFirst: 'no',
    marketingConsent: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Please sign in to request a tour.');
    
    setLoading(true);
    try {
      const tourMessage = [
        formData.message,
        `Buying timeframe: ${formData.timeframe}`,
        `Budget: ${formData.budget ? `$${Number(formData.budget).toLocaleString()}` : 'not provided'}`,
        `Pre-approval: ${formData.preApproval}`,
        `Needs to sell first: ${formData.sellingFirst}`
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
          tourType: formData.tourType,
          userName: formData.userName,
          userEmail: formData.userEmail,
          userPhone: formData.userPhone,
          message: tourMessage,
          property: propertyId
        })
      });

      if (res.ok) {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.userName,
            email: formData.userEmail,
            phone: formData.userPhone,
            property: propertyId,
            budget: Number(formData.budget || 0),
            timeframe: formData.timeframe,
            source: 'property-tour-request',
            idxViewed: true,
            probability: 75,
            status: 'new',
            tourRequested: true,
            marketingConsent: formData.marketingConsent,
            crossPlatformConsent: false,
            jamieNotes: tourMessage
          })
        }).catch((leadError) => {
          console.error('[TOUR_LEAD_SYNC_ERROR]:', leadError);
        });

        setSubmitted(true);
        toast.success('Tour request sent. We will confirm the time shortly.');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Could not send the request.');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tourTypes = [
    { id: 'In-Person', label: 'Tour in person', icon: <FaLocationDot /> },
    { id: 'Virtual', label: 'Video walkthrough', icon: <FaVideo /> },
    { id: 'Jamie-Guided', label: 'Ask a question first', icon: <FaQuestion /> },
  ];

  if (submitted) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-400/30 p-8 rounded-xl text-center animate-in zoom-in-95 duration-500">
        <FaCircleCheck size={44} className="text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-black text-white tracking-tight">Request sent</h3>
        <p className="text-slate-300 text-sm mt-2 font-medium">
          We received your request for {propertyName}. A local agent will confirm the next step shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-xl shadow-2xl transition-all duration-300 hover:border-blue-400/30">
      <div className="mb-6">
        <div className="flex items-center gap-3 text-blue-300 mb-2">
          <FaCalendarCheck size={20} />
          <h3 className="text-xl font-black text-white tracking-tight">See this property</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Tell us how you want to see it and when you are looking. We will follow up with a real confirmation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-2">
          {tourTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFormData({ ...formData, tourType: type.id })}
              className={`flex items-center gap-3 p-3 rounded-lg text-sm font-bold border transition-all text-left ${
                formData.tourType === type.id 
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <span className={formData.tourType === type.id ? 'text-white' : 'text-blue-400'}>
                {type.icon}
              </span>
              {type.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Preferred day</label>
            <input 
              type="date" 
              required
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Best time</label>
            <div className="relative">
              <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={11} />
              <input 
                type="text" 
                placeholder="flexible"
                required
                value={formData.preferredTime}
                onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 pl-10 text-xs text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="relative">
            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
            <input 
              type="text" 
              placeholder="Your name"
              value={formData.userName}
              onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 pl-10 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
            <input 
              type="email" 
              placeholder="Email address"
              value={formData.userEmail}
              onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 pl-10 text-sm text-white focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div className="relative">
            <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
            <input 
              type="tel" 
              placeholder="Phone number"
              value={formData.userPhone}
              onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 pl-10 text-sm text-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="relative">
            <FaHouseCircleCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
            <select
              value={formData.timeframe}
              onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 pl-10 text-sm text-white focus:border-blue-500 outline-none appearance-none"
            >
              <option value="unknown">Buying timeframe</option>
              <option value="immediate">Ready now</option>
              <option value="1-3 months">1-3 months</option>
              <option value="3-6 months">3-6 months</option>
              <option value="6+ months">6+ months</option>
            </select>
          </div>

          <div className="relative">
            <FaDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
            <input
              type="number"
              min="0"
              placeholder="Budget, optional"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 pl-10 text-sm text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.preApproval}
              onChange={(e) => setFormData({ ...formData, preApproval: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
            >
              <option value="not yet">Not yet</option>
              <option value="pre-approved">Pre-approved</option>
              <option value="cash buyer">Cash buyer</option>
              <option value="need lender help">Need lender help</option>
            </select>

            <select
              value={formData.sellingFirst}
              onChange={(e) => setFormData({ ...formData, sellingFirst: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
            </select>
          </div>
        </div>

        <textarea 
          placeholder="Anything we should know before the showing?"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none h-24 resize-none"
        />

        <label className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.marketingConsent}
            onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-white/10 bg-slate-950 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-[10px] leading-relaxed text-slate-500">
            Send me property updates and market alerts. I can opt out at any time.
          </span>
        </label>

        {!user && (
          <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
             <p className="text-[11px] text-amber-300 font-bold">Please sign in to send a tour request.</p>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading || !user}
          className={`w-full py-4 rounded-lg font-black uppercase tracking-[0.2em] text-[11px] transition-all duration-300 flex items-center justify-center gap-3 ${
            loading || !user 
            ? 'bg-slate-800 text-slate-600' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/20'
          }`}
        >
          {loading ? 'Sending...' : (
            <>
              <FaPaperPlane size={10} /> Send request
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TourRequestForm;
