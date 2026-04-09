'use client';

import React from 'react';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';

interface AccountInfoFormProps {
  fullName: string;
  setFullName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  onContinue: () => void;
}

const AccountInfoForm: React.FC<AccountInfoFormProps> = ({
  fullName, setFullName, email, setEmail,
  password, setPassword, confirmPassword, setConfirmPassword,
  onContinue
}) => {
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
        className='w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20'
      >
        Continue
      </button>
    </form>
  );
};

export default AccountInfoForm;
