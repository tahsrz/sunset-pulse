import { notFound } from 'next/navigation';
import { PropertyProfileView } from '@/components/realtor/PropertyProfileView';
import { readSharedPropertyProfile } from '@/lib/realtor-workspace/propertyProfile.server';

export const metadata = {
  title: 'Property Profile | Sunset Pulse',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export const dynamic = 'force-dynamic';

export default async function SharedPropertyProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const profile = await readSharedPropertyProfile((await params).token);
  if (!profile) notFound();
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-12 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-5 text-sm font-semibold text-stone-600">Sunset Pulse Property Profile</p>
        <PropertyProfileView profile={profile} />
      </div>
    </main>
  );
}
