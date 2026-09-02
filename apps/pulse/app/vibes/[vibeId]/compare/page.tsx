import { headers } from 'next/headers';
import { getVibeCmsAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { CompareView } from './CompareView';
import { VibePageHeader } from '../../_components/VibePageHeader';

export const dynamic = 'force-dynamic';
export default async function ComparePage({ params, searchParams }: { params: Promise<{ vibeId: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const access = await getVibeCmsAccess(getRequestHostFromHeaders(await headers()));
  const { vibeId } = await params;
  const query = await searchParams;
  if (!access.allowed) return <main className="min-h-screen bg-slate-950 p-8 text-white"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3">{access.reason}</p></main>;
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl"><VibePageHeader title="Compare revisions" description="Inspect the normalized field changes between two immutable checkpoints." backHref={`/vibes/${vibeId}/revisions`} backLabel="Revision history" /><CompareView vibeId={vibeId} from={query.from || ''} to={query.to || ''} /></div></main>;
}
