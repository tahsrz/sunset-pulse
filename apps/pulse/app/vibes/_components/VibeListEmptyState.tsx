'use client';

import Link from 'next/link';
import React from 'react';

export function VibeListEmptyState({ search, status, onClearSearch, onClearStatus }: { search: string; status: string; onClearSearch: () => void; onClearStatus: () => void }) {
  const filtered = Boolean(search.trim() || status);
  return <div className="border-t border-slate-100 p-8 text-sm text-slate-600">
    <p>{filtered ? 'No Vibes match the current search or filter.' : 'No Vibes have been created yet.'}</p>
    <div className="mt-3 flex flex-wrap gap-3">
      {search.trim() ? <button type="button" onClick={onClearSearch} className="font-semibold text-[#2271b1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2">Clear search</button> : null}
      {status ? <button type="button" onClick={onClearStatus} className="font-semibold text-[#2271b1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2">Clear filter</button> : null}
      {!filtered ? <Link href="/vibes/new" className="font-semibold text-[#2271b1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2">Add New Vibe</Link> : null}
    </div>
  </div>;
}
