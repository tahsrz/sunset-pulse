import React, { Suspense } from 'react';

export default function SearchResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Initializing Intelligence Grid...</div>}>
      {children}
    </Suspense>
  );
}
