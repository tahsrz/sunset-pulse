import { headers } from 'next/headers';
import { getVibeCmsAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { RevisionList } from './RevisionList';
import { VibePageHeader } from '../../_components/VibePageHeader';

export const dynamic = 'force-dynamic';
export default async function RevisionsPage({ params }: { params: Promise<{ vibeId: string }> }) {
  const access = await getVibeCmsAccess(getRequestHostFromHeaders(await headers()));
  const { vibeId } = await params;
  if (!access.allowed) return <main className="min-h-screen bg-slate-950 p-8 text-white"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3">{access.reason}</p></main>;
  return <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl"><VibePageHeader title="Revision history" description={<>Immutable checkpoints for <span className="font-mono">{vibeId}</span>.</>} backHref={`/vibes/${vibeId}/edit`} backLabel="Back to Vibe" /><div className="mt-6"><RevisionList vibeId={vibeId} /></div></div></div>;
}
