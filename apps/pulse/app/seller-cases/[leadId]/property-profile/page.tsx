import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PropertyProfileEditor } from '@/components/realtor/PropertyProfileEditor';
import { isPropertyProfileEnabled } from '@/lib/realtor-workspace/propertyProfile.server';

export const metadata = { title: 'Build a Property Profile', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PropertyProfileEditorPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  if (!isPropertyProfileEnabled() || !z.string().guid().safeParse(leadId).success) notFound();
  return <PropertyProfileEditor key={leadId} leadId={leadId} />;
}
