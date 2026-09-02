import { TaxonomyDirectory } from './TaxonomyDirectory';
import { VibePageHeader } from '../_components/VibePageHeader';

export const dynamic = 'force-dynamic';

export default function VibeTaxonomyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <VibePageHeader title="Vibe taxonomy" description="Controlled terms for consistent discovery and filtering." backHref="/vibes" backLabel="All Vibes" />
        <div className="mt-6"><TaxonomyDirectory /></div>
      </div>
    </main>
  );
}
