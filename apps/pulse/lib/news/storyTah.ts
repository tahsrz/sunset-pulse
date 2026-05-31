import type { PulseNewsArticle } from '@/lib/news/rssFeed';

export type NewsTahBeat = {
  label: string;
  title: string;
  body: string;
  signal: string;
};

export type NewsTahStory = {
  title: string;
  eyebrow: string;
  summary: string;
  source: string;
  originalUrl: string;
  category: PulseNewsArticle['category'];
  publishedAt?: string;
  beats: NewsTahBeat[];
  querySeed: string;
};

const categoryLabels: Record<PulseNewsArticle['category'], string> = {
  local: 'Local Pulse',
  market: 'Market Signal',
  ops: 'Operations Dossier',
};

const categoryIntents: Record<PulseNewsArticle['category'], string> = {
  local: 'how this changes customer demand, store traffic, and neighborhood timing',
  market: 'what this hints about pricing, demand, inventory, and local economic pressure',
  ops: 'what this suggests for staffing, inventory, pickup flow, risk, and register operations',
};

export function buildNewsTahStory(article: Partial<PulseNewsArticle>): NewsTahStory {
  const category = normalizeCategory(article.category);
  const title = cleanText(article.title) || 'Untitled news signal';
  const summary = cleanText(article.summary) || 'No summary was provided by the feed.';
  const source = cleanText(article.source) || categoryLabels[category];
  const originalUrl = cleanText(article.url) || '/insights';
  const querySeed = [title, source, categoryLabels[category]].filter(Boolean).join(' | ');
  const publishedAt = cleanText(article.publishedAt);

  return {
    title,
    eyebrow: categoryLabels[category],
    summary,
    source,
    originalUrl,
    category,
    publishedAt: publishedAt || undefined,
    querySeed,
    beats: [
      {
        label: 'Beat 01',
        title: 'Signal Intake',
        body: `A live feed surfaced this headline from ${source}. Sunset Pulse treats it as a signal, not a verdict: a small piece of public context that can be routed into store, market, and customer decisions.`,
        signal: 'source detected',
      },
      {
        label: 'Beat 02',
        title: 'Human Reading',
        body: `The practical question is ${categoryIntents[category]}. The headline gives the system a starting point, then the operator decides whether it matters locally.`,
        signal: 'operator lens',
      },
      {
        label: 'Beat 03',
        title: 'Store Translation',
        body: `For Sunset Gas & Grill, this becomes a checklist: watch customer timing, keep shelf and grill availability visible, and connect public news to actual register, pickup, and inventory behavior.`,
        signal: 'action layer',
      },
      {
        label: 'Beat 04',
        title: 'TAH Memory Hook',
        body: `The query seed can be sent into the TAH archive so related market memory, neighborhood context, or operations notes can attach to the story without copying the original article.`,
        signal: 'memory route',
      },
    ],
  };
}

function normalizeCategory(category: unknown): PulseNewsArticle['category'] {
  if (category === 'market' || category === 'ops' || category === 'local') return category;
  return 'local';
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}
