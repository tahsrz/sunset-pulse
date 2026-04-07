'use client';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { FaUser, FaEnvelope, FaLock, FaBolt, FaShieldAlt, FaIdCard, FaBuilding } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const RegisterContent = () => {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('consumer'); // 'consumer' or 'realtor'
  const [licenseId, setLicenseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Validation

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Access keys do not match.");
      return;
    }

    if (role === 'realtor' && !licenseId) {
      toast.error("Operative credentials (License ID) required for role elevation.");
      return;
    }

    setLoading(true);
    
    // Supabase SignUp with metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_name: fullName.split(' ')[0],
          role: role,
          license_id: licenseId,
          avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fullName || 'default'}`
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      if (data.session) {
        toast.success("Intelligence Link Established. Welcome to the grid.");
        window.location.href = role === 'realtor' ? '/command-post' : '/properties';
      } else {
        toast.info("Validation sequence initiated. Check your email for activation.");
        setStep(3); // Confirmation step
      }
    }
    setLoading(false);
  };

  return (
    <div className='w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden'>
      {/* Progress Bar */}
      <div className='absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-500' style={{ width: `${(step / 2) * 100}%` }} />

      <div className='text-center mb-10'>
        <div className='flex items-center justify-center gap-2 text-blue-500 mb-4'>
          <FaShieldAlt size={24} className='animate-pulse' />
          <span className='text-xs font-black uppercase tracking-[0.4em] text-white/40'>Account_Setup</span>
        </div>
        <h1 className='text-4xl font-black italic tracking-tighter text-white'>Create Account</h1>
        <p className='text-slate-500 text-xs mt-2 uppercase tracking-widest'>Join the Sunset Pulse network</p>
      </div>

      {step === 1 && (
        <form className='space-y-4' onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
          <div className='relative'>
            <FaUser className='absolute left-4 top-1/2 -translate-y-1/2 text-white/20' size={12} />
            <input 
              type="text" 
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className='w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all'
              required
            />
          </div>
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
              onChange={(e) => setPassword(e.target.value)}
              className='w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all'
              required
            />
          </div>
          <div className='relative'>
            <FaLock className='absolute left-4 top-1/2 -translate-y-1/2 text-white/20' size={12} />
            <input 
              type="password" 
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className='w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all'
              required
            />
          </div>

          <button 
            type="submit"
            className='w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20'
          >
            Continue
          </button>
        </form>
      )}

      {step === 2 && (
        <form className='space-y-6' onSubmit={handleSignup}>
          <div className='space-y-3'>
            <label className='text-[8px] font-black text-white/40 uppercase tracking-widest'>Select Account Type</label>
            <div className='grid grid-cols-2 gap-4'>
              <button 
                type="button"
                onClick={() => setRole('consumer')}
                className={`py-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${role === 'consumer' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black/40 border-white/5 text-white/20 hover:border-white/20'}`}
              >
                <FaUser size={16} />
                <span className='text-[8px] font-black uppercase tracking-widest'>Client</span>
              </button>
              <button 
                type="button"
                onClick={() => setRole('realtor')}
                className={`py-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${role === 'realtor' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/5 text-white/20 hover:border-white/20'}`}
              >
                <FaBolt size={16} />
                <span className='text-[8px] font-black uppercase tracking-widest'>Realtor</span>
              </button>
            </div>
          </div>

          {role === 'realtor' && (
            <div className='space-y-4 animate-in fade-in slide-in-from-top-4 duration-500'>
              <div className='p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl'>
                <p className='text-[9px] font-mono text-purple-300 leading-relaxed uppercase tracking-wider italic'>
                  <span className='font-black'>[ VERIFICATION ]</span> : Realtor access requires manual validation of your License ID.
                </p>
              </div>
              <div className='relative'>
                <FaIdCard className='absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/20' size={12} />
                <input 
                  type="text" 
                  placeholder="REALTOR LICENSE ID"
                  value={licenseId}
                  onChange={(e) => setLicenseId(e.target.value)}
                  className='w-full bg-black/40 border border-purple-500/20 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-purple-400 focus:outline-none focus:border-purple-500/50 transition-all uppercase'
                  required={role === 'realtor'}
                />
              </div>
            </div>
          )}

          <div className='flex gap-4'>
            <button 
              type="button"
              onClick={() => setStep(1)}
              className='flex-1 py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 transition-all'
            >
              Back
            </button>
            <button 
              type="submit"
              disabled={loading}
              className='flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50'
            >
              {loading ? 'Processing...' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className='text-center py-10 space-y-6 animate-in zoom-in duration-500'>
          <div className='w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto border border-blue-500/30'>
            <FaEnvelope className='text-blue-400 animate-bounce' size={32} />
          </div>
          <div>
            <h2 className='text-2xl font-black italic text-white'>Verification Sent</h2>
            <p className='text-slate-500 text-xs mt-2 uppercase tracking-widest leading-relaxed'>
              A link has been sent to <span className='text-blue-400'>{email}</span>.<br />
              Please verify your email to continue.
            </p>
          </div>
          <Link 
            href="/login"
            className='inline-block w-full py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 transition-all'
          >
            Back to Login
          </Link>
        </div>
      )}

      <div className='mt-8 text-center'>
        <p className='text-[8px] font-black text-white/20 uppercase tracking-widest leading-loose'>
          Authorized Personnel Only.<br />
          Already have an account? <Link href="/login" className='text-blue-500 hover:text-blue-400 transition-colors'>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center p-6'>
      <Suspense fallback={<div className="text-white font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Setup Grid...</div>}>
        <RegisterContent />
      </Suspense>
    </div>
  );
};

export default RegisterPage;
