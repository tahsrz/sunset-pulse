import Link from 'next/link';
import { headers } from 'next/headers';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { CompareView } from './CompareView';

export const dynamic = 'force-dynamic';
export default async function ComparePage({ params, searchParams }: { params: Promise<{ vibeId: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const access = await getOperatorAccess(getRequestHostFromHeaders(await headers()));
  const { vibeId } = await params;
  const query = await searchParams;
  if (!access.allowed) return <main className="min-h-screen bg-slate-950 p-8 text-white"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3">{access.reason}</p></main>;
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl"><Link href={`/admin/vibes/${vibeId}/revisions`} className="text-sm font-semibold text-slate-500 hover:underline">← Revision history</Link><h1 className="mt-4 text-3xl font-black">Compare revisions</h1><CompareView vibeId={vibeId} from={query.from || ''} to={query.to || ''} /></div></main>;
}
