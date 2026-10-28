import React from 'react';
import Link from 'next/link';
import PublicationReadiness from '@/components/marketing/PublicationReadiness';

export default function PublicationReadinessPage() {
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-4">
        <Link href="/admin/marketing" className="text-cyan-200 underline underline-offset-4">Marketing Content</Link>
        <h1 className="text-3xl uppercase sm:text-4xl">Content Readiness</h1>
        <p className="max-w-2xl text-slate-300">Check what needs review before publication. Required content and optional improvements are shown separately. This page does not edit or publish content.</p>
      </header>
      <PublicationReadiness />
    </div>
  </main>;
}
