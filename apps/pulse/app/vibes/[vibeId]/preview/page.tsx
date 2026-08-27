import Link from 'next/link';
import { headers } from 'next/headers';

export default async function VibePreviewPage({ params }: { params: Promise<{ vibeId: string }> }) {
  const { vibeId } = await params;
  const requestHeaders = await headers();
  const origin = requestHeaders.get('x-forwarded-proto') && requestHeaders.get('host') ? `${requestHeaders.get('x-forwarded-proto')}://${requestHeaders.get('host')}` : '';
  const response = await fetch(`${origin}/api/vibes/${encodeURIComponent(vibeId)}/preview`, { cache: 'no-store', headers: { cookie: requestHeaders.get('cookie') || '' } });
  const data = response.ok ? await response.json() : null;
  if (!data) return <main className="min-h-screen bg-slate-100 p-8 text-slate-500">Unable to load preview.</main>;
  const vars = data.preview.cssVars || {};
  const background = vars['--color-background'] || '#0f172a';
  const surface = vars['--color-surface'] || '#1e293b';
  const text = vars['--color-text-primary'] || '#f8fafc';
  const accent = vars['--color-primary'] || '#2563eb';
  return <main className="min-h-screen px-4 py-8 sm:px-8" style={{ background, color: text }}><div className="mx-auto max-w-5xl"><Link href={`/vibes/${vibeId}/edit`} className="text-sm font-semibold opacity-70 hover:underline">← Back to editor</Link><h1 className="mt-4 text-3xl font-black">{data.vibe.title} preview</h1><p className="mt-1 text-sm opacity-70">Draft preview · not published</p><section className="mt-8 rounded-2xl p-8 shadow-xl" style={{ background: surface }}><h2 className="text-4xl font-black">A clear next step for every visitor.</h2><p className="mt-4 max-w-xl text-base opacity-80">This representative layout uses the compiled draft tokens that a published site would receive.</p><button className="mt-8 rounded-lg px-4 py-2 text-sm font-bold" style={{ background: accent, color: text }}>Ask Jamie</button></section></div></main>;
}
