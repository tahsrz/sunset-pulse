import { Suspense } from 'react';
import { PageDirectory } from './PageDirectory';

export default function PagesPage() {
  return <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading pages…</p>}><PageDirectory /></Suspense>;
}
