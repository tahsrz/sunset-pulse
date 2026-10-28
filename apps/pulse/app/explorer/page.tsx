import React, { Suspense } from 'react';
import { ExplorerContent } from '@/components/explorer/ExplorerContent';

export default function ExplorerPage() {
  return <Suspense fallback={<p role="status" className="p-8">Opening Explorer…</p>}><ExplorerContent /></Suspense>;
}
