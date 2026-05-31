'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Building2, Newspaper, RadioTower, Store } from 'lucide-react';

type NewsArticle = {
  title: string;
  summary: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  category?: 'local' | 'market' | 'ops';
};

type NewsResponse = {
  articles?: NewsArticle[];
  provider?: string;
  timestamp?: string;
};

const fallbackArticles: NewsArticle[] = [
  {
    title: 'Sunset Pulse expands store-to-web operations',
    summary: 'RubyCi setup, pickup verification, and online order release flows are moving into the command center.',
    source: 'Operations',
  },
  {
    title: 'North Texas demand stays focused on useful acreage',
    summary: 'Buyer attention is clustering around properties with flexible land use, access, and clear local context.',
    source: 'Market',
  },
  {
    title: 'Sunset Gas & Grill becomes a physical portal',
    summary: 'The grill and register workflows are being unified with online pickup, paid verification, and staff release checks.',
    source: 'Local',
  },
];

const tabs = [
  { id: 'local', label: 'Local Pulse', icon: Store },
  { id: 'market', label: 'Market', icon: Building2 },
  { id: 'ops', label: 'Ops', icon: RadioTower },
] as const;

const getTabArticles = (articles: NewsArticle[], activeTab: string) => {
  const categoryMatches = articles.filter((article) => article.category === activeTab);
  if (categoryMatches.length) return categoryMatches;

  if (activeTab === 'market') {
    return articles.filter((article) => /market|property|texas|acreage|buyer|listing/i.test(`${article.title} ${article.summary}`));
  }

  if (activeTab === 'ops') {
    return articles.filter((article) => /ops|operation|register|pickup|rubyci|grill|store|bridge/i.test(`${article.title} ${article.summary}`));
  }

  return articles;
};

const buildNewsTahHref = (article: NewsArticle) => {
  const params = new URLSearchParams({
    title: article.title,
    summary: article.summary,
    source: article.source || 'News Feed',
    url: article.url || '/insights',
    category: article.category || 'local',
  });

  if (article.publishedAt) {
    params.set('publishedAt', article.publishedAt);
  }

  return `/news/tah?${params.toString()}`;
};

export default function HeroNewsTabs() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('local');
  const [articles, setArticles] = useState<NewsArticle[]>(fallbackArticles);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadBriefing = async () => {
      try {
        const res = await fetch('/api/news');
        if (!res.ok) return;

        const data = (await res.json()) as NewsResponse;
        if (!cancelled && Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles.slice(0, 9));
          setTimestamp(data.timestamp || null);
        }
      } catch {
        // Keep the static fallback; the hero should never fail because briefing cache is unavailable.
      }
    };

    loadBriefing();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleArticles = useMemo(() => {
    const filtered = getTabArticles(articles, activeTab);
    return (filtered.length ? filtered : articles).slice(0, 3);
  }, [activeTab, articles]);

  return (
    <section className="pointer-events-auto absolute inset-x-4 bottom-5 z-40 mx-auto max-w-5xl rounded-lg border border-white/12 bg-slate-950/58 p-3 text-white shadow-2xl shadow-black/30 backdrop-blur-2xl md:bottom-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="hidden items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100 md:flex">
            <Newspaper className="h-4 w-4" />
            News
          </span>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                  activeTab === tab.id
                    ? 'bg-cyan-300 text-slate-950'
                    : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <Link
          href="/insights"
          className="hidden items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-300 hover:border-cyan-200/40 hover:text-white md:flex"
        >
          Open Insights
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {visibleArticles.map((article, index) => (
          <article key={`${article.title}-${index}`} className="rounded-md border border-white/10 bg-white/[0.05] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/80">
                {article.source || (activeTab === 'ops' ? 'Operations' : activeTab)}
              </span>
              {index === 0 && (
                <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100">
                  Lead
                </span>
              )}
            </div>
            <Link href={buildNewsTahHref(article)} className="block hover:text-cyan-100">
              <h3 className="line-clamp-2 text-sm font-black leading-snug text-white">{article.title}</h3>
            </Link>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{article.summary}</p>
          </article>
        ))}
      </div>

      {timestamp && (
        <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
          News feed synced {new Date(timestamp).toLocaleString()}
        </p>
      )}
    </section>
  );
}
