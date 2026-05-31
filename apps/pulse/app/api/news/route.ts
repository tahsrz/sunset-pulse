import { NextResponse } from 'next/server';
import { getPulseNews } from '@/lib/news/rssFeed';
import { enhancePulseNewsWithMini, listOllamaMiniModels } from '@/lib/news/ollamaMini';
import { getLatestNewsSignal } from '@/lib/news/signalStore';

export const revalidate = 1800;

export async function GET() {
  try {
    if (process.env.NEWS_REMOTE_SIGNALS_ENABLED !== 'false') {
      const signal = await getLatestNewsSignal();
      if (signal) {
        return NextResponse.json({
          articles: signal.articles,
          provider: signal.provider,
          mini: signal.mini,
          source: 'local-machine-signal',
          timestamp: signal.gatheredAt,
        });
      }
    }

    const rssArticles = await getPulseNews();
    const miniResult = await enhancePulseNewsWithMini(rssArticles);

    return NextResponse.json({
      articles: miniResult.articles,
      provider: miniResult.status === 'enhanced' ? 'google-news-rss+ollama-mini' : 'google-news-rss',
      mini: {
        status: miniResult.status,
        model: miniResult.model,
        availableModels: listOllamaMiniModels().map((model) => model.name),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PULSE_NEWS_FEED_ERROR]', error);

    return NextResponse.json(
      {
        articles: [],
        provider: 'google-news-rss',
        timestamp: new Date().toISOString(),
        error: 'Unable to load news feed.',
      },
      { status: 500 },
    );
  }
}
