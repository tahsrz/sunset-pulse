import { supabase, supabaseAdmin } from '@/lib/supabase';
import type { MiniNewsResult } from './ollamaMini';
import type { PulseNewsArticle } from './rssFeed';

export type PulseNewsSignal = {
  articles: PulseNewsArticle[];
  provider: string;
  mini?: {
    status?: MiniNewsResult['status'];
    model?: string;
    availableModels?: string[];
  };
  gatheredAt: string;
  source: 'local-ollama' | 'remote-cache';
};

const isArticle = (value: any): value is PulseNewsArticle => {
  return (
    value &&
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    typeof value.source === 'string' &&
    typeof value.url === 'string' &&
    (value.category === 'local' || value.category === 'market' || value.category === 'ops')
  );
};

export const normalizeNewsSignal = (input: any): PulseNewsSignal | null => {
  const articles = Array.isArray(input?.articles)
    ? input.articles.filter(isArticle).slice(0, 12)
    : Array.isArray(input?.news_articles)
      ? input.news_articles
          .map((article: any) => ({
            title: article?.title,
            summary: article?.summary || article?.content,
            source: article?.source || article?.visualizer_config?.source || 'Local Signal',
            url: article?.url || article?.visualizer_config?.url || '/insights',
            publishedAt: article?.publishedAt,
            category: article?.category === 'market' || article?.category === 'ops' ? article.category : 'local',
          }))
          .filter(isArticle)
          .slice(0, 12)
      : [];

  if (!articles.length) return null;

  return {
    articles,
    provider: input?.provider || 'local-ollama-signal',
    mini: input?.mini,
    gatheredAt: input?.gatheredAt || input?.timestamp || new Date().toISOString(),
    source: input?.source === 'remote-cache' ? 'remote-cache' : 'local-ollama',
  };
};

export const insertNewsSignal = async (signal: PulseNewsSignal) => {
  const client = supabaseAdmin || supabase;
  const topHeadline = signal.articles[0]?.title || 'Local news signal';

  const { data, error } = await client
    .from('daily_briefings')
    .insert({
      timestamp: signal.gatheredAt,
      simulated_research_hours: 0,
      daily_joke: '',
      news_articles: signal.articles.map((article) => ({
        ...article,
        content: article.summary,
        visualizer_config: {
          type: article.category,
          source: article.source,
          url: article.url,
          provider: signal.provider,
        },
      })),
      consolidated_truth: `Local Ollama news signal synced ${signal.articles.length} items. Lead: ${topHeadline}`,
      ozriel_audit: {
        ai_patterns_detected: [],
        humanized_rewrites: [],
        overall_tone_score: 0,
        source: signal.source,
        provider: signal.provider,
        mini: signal.mini,
      },
    })
    .select('id, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getLatestNewsSignal = async (): Promise<PulseNewsSignal | null> => {
  const { data, error } = await supabase
    .from('daily_briefings')
    .select('timestamp, news_articles, ozriel_audit')
    .not('news_articles', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn('[PULSE_NEWS_SIGNAL_READ_FALLBACK]', error);
    return null;
  }

  return normalizeNewsSignal({
    news_articles: data.news_articles,
    provider: data.ozriel_audit?.provider || 'local-ollama-signal',
    mini: data.ozriel_audit?.mini,
    gatheredAt: data.timestamp,
    source: 'remote-cache',
  });
};
