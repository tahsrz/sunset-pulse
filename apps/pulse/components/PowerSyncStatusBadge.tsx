'use client';

import { useSunsetPowerSync } from '@/lib/powersync/PowerSyncProvider';

export default function PowerSyncStatusBadge() {
  const { enabled, health } = useSunsetPowerSync();
  if (!enabled) return null;

  const healthy = health.state === 'synced';
  const label = health.pendingUploads > 0
    ? `${health.pendingUploads} change${health.pendingUploads === 1 ? '' : 's'} queued`
    : health.state;

  return (
    <div
      role='status'
      aria-live='polite'
      title={health.lastSyncedAt ? `Last synced ${health.lastSyncedAt}` : 'Waiting for first sync'}
      className='absolute bottom-4 left-4 z-20 rounded-full border border-white/10 bg-slate-950/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-200 shadow-xl backdrop-blur'
      data-powersync-state={health.state}
    >
      <span className={`mr-2 inline-block h-2 w-2 rounded-full ${healthy ? 'bg-emerald-400' : health.state === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
      Local sync: {label}
    </div>
  );
}
