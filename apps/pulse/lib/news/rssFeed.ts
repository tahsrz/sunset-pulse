export type PulseNewsArticle = {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt?: string;
  category: 'local' | 'market' | 'ops';
};

type NewsFeedConfig = {
  category: PulseNewsArticle['category'];
  query: string;
  sourceLabel: string;
};

const GOOGLE_NEWS_BASE_URL = 'https://news.google.com/rss/search';

const feedConfigs: NewsFeedConfig[] = [
  {
    category: 'local',
    query: 'convenience store gas station foodservice',
    sourceLabel: 'Local Pulse',
  },
  {
    category: 'market',
    query: 'gas prices fuel market retail',
    sourceLabel: 'Fuel Market',
  },
  {
    category: 'ops',
    query: 'convenience store operations retail inventory theft',
    sourceLabel: 'Store Ops',
  },
];

const fallbackArticles: PulseNewsArticle[] = [
  {
    title: 'Sunset Pulse expands store-to-web operations',
    summary: 'RubyCi setup, pickup verification, and online order release flows are moving into the command center.',
    source: 'Operations',
    url: '/insights',
    category: 'ops',
  },
  {
    title: 'Fuel and grocery trips keep converging',
    summary: 'Convenience retailers are leaning into prepared food, fast pickup, and practical local inventory signals.',
    source: 'Local Pulse',
    url: '/insights',
    category: 'local',
  },
  {
    title: 'Market watchers track fuel price movement',
    summary: 'Regional price changes and demand patterns remain useful context for store planning and customer timing.',
    source: 'Fuel Market',
    url: '/insights',
    category: 'market',
  },
];

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();

const stripHtml = (value: string) =>
  decodeXml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getTagValue = (item: string, tag: string) => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
};

const buildGoogleNewsUrl = (query: string) => {
  const params = new URLSearchParams({
    q: query,
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en',
  });

  return `${GOOGLE_NEWS_BASE_URL}?${params.toString()}`;
};

const normalizeGoogleNewsLink = (url: string) => {
  if (!url) return '/insights';

  try {
    const parsed = new URL(url);
    const directUrl = parsed.searchParams.get('url');
    return directUrl || url;
  } catch {
    return url;
  }
};

const parseFeedItems = (xml: string, config: NewsFeedConfig): PulseNewsArticle[] => {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return items.slice(0, 5).map((item) => {
    const rawTitle = getTagValue(item, 'title');
    const rawDescription = getTagValue(item, 'description');
    const source = getTagValue(item, 'source') || config.sourceLabel;
    const url = normalizeGoogleNewsLink(getTagValue(item, 'link'));
    const publishedAt = getTagValue(item, 'pubDate');
    const publishedDate = publishedAt ? new Date(publishedAt) : null;

    return {
      title: stripHtml(rawTitle),
      summary: stripHtml(rawDescription).replace(/\s+-\s+[^-]+$/, ''),
      source: stripHtml(source),
      url,
      publishedAt: publishedDate && !Number.isNaN(publishedDate.valueOf()) ? publishedDate.toISOString() : undefined,
      category: config.category,
    };
  });
};

export async function getPulseNews(): Promise<PulseNewsArticle[]> {
  const settledFeeds = await Promise.allSettled(
    feedConfigs.map(async (config) => {
      const response = await fetch(buildGoogleNewsUrl(config.query), {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'SunsetPulse/1.0',
        },
        next: { revalidate: 1800 },
      });

      if (!response.ok) {
        throw new Error(`News feed failed: ${response.status}`);
      }

      return parseFeedItems(await response.text(), config);
    }),
  );

  const articles = settledFeeds.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const uniqueByUrl = new Map<string, PulseNewsArticle>();

  for (const article of articles) {
    if (article.title && article.url && !uniqueByUrl.has(article.url)) {
      uniqueByUrl.set(article.url, article);
    }
  }

  return uniqueByUrl.size ? Array.from(uniqueByUrl.values()).slice(0, 12) : fallbackArticles;
}
