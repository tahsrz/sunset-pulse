export interface JamieBriefingArticle {
  title: string;
  summary: string;
  content?: string;
  category?: string;
  spider_net_data?: {
    nodes?: any[];
    links?: any[];
  };
  visualizer_config?: {
    type?: string;
  };
}

export interface JamieRewrite {
  original_fragment: string;
  suggested_rewrite: string;
  rationale: string;
}

export interface JamieAudit {
  ai_patterns_detected?: string[];
  humanized_rewrites: JamieRewrite[];
  overall_tone_score?: number;
}

export interface JamieBriefing {
  id?: string;
  timestamp: string;
  simulated_research_hours: number;
  daily_joke: string;
  consolidated_truth: string;
  news_articles: JamieBriefingArticle[];
  ozriel_audit: JamieAudit;
  executive_summary: string;
  key_signal_count: number;
  top_headline: string;
}

export function normalizeJamieBriefing(input: any): JamieBriefing | null {
  if (!input || input.error) return null;

  const newsArticles: JamieBriefingArticle[] = Array.isArray(input.news_articles)
    ? input.news_articles.map((article: any) => ({
        title: article?.title || 'Untitled signal',
        summary: article?.summary || article?.content || 'No summary available.',
        content: article?.content,
        category: article?.visualizer_config?.type || article?.category || 'Regional signal',
        spider_net_data: article?.spider_net_data,
        visualizer_config: article?.visualizer_config,
      }))
    : [];

  const audit: JamieAudit = {
    ai_patterns_detected: Array.isArray(input?.ozriel_audit?.ai_patterns_detected)
      ? input.ozriel_audit.ai_patterns_detected
      : [],
    humanized_rewrites: Array.isArray(input?.ozriel_audit?.humanized_rewrites)
      ? input.ozriel_audit.humanized_rewrites
      : [],
    overall_tone_score:
      typeof input?.ozriel_audit?.overall_tone_score === 'number'
        ? input.ozriel_audit.overall_tone_score
        : undefined,
  };

  const consolidatedTruth =
    input.consolidated_truth || 'No regional summary is available yet.';
  const topHeadline = newsArticles[0]?.title || 'No active headline';
  const keySignalCount = newsArticles.length;

  return {
    id: input.id,
    timestamp: input.timestamp || new Date().toISOString(),
    simulated_research_hours:
      typeof input.simulated_research_hours === 'number' ? input.simulated_research_hours : 0,
    daily_joke: input.daily_joke || '',
    consolidated_truth: consolidatedTruth,
    news_articles: newsArticles,
    ozriel_audit: audit,
    executive_summary: consolidatedTruth,
    key_signal_count: keySignalCount,
    top_headline: topHeadline,
  };
}
