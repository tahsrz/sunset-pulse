import Link from 'next/link';
import { headers } from 'next/headers';
import { getVibeCmsAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';

export const dynamic = 'force-dynamic';

export default async function VibeSourcePage({ params }: { params: Promise<{ vibeId: string }> }) {
  const access = await getVibeCmsAccess(getRequestHostFromHeaders(await headers()));
  const { vibeId } = await params;
  if (!access.allowed) return <main className="min-h-screen bg-slate-950 p-8 text-white"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3">{access.reason}</p></main>;
  await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId: 'default' }).select('vibeId title name source sourceVideoPath migrationMetadata').lean() as any;
  if (!vibe) return <main className="min-h-screen bg-slate-100 p-8"><p className="text-red-700">Vibe not found.</p></main>;
  const source = vibe.source || { kind: vibe.sourceVideoPath ? 'extracted' : 'manual', path: vibe.sourceVideoPath || null };
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-3xl"><Link href={`/vibes/${vibeId}/edit`} className="text-sm font-semibold text-slate-500 hover:underline">← Back to editor</Link><h1 className="mt-4 text-3xl font-black">Source media</h1><p className="mt-1 text-sm text-slate-600">Provenance for {vibe.title || vibe.name || vibe.vibeId}.</p><section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><dl className="space-y-5 text-sm"><div><dt className="font-bold uppercase text-slate-400">Kind</dt><dd className="mt-1">{source.kind || 'manual'}</dd></div><div><dt className="font-bold uppercase text-slate-400">URL or path</dt><dd className="mt-1 break-all font-mono text-xs">{source.url || source.path || 'Not recorded'}</dd></div><div><dt className="font-bold uppercase text-slate-400">Attribution</dt><dd className="mt-1">{source.attribution || 'Not recorded'}</dd></div><div><dt className="font-bold uppercase text-slate-400">Ownership note</dt><dd className="mt-1">{source.ownershipNote || 'Not recorded'}</dd></div></dl></section></div></main>;
}
