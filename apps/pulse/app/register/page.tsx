'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaShieldAlt } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import AccountInfoForm from '@/components/auth/AccountInfoForm';
import AccountTypeForm from '@/components/auth/AccountTypeForm';
import VerificationSuccess from '@/components/auth/VerificationSuccess';

const RegisterContent = () => {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('consumer');
  const [licenseId, setLicenseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    if (role === 'realtor' && !licenseId) {
      return toast.error("Professional license ID is required.");
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username || fullName.split(' ')[0],
            user_name: username || fullName.split(' ')[0],
            role: role,
            license_id: licenseId,
            isSubscribed: role === 'realtor',
            avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username || fullName || 'default')}`
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/success`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        if (data.session) {
          toast.success("Account created successfully. Welcome to Sunset Pulse.");
          window.location.href = role === 'realtor' ? '/dashboard' : '/properties';
        } else {
          setStep(3); // Show verification success step
        }
      }
    } catch (err: any) {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden'>
      {/* Progress Indicator */}
      <div className='absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-500' style={{ width: `${(step / 3) * 100}%` }} />

      <div className='text-center mb-10'>
        <div className='flex items-center justify-center gap-2 text-blue-500 mb-4'>
          <FaShieldAlt size={24} className='animate-pulse' />
          <span className='text-xs font-bold uppercase tracking-[0.4em] text-white/40'>Registration</span>
        </div>
        <h1 className='text-4xl font-black italic tracking-tighter text-white'>Create Account</h1>
        <p className='text-slate-500 text-xs mt-2 uppercase tracking-widest'>Join our professional network</p>
      </div>

      {step === 1 && (
        <AccountInfoForm 
          fullName={fullName} setFullName={setFullName}
          username={username} setUsername={setUsername}
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <AccountTypeForm 
          role={role} setRole={setRole}
          licenseId={licenseId} setLicenseId={setLicenseId}
          loading={loading}
          onBack={() => setStep(1)}
          onSubmit={handleSignup}
        />
      )}

      {step === 3 && (
        <VerificationSuccess email={email} />
      )}

      {step !== 3 && (
        <div className='mt-8 text-center border-t border-white/5 pt-6'>
          <p className='text-[8px] font-bold text-white/20 uppercase tracking-widest leading-loose'>
            Already have an account? <Link href="/login" className='text-blue-500 hover:text-blue-400 transition-colors'>Sign In</Link>
          </p>
        </div>
      )}
    </div>
  );
};

const RegisterPage = () => {
  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center p-6'>
      <Suspense fallback={<div className="text-white font-mono text-xs uppercase tracking-widest animate-pulse">Loading...</div>}>
        <RegisterContent />
      </Suspense>
    </div>
  );
};

export default RegisterPage;
