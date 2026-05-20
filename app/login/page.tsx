'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { FaGoogle, FaEnvelope, FaLock, FaBolt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { buildAuthCallbackUrl, getBrowserAuthOrigin, sanitizeAuthNext } from '@/lib/core/auth_redirect';

const LoginPage: React.FC = () => {
  const supabase = createClient();
  const [email, setEmail] = useState<string>('');
  const [password, setLock] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleGoogleLogin = async () => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const next = sanitizeAuthNext(params?.get('redirect') || params?.get('next') || '/auth/success');
    const origin = getBrowserAuthOrigin();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildAuthCallbackUrl(origin, next),
      },
    });
    if (error) toast.error(error.message);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back to Sunset Pulse.");
      window.location.href = '/';
    }
    setLoading(false);
  };

  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center p-6'>
      <div className='w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl'>
        <div className='text-center mb-10'>
          <div className='flex items-center justify-center gap-2 text-blue-500 mb-4'>
            <FaBolt size={24} className='animate-pulse' />
            <span className='text-xs font-black uppercase tracking-[0.4em] text-white/40'>Account Access</span>
          </div>
          <h1 className='text-4xl font-black italic tracking-tighter text-white'>Sign In</h1>
          <p className='text-slate-500 text-xs mt-2 uppercase tracking-widest'>Secure access to Sunset Pulse</p>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className='relative w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all mb-6 shadow-xl shadow-white/5'
        >
          <span className='absolute left-5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center'>
            <FaGoogle size={14} />
          </span>
          <span className='block text-center'>Continue with Google</span>
        </button>

        <div className='relative flex items-center gap-4 mb-6'>
          <div className='flex-1 h-px bg-white/5' />
          <span className='text-[8px] font-black text-white/20 uppercase tracking-widest'>Secure Login</span>
          <div className='flex-1 h-px bg-white/5' />
        </div>

        <form onSubmit={handleEmailLogin} className='space-y-4'>
          <div className='relative'>
            <FaEnvelope className='absolute left-4 top-1/2 -translate-y-1/2 text-white/20' size={12} />
            <input 
              type="email" 
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all'
              required
            />
          </div>
          <div className='relative'>
            <FaLock className='absolute left-4 top-1/2 -translate-y-1/2 text-white/20' size={12} />
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setLock(e.target.value)}
              className='w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all'
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className='w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50'
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className='mt-8 text-center space-y-4'>
          <p className='text-[8px] font-black text-white/20 uppercase tracking-widest leading-loose'>
            Secure account access.<br />
            Sign-in attempts may be logged for security purposes.
          </p>
          <p className='text-[8px] font-black text-white/40 uppercase tracking-widest'>
            New User? <Link href={`/register${email ? `?email=${encodeURIComponent(email)}` : ''}`} className='text-blue-500 hover:text-blue-400 transition-colors'>Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
