'use client';

import React from 'react';
import { FaUser, FaBolt, FaIdCard } from 'react-icons/fa';

interface AccountTypeFormProps {
  role: string;
  setRole: (role: string) => void;
  licenseId: string;
  setLicenseId: (val: string) => void;
  rightToRepresent: boolean;
  setRightToRepresent: (val: boolean) => void;
  loading: boolean;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AccountTypeForm: React.FC<AccountTypeFormProps> = ({
  role, setRole, licenseId, setLicenseId,
  rightToRepresent, setRightToRepresent,
  loading, onBack, onSubmit
}) => {
  return (
    <form className='space-y-6' onSubmit={onSubmit}>
      <div className='space-y-3'>
        <label className='text-[8px] font-bold text-white/40 uppercase tracking-widest'>Select Account Type</label>
        <div className='grid grid-cols-2 gap-4'>
          <button 
            type="button"
            onClick={() => setRole('consumer')}
            className={`py-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${role === 'consumer' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-black/40 border-white/5 text-white/20 hover:border-white/20'}`}
          >
            <FaUser size={16} />
            <span className='text-[8px] font-bold uppercase tracking-widest'>Client</span>
          </button>
          <button 
            type="button"
            onClick={() => setRole('realtor')}
            className={`py-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${role === 'realtor' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/5 text-white/20 hover:border-white/20'}`}
          >
            <FaBolt size={16} />
            <span className='text-[8px] font-bold uppercase tracking-widest'>Partner</span>
          </button>
        </div>
      </div>

      {role === 'realtor' && (
        <div className='space-y-4 animate-in fade-in slide-in-from-top-4 duration-500'>
          <div className='p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl'>
            <p className='text-[9px] font-mono text-purple-300 leading-relaxed uppercase tracking-wider italic'>
              <span className='font-bold'>Verification</span>: Professional access requires manual validation of your License ID.
            </p>
          </div>
          <div className='relative'>
            <FaIdCard className='absolute left-4 top-1/2 -translate-y-1/2 text-purple-400/20' size={12} />
            <input 
              type="text" 
              placeholder="License Number"
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
              className='w-full bg-black/40 border border-purple-500/20 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-purple-400 focus:outline-none focus:border-purple-500/50 transition-all uppercase'
              required={role === 'realtor'}
            />
          </div>
        </div>
      )}

      <div className='space-y-4'>
        <div 
          onClick={() => setRightToRepresent(!rightToRepresent)}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${rightToRepresent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/40 border-white/5 hover:border-white/10'}`}
        >
          <div className={`mt-1 h-4 w-4 rounded border flex items-center justify-center transition-all ${rightToRepresent ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
            {rightToRepresent && <div className='h-2 w-2 bg-white rounded-full animate-pulse' />}
          </div>
          <div className='flex-1'>
            <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${rightToRepresent ? 'text-emerald-400' : 'text-white/60'}`}>Right to Represent</h4>
            <p className='text-[8px] text-white/40 leading-relaxed uppercase tracking-wider'>
              I acknowledge that I have the right to represent my interests or am not currently under an exclusive representation agreement that would conflict with this registration.
            </p>
          </div>
        </div>
      </div>

      <div className='flex gap-4'>
        <button 
          type="button"
          onClick={onBack}
          className='flex-1 py-4 bg-white/5 text-white/40 rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-white/10 transition-all'
        >
          Back
        </button>
        <button 
          type="submit"
          disabled={loading}
          className='flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50'
        >
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};

export default AccountTypeForm;
