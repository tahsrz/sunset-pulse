import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BookOpenText, Cable, Newspaper, RadioTower } from 'lucide-react';
import { buildNewsTahStory } from '@/lib/news/storyTah';
import type { PulseNewsArticle } from '@/lib/news/rssFeed';

type NewsTahPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const getParam = (params: Record<string, string | string[] | undefined>, key: string) => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

export default async function NewsTahPage({ searchParams }: NewsTahPageProps) {
  const params = searchParams ? await searchParams : {};
  const story = buildNewsTahStory({
    title: getParam(params, 'title'),
    summary: getParam(params, 'summary'),
    source: getParam(params, 'source'),
    url: getParam(params, 'url'),
    publishedAt: getParam(params, 'publishedAt'),
    category: getParam(params, 'category') as PulseNewsArticle['category'] | undefined,
  });

  return (
    <main className="min-h-screen bg-[#071013] text-slate-50">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.20),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(16,185,129,0.18),transparent_28%),linear-gradient(135deg,#071013_0%,#102a2f_52%,#27333f_100%)] px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Link href="/#news" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to hero news
          </Link>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr,340px] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded bg-cyan-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">
                <BookOpenText className="h-4 w-4" />
                News TAH / {story.eyebrow}
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{story.title}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200">{story.summary}</p>
            </div>

            <aside className="rounded border border-white/10 bg-white/[0.05] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Route Contract</p>
              <dl className="mt-4 space-y-3 text-sm">
                <Meta label="Source" value={story.source} />
                <Meta label="Category" value={story.eyebrow} />
                <Meta label="Published" value={story.publishedAt ? new Date(story.publishedAt).toLocaleString() : 'Feed timestamp unavailable'} />
              </dl>
              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href={`/api/tah?q=${encodeURIComponent(story.querySeed)}&limit=10`}
                  className="inline-flex items-center justify-center gap-2 rounded bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950"
                >
                  <Cable className="h-4 w-4" />
                  Query TAH
                </Link>
                <Link
                  href={story.originalUrl}
                  target={story.originalUrl.startsWith('http') ? '_blank' : undefined}
                  rel={story.originalUrl.startsWith('http') ? 'noreferrer' : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded border border-white/15 px-4 py-3 text-sm font-bold text-white hover:border-cyan-200/50"
                >
                  Original article
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          {story.beats.map((beat) => (
            <article key={beat.label} className="rounded border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">{beat.label}</p>
                <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                  <RadioTower className="h-3 w-3 text-emerald-200" />
                  {beat.signal}
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-black text-white">{beat.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{beat.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded border border-white/10 bg-black/20 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-pink-200">
              <Newspaper className="h-4 w-4" />
              Procedural note
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              This page summarizes feed metadata and creates a Sunset Pulse interpretation layer. It does not reproduce the publisher article.
            </p>
          </div>
          <p className="font-mono text-xs text-cyan-100 md:max-w-sm md:text-right">{story.querySeed}</p>
        </div>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="max-w-[190px] text-right font-semibold text-slate-100">{value}</dd>
    </div>
  );
}
