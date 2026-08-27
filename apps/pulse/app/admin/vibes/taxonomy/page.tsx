import Link from 'next/link';
import { headers } from 'next/headers';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { VIBE_TAXONOMIES } from '@/lib/cms/taxonomy';

export const dynamic = 'force-dynamic';

export default async function VibeTaxonomyPage() {
  const access = await getOperatorAccess(getRequestHostFromHeaders(await headers()));
  if (!access.allowed) return <main className="min-h-screen bg-slate-950 p-8 text-white"><h1 className="text-2xl font-black">Access denied</h1><p className="mt-3">{access.reason}</p></main>;
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/admin/vibes" className="text-sm font-semibold text-slate-500 hover:underline">← All vibes</Link><h1 className="mt-4 text-3xl font-black">Vibe taxonomy</h1><p className="mt-1 text-sm text-slate-600">Controlled terms for consistent discovery and filtering.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(VIBE_TAXONOMIES).map(([group, terms]) => <section key={group} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black uppercase tracking-wide text-slate-500">{group.replace(/([A-Z])/g, ' $1')}</h2><ul className="mt-4 space-y-2">{terms.map((term) => <li key={term} className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold">{term}</li>)}</ul></section>)}</div></div></main>;
}
