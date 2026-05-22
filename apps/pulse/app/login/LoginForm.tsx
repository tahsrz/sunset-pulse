'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaBolt, FaEnvelope, FaGoogle, FaLock } from 'react-icons/fa';
import {
  OptimisticActionForm,
  OptimisticMutationState,
  OptimisticServerAction,
  OptimisticSubmitButton
} from '@/components/forms/OptimisticActionForm';

type LoginFormProps = {
  next: string;
  emailAction: OptimisticServerAction;
  googleAction: (formData: FormData) => Promise<void>;
};

export function LoginForm({ next, emailAction, googleAction }: LoginFormProps) {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 text-blue-500 mb-4">
            <FaBolt size={24} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">Account Access</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white">Sign In</h1>
          <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Secure access to Sunset Pulse</p>
        </div>

        <form action={googleAction}>
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="relative w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all mb-6 shadow-xl shadow-white/5"
          >
            <span className="absolute left-5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
              <FaGoogle size={14} />
            </span>
            <span className="block text-center">Continue with Google</span>
          </button>
        </form>

        <div className="relative flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Server Action Login</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <OptimisticActionForm
          action={emailAction}
          className="space-y-4"
          pendingMessage="Verifying secure session..."
          onOptimisticSubmit={(formData) => ({
            message: `Verifying ${String(formData.get('email') || 'account')}...`
          })}
        >
          {(state) => (
            <>
              <input type="hidden" name="next" value={next} />
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all"
                  required
                />
              </div>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={12} />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[10px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all"
                  required
                />
              </div>

              <MutationStatus state={state} />

              <OptimisticSubmitButton
                idleLabel="Sign In"
                pendingLabel="Signing In..."
                optimisticState={state}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              />
            </>
          )}
        </OptimisticActionForm>

        <div className="mt-8 text-center space-y-4">
          <p className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-loose">
            Secure account access.<br />
            Sign-in attempts are handled by Server Actions.
          </p>
          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">
            New User?{' '}
            <Link href={`/register${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-blue-500 hover:text-blue-400 transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function MutationStatus({ state }: { state: OptimisticMutationState }) {
  if (!state.message) return null;

  const tone = state.status === 'error'
    ? 'border-red-300/30 bg-red-500/10 text-red-100'
    : state.status === 'pending'
      ? 'border-blue-300/30 bg-blue-500/10 text-blue-100'
      : 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100';

  return (
    <p className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tone}`}>
      {state.message}
    </p>
  );
}
