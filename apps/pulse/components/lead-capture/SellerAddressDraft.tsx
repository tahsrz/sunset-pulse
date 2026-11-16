'use client';

import React, { useEffect, useState } from 'react';
import { SELLER_ADDRESS_DRAFT_KEY } from '@/lib/marketing/sellerAddressDraft';

export default function SellerAddressDraft() {
  const [address, setAddress] = useState('');

  useEffect(() => {
    try {
      setAddress(sessionStorage.getItem(SELLER_ADDRESS_DRAFT_KEY) ?? '');
    } catch {
      // The draft is optional when session storage is disabled.
    }
  }, []);

  if (!address) return null;

  return (
    <div className="mb-6 rounded-xl border border-white/15 p-4">
      <p className="break-words text-sm font-bold text-white">{address}</p>
      <p className="mt-1 text-xs text-slate-400">For your reference in this browser tab.</p>
    </div>
  );
}
