'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FaShieldAlt, FaCode, FaRocket, FaCheckCircle, FaStar, FaApplePay, FaGooglePay, FaPaypal, FaCreditCard } from 'react-icons/fa';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const PremiumPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to upgrade to Premium.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = await res.json();
      if (!res.ok || payload?.error) {
        const setupUrl = payload?.details?.site?.setupUrl;
        if (res.status === 409 && setupUrl) {
          toast.info('You already have a site. Opening your setup workspace.');
          window.location.href = setupUrl;
          return;
        }

        throw new Error(payload?.message || 'Failed to initiate checkout.');
      }

      const checkout = payload?.data || payload;
      const { sessionId, url } = checkout || {};
      
      if (url) {
        window.location.href = url;
        return;
      }

      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await (stripe as any).redirectToCheckout({ sessionId });
        if (error) toast.error(error.message);
      }
    } catch (err: any) {
      console.error('Checkout Error:', err);
      toast.error(err?.message || 'Failed to initiate checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest mb-8 animate-bounce">
          <FaStar /> Premium Access
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-6">
          Sunset <span className="text-blue-500">Premium</span>
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-16 leading-relaxed">
          Claim a personal sunsetpulse.app subdomain, customize the interface with Jamie,
          and run a branded local intelligence portal from your account.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-20 text-left">
          <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] hover:border-blue-500/50 transition-all group">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
              <FaCode size={24} />
            </div>
            <h3 className="text-xl font-black uppercase mb-4 tracking-tight">Personal Subdomain</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Reserve your own word at word.sunsetpulse.app and give clients a branded place to land.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] hover:border-orange-500/50 transition-all group">
            <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500 mb-6 group-hover:scale-110 transition-transform">
              <FaShieldAlt size={24} />
            </div>
            <h3 className="text-xl font-black uppercase mb-4 tracking-tight">Architecture Tools</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Access the Architecture dashboard and review the systems that power the product experience.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-white/10 p-8 rounded-[2rem] hover:border-green-500/50 transition-all group">
            <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform">
              <FaRocket size={24} />
            </div>
            <h3 className="text-xl font-black uppercase mb-4 tracking-tight">Priority Analysis</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Faster response times from Jamie and early access to experimental real-estate analysis tools.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-blue-600 to-blue-800 p-1 rounded-[3rem] shadow-2xl shadow-blue-500/20 max-w-md mx-auto relative">
          {/* Trial Badge */}
          <div className="absolute -top-6 -right-6 bg-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 rounded-2xl shadow-xl animate-pulse z-10 rotate-12 border-4 border-slate-950">
            90 Days Free
          </div>

          <div className="bg-slate-950 rounded-[2.8rem] p-10">
            <div className="mb-8">
              <span className="text-slate-400 text-sm font-black uppercase tracking-widest block mb-2">Monthly Subscription</span>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-black">$59.96</span>
                <span className="text-slate-500 font-bold mb-1">/mo</span>
              </div>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-4">
                Risk-Free: 90 Day Trial Included
              </p>
            </div>

            <ul className="space-y-4 mb-10 text-sm text-slate-300 text-left px-4">
              <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-500" /> Personal sunsetpulse.app Subdomain</li>
              <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-500" /> Unlimited Site Customizations</li>
              <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-500" /> Architecture Dashboard Access</li>
              <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-500" /> Premium Jamie Persona</li>
              <li className="flex items-center gap-3"><FaCheckCircle className="text-blue-500" /> Advanced Lead Analysis</li>
            </ul>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? 'Initializing...' : (
                <span className="flex items-center justify-center gap-2">
                  Claim Your Site <FaRocket className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </span>
              )}
            </button>
            
            <div className="mt-8 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
              <FaApplePay size={35} title="Apple Pay" />
              <FaGooglePay size={35} title="Google Pay" />
              <FaPaypal size={22} title="PayPal & Venmo" />
              <FaCreditCard size={20} title="Cards" />
            </div>

            <p className="mt-6 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center">
              Secure checkout via Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
