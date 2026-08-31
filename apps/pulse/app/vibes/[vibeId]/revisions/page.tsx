import Link from 'next/link';
import { headers } from 'next/headers';
import { getVibeCmsAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { RevisionList } from './RevisionList';

export const dynamic = 'force-dynamic';
export default async function RevisionsPage({ params }: { params: Promise<{ vibeId: string }> }) {
  const access = await getVibeCmsAccess(getRequestHostFromHeaders(await headers()));
  const { vibeId } = await params;
  if (!access.allowed) return <main className="min-h-screen bg-slate-950 p-8 text-white"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3">{access.reason}</p></main>;
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl"><Link href={`/vibes/${vibeId}/edit`} className="text-sm font-semibold text-slate-500 hover:underline">← Back to vibe</Link><h1 className="mt-4 text-3xl font-black">Revision history</h1><p className="mt-1 text-sm text-slate-600">Immutable checkpoints for <span className="font-mono">{vibeId}</span>.</p><div className="mt-6"><RevisionList vibeId={vibeId} /></div></div></main>;
}
