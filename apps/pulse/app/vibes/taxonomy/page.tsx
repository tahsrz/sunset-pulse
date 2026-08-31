import Link from 'next/link';
import { TaxonomyDirectory } from './TaxonomyDirectory';

export const dynamic = 'force-dynamic';

export default function VibeTaxonomyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/vibes" className="text-sm font-semibold text-slate-500 hover:underline">← All Vibes</Link>
        <h1 className="mt-4 text-3xl font-black">Vibe taxonomy</h1>
        <p className="mt-1 text-sm text-slate-600">Controlled terms for consistent discovery and filtering.</p>
        <div className="mt-6"><TaxonomyDirectory /></div>
      </div>
    </main>
  );
}
