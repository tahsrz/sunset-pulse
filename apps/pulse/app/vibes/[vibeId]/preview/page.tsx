import Link from 'next/link';
import { headers } from 'next/headers';
import type { CSSProperties } from 'react';
import type { VibeDraft } from '@/lib/cms/vibeSchema';

const radii = { none: '0', sm: '0.375rem', md: '0.75rem', lg: '1rem', full: '9999px' } as const;
const shadows = { flat: 'none', subtle: '0 10px 24px rgb(15 23 42 / 0.16)', medium: '0 18px 40px rgb(15 23 42 / 0.24)', high: '0 28px 56px rgb(15 23 42 / 0.32)' } as const;

export default async function VibePreviewPage({ params }: { params: Promise<{ vibeId: string }> }) {
  const { vibeId } = await params;
  const requestHeaders = await headers();
  const origin = requestHeaders.get('x-forwarded-proto') && requestHeaders.get('host') ? `${requestHeaders.get('x-forwarded-proto')}://${requestHeaders.get('host')}` : '';
  const response = await fetch(`${origin}/api/vibes/${encodeURIComponent(vibeId)}/preview`, { cache: 'no-store', headers: { cookie: requestHeaders.get('cookie') || '' } });
  const data = response.ok ? await response.json() : null;
  if (!data) return <main className="min-h-screen bg-slate-100 p-8 text-slate-500">Unable to load preview.</main>;

  const vars = data.preview.cssVars || {};
  const theme = (data.preview.snapshot as VibeDraft).tokens.visual.theme;
  const background = vars['--color-background'] || '#0f172a';
  const surface = vars['--color-surface'] || '#1e293b';
  const text = vars['--color-text-primary'] || '#f8fafc';
  const accent = vars['--color-primary'] || '#2563eb';
  const { typography, layout } = theme;
  const primaryTone = data.preview.voiceConfig?.voice?.primaryTone || 'warm';
  const sectionStyle: CSSProperties = { background: surface, borderRadius: radii[layout.borderRadius], boxShadow: shadows[layout.elevation], padding: `${layout.spacingBasePx * 8}px`, fontFamily: typography.fontFamilyBody, fontSize: typography.baseFontSize, fontWeight: typography.fontWeightNormal };

  return <main className="min-h-screen px-4 py-8 sm:px-8" style={{ background, color: text }}><div className="mx-auto max-w-5xl"><Link href={`/vibes/${vibeId}/edit`} className="text-sm font-semibold opacity-70 hover:underline">← Back to editor</Link><h1 className="mt-4 text-3xl font-black">{data.vibe.title} preview</h1><p className="mt-1 text-sm opacity-70">Draft preview · not published</p><section className="mt-8" style={sectionStyle}><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide opacity-70">Jamie voice: {primaryTone}</p><p className="text-xs opacity-60">Draft-only review</p></div><h2 className="mt-6" style={{ fontFamily: typography.fontFamilyHeading, fontSize: `${typography.scaleRatio * 2.25}rem`, fontWeight: typography.fontWeightBold }}>A clear next step for every visitor.</h2><p className="mt-4 max-w-xl opacity-80">This representative layout renders the saved draft colors, typography, layout, and Jamie voice. It remains a draft-only preview until a published revision is explicitly applied to a site.</p><button type="button" aria-label="Ask Jamie about this draft preview" className="mt-8 px-4 py-2 text-sm" style={{ background: accent, borderRadius: radii[layout.borderRadius], color: text, fontFamily: typography.fontFamilyBody, fontWeight: typography.fontWeightBold }}>Ask Jamie</button></section></div></main>;
}
