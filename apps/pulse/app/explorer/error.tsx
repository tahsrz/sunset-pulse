'use client';
import React from 'react';
import Link from 'next/link';

export default function ExplorerError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl space-y-6 p-8">
    <h1 className="text-3xl uppercase">Explorer Could Not Open</h1>
    <p>Try again, or browse the property list.</p>
    <button className="rounded-lg border px-4 py-2" onClick={reset}>Try Again</button>
    <p><Link className="underline" href="/properties">Browse Properties</Link></p>
  </main>;
}
