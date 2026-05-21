import Link from 'next/link';
import { SlotShell } from '@/components/jamie-vibes/SlotShell';
import { getJamieFeedData } from '@/lib/jamie/agenticVibes';

export default async function JamieFeedSlot() {
  const feed = await getJamieFeedData();
  const briefing = feed.briefing;

  return (
    <SlotShell
      eyebrow="Slot: @feed"
      title="Memory Feed"
      action={<Link href="/api/jamie/briefing" className="rounded border border-white/15 px-3 py-2 text-xs font-bold text-cyan-100">API</Link>}
    >
      <div className="space-y-5">
        <div className="rounded border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase text-slate-400">
            <span>{briefing?.simulated_research_hours || 0} research hours</span>
            <span className="text-slate-600">/</span>
            <span>{formatDate(briefing?.timestamp)}</span>
          </div>
          <h3 className="mt-3 text-lg font-black text-white">
            {briefing?.consolidated_truth || 'No consolidated truth cached yet.'}
          </h3>
          {briefing?.news_articles?.[0] && (
            <p className="mt-3 text-sm leading-6 text-slate-300">
              <span className="font-bold text-cyan-100">{briefing.news_articles[0].title}:</span> {briefing.news_articles[0].summary}
            </p>
          )}
        </div>

        {briefing?.ozriel_audit?.humanized_rewrites?.length ? (
          <div>
            <p className="text-[10px] font-black uppercase text-pink-200">Ozriel Rewrite Queue</p>
            <div className="mt-3 grid gap-3">
              {briefing.ozriel_audit.humanized_rewrites.slice(0, 3).map((rewrite, index) => (
                <article key={`${rewrite.original_fragment}:${index}`} className="rounded border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs text-slate-500 line-through">{rewrite.original_fragment}</p>
                  <p className="mt-2 text-sm font-bold text-white">{rewrite.suggested_rewrite}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{rewrite.rationale}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-[10px] font-black uppercase text-emerald-200">Verified Memory</p>
          <div className="mt-3 grid gap-2">
            {feed.knowledgeFacts.length > 0 ? feed.knowledgeFacts.map((fact) => (
              <p key={fact} className="rounded border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-slate-300">
                {fact}
              </p>
            )) : (
              <p className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-400">No verified facts are cached yet.</p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500">Watcher last run: {formatDate(feed.watcherLastRun)}</p>
      </div>
    </SlotShell>
  );
}

function formatDate(value?: string | null) {
  if (!value) return 'not available';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}
