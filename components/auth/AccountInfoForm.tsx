'use client';

import React from 'react';
import { FaUser, FaEnvelope, FaLock, FaFingerprint, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useIdentityFilter } from '@/hooks/useIdentityFilter';

interface AccountInfoFormProps {
  fullName: string;
  setFullName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  onContinue: () => void;
}

const AccountInfoForm: React.FC<AccountInfoFormProps> = ({
  fullName, setFullName, username, setUsername, email, setEmail,
  password, setPassword, confirmPassword, setConfirmPassword,
  onContinue
}) => {
  const { checkAvailability, verifyWithDB, isLoading: filterLoading } = useIdentityFilter();
  const [isDefinitivelyAvailable, setIsDefinitivelyAvailable] = React.useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);

  // Two-Stage Identity Purifier Logic
  React.useEffect(() => {
    if (!username) {
      setIsDefinitivelyAvailable(null);
      return;
    }

    const probabilisticAvailability = checkAvailability(username);

    if (probabilisticAvailability) {
      // Stage 1: Bloom Filter says it's definitely available
      setIsDefinitivelyAvailable(true);
    } else {
      // Stage 2: Bloom Filter says "Probably Taken" -> Trigger DB Verification
      const debouncer = setTimeout(async () => {
        setIsVerifying(true);
        const definitiveAvailability = await verifyWithDB(username);
        setIsDefinitivelyAvailable(definitiveAvailability);
        setIsVerifying(false);
      }, 500); // 500ms debounce for DB hits

      return () => clearTimeout(debouncer);
    }
  }, [username, checkAvailability, verifyWithDB]);

  const isAvailable = isDefinitivelyAvailable === true;

  return (
    <form className='space-y-4' onSubmit={(e) => { e.preventDefault(); onContinue(); }}>
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
        <FaFingerprint className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${username ? (isAvailable ? 'text-emerald-500' : 'text-red-500') : 'text-white/20'}`} size={12} />
        <input 
          type="text" 
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
          className={`w-full bg-black/40 border rounded-xl py-4 pl-12 pr-12 text-[10px] font-mono text-blue-400 focus:outline-none transition-all ${
            username ? (isAvailable ? 'border-emerald-500/30 focus:border-emerald-500' : 'border-red-500/30 focus:border-red-500') : 'border-white/5 focus:border-blue-500/50'
          }`}
          required
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {(filterLoading || isVerifying) && <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
          {!(filterLoading || isVerifying) && username && (
            isAvailable ? <FaCheckCircle className="text-emerald-500" size={10} /> : <FaExclamationTriangle className="text-red-500" size={10} />
          )}
        </div>
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
          autoComplete="new-password"
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
          autoComplete="new-password"
        />
      </div>

      <button 
        type="submit"
        disabled={!isAvailable}
        className='w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-20 disabled:cursor-not-allowed'
      >
        Continue
      </button>
    </form>
  );
};

export default AccountInfoForm;
