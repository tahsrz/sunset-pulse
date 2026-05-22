'use client';

import React, { useState } from 'react';
import { FaCommentAlt, FaPaperPlane, FaTimes, FaSpinner } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';

const FeedbackWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'MEDIUM'
  });

  if (!user) return null; // Only logged in users can send feedback

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
          email: user.email,
        }),
      });

      if (res.ok) {
        toast.success('Feedback sent successfully.');
        setFormData({ subject: '', message: '', priority: 'MEDIUM' });
        setIsOpen(false);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Submission failed.');
      }
    } catch (err) {
      toast.error('Network error during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all hover:scale-110 group"
        >
          <FaCommentAlt className="text-xl group-hover:rotate-12 transition-transform" />
          <span className="absolute right-full mr-4 bg-slate-900 border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Send Feedback
          </span>
        </button>
      )}

      {/* Feedback Panel */}
      {isOpen && (
        <div className="w-80 md:w-96 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-blue-600 p-6 flex justify-between items-center">
            <div>
              <h3 className="text-white font-black uppercase tracking-tighter text-lg">System Feedback</h3>
              <p className="text-blue-200 text-[10px] font-mono uppercase tracking-widest">Direct to Developer</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Subject</label>
              <input
                required
                type="text"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-blue-500 outline-none transition-all"
                placeholder="Feature Request, Bug, Feedback..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Priority</label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-blue-500 outline-none transition-all"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Message</label>
              <textarea
                required
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="Details..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
              {isSubmitting ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>

          <div className="px-6 pb-6 text-center">
            <p className="text-[9px] text-slate-600 font-mono uppercase">User identity verified.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
