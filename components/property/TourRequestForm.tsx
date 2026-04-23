'use client';

import React, { useState } from 'react';
import { 
  FaCalendarCheck, 
  FaClock, 
  FaVideo, 
  FaLocationDot, 
  FaCircleCheck, 
  FaPaperPlane, 
  FaSatellite, 
  FaRobot 
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
    preferredTime: '',
    tourType: 'In-Person',
    userName: user?.user_metadata?.full_name || '',
    userEmail: user?.email || '',
    userPhone: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Authentication required for tactical briefing.');
    
    setLoading(true);
    try {
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          property: propertyId
        })
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success('Tour request synchronized with the grid.');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Synchronization failed.');
      }
    } catch (err) {
      toast.error('Neural grid connection failure.');
    } finally {
      setLoading(false);
    }
  };

  const tourTypes = [
    { id: 'In-Person', label: 'Tactical Recon', icon: <FaLocationDot /> },
    { id: 'Virtual', label: 'Remote Stream', icon: <FaVideo /> },
    { id: 'Drone-Stream', label: 'Orbital Drone', icon: <FaSatellite /> },
    { id: 'Jamie-Guided', label: 'AI Synthesis', icon: <FaRobot /> },
  ];

  if (submitted) {
    return (
      <div className="bg-blue-600/10 border border-blue-500/30 p-8 rounded-2xl text-center animate-in zoom-in-95 duration-500">
        <FaCircleCheck size={48} className="text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-black text-white uppercase tracking-widest italic">Deployment Requested</h3>
        <p className="text-slate-400 text-sm mt-2 font-medium">Realtor notification sent. Awaiting schedule confirmation.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl transition-all duration-500 hover:border-blue-500/20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 text-blue-400">
          <FaCalendarCheck size={20} />
          <h3 className="text-xl font-black uppercase tracking-[0.2em] italic border-l-4 border-blue-500 pl-4">Request Tour</h3>
        </div>
        <div className="text-[8px] font-black text-blue-500/50 uppercase tracking-[0.3em] font-mono">CODE: RECON_V4</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tour Type Selection */}
        <div className="grid grid-cols-2 gap-2">
          {tourTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFormData({ ...formData, tourType: type.id })}
              className={`flex items-center gap-2 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                formData.tourType === type.id 
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/20'
              }`}
            >
              <span className={formData.tourType === type.id ? 'text-white' : 'text-blue-500/50'}>
                {type.icon}
              </span>
              {type.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Preferred Date</label>
            <input 
              type="date" 
              required
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Arrival Window</label>
            <div className="relative">
              <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size={10}" />
              <input 
                type="text" 
                placeholder="e.g. 10:00 AM"
                required
                value={formData.preferredTime}
                onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 pl-10 text-xs text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <input 
            type="text" 
            placeholder="Agent Full Name"
            value={formData.userName}
            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none"
            required
          />
          <input 
            type="email" 
            placeholder="Secure Email Address"
            value={formData.userEmail}
            onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none"
            required
          />
        </div>

        <textarea 
          placeholder="Tactical Brief (Optional Message)"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none h-24 resize-none"
        />

        {!user && (
          <div className="text-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
             <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Authentication Required to Request Recon</p>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading || !user}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.3em] italic text-[10px] transition-all duration-500 flex items-center justify-center gap-3 ${
            loading || !user 
            ? 'bg-slate-800 text-slate-600' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/20 hover:-translate-y-1'
          }`}
        >
          {loading ? 'Transmitting...' : (
            <>
              <FaPaperPlane size={10} /> Execute Tour Request
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TourRequestForm;
