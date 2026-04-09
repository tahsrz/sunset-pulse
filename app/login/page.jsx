'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { FaGoogle, FaEnvelope, FaLock, FaBolt } from 'react-icons/fa';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setLock] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) toast.error(error.message);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back to the grid.");
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
            <span className='text-xs font-black uppercase tracking-[0.4em] text-white/40'>Intelligence_Auth</span>
          </div>
          <h1 className='text-4xl font-black italic tracking-tighter text-white'>Sign In</h1>
          <p className='text-slate-500 text-xs mt-2 uppercase tracking-widest'>Secure access to Sunset Pulse</p>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className='w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-200 transition-all mb-6 shadow-xl shadow-white/5'
        >
          <FaGoogle size={14} /> Continue with Google
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
            Authorized Personnel Only.<br />
            Access attempts are logged for security purposes.
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
