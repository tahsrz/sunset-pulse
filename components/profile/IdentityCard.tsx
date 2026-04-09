'use client';

import React from 'react';
import Image from 'next/image';
import { User } from '@supabase/supabase-js';
import { FaShieldAlt, FaIdCard, FaUser, FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import profileDefault from '@/assets/images/profile.png';
import ComplexObservationsManager from '@/components/ComplexObservationsManager';

interface IdentityCardProps {
  user: User;
}

const IdentityCard: React.FC<IdentityCardProps> = ({ user }) => {
  const profileImage = user?.user_metadata?.avatar_url;
  const profileName = user?.user_metadata?.full_name || user?.user_metadata?.user_name || 'User';
  const profileEmail = user?.email;
  const role = user?.user_metadata?.role || 'consumer';
  const licenseId = user?.user_metadata?.license_id;

  return (
    <div className='bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden'>
      {/* Role Badge */}
      <div className='absolute top-6 right-6'>
        {role === 'realtor' ? (
          <div className='flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 rounded-xl'>
            <FaShieldAlt className='text-blue-400' size={14} />
            <span className='text-[10px] font-bold uppercase tracking-widest text-blue-400'>Verified Partner</span>
          </div>
        ) : (
          <div className='flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl'>
            <FaUser className='text-white/40' size={14} />
            <span className='text-[10px] font-bold uppercase tracking-widest text-white/40'>Client</span>
          </div>
        )}
      </div>

      <div className='mb-8 relative'>
        <div className='w-40 h-40 rounded-3xl overflow-hidden border-2 border-white/10 mx-auto lg:mx-0 group'>
          <Image
            className='object-cover transition-transform duration-500 group-hover:scale-110'
            src={profileImage || profileDefault}
            width={160}
            height={160}
            alt='Profile'
          />
        </div>
        <div className='absolute -bottom-4 -right-4 lg:right-auto lg:-left-4 bg-green-500 text-black p-3 rounded-2xl shadow-xl shadow-green-500/20'>
          <FaCheckCircle size={20} />
        </div>
      </div>

      <div className='space-y-6'>
        <div>
          <label className='text-[8px] font-bold text-white/20 uppercase tracking-[0.3em] block mb-1'>Full Name</label>
          <h1 className='text-3xl font-black tracking-tight truncate'>{profileName}</h1>
        </div>
        
        <div className='flex items-center gap-3 p-4 bg-black/40 rounded-2xl border border-white/5'>
          <FaEnvelope className='text-blue-500/40' />
          <div className='truncate'>
            <label className='text-[8px] font-bold text-white/20 uppercase tracking-[0.3em] block'>Email Address</label>
            <span className='text-xs font-mono text-blue-400'>{profileEmail}</span>
          </div>
        </div>

        {role === 'realtor' && (
          <div className='flex items-center gap-3 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20'>
            <FaIdCard className='text-purple-400' />
            <div>
              <label className='text-[8px] font-bold text-purple-400/40 uppercase tracking-[0.3em] block'>Professional License</label>
              <span className='text-xs font-mono text-purple-400'>{licenseId || 'Pending Verification'}</span>
            </div>
          </div>
        )}
      </div>

      <div className='mt-10'>
        <ComplexObservationsManager />
      </div>
    </div>
  );
};

export default IdentityCard;
