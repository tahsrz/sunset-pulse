import type { KnowledgeContext } from '@/lib/ai/knowledgeRetrieval';

export type JamieModelTier = 'cheap' | 'strong';
export type JamieModelRoute = Readonly<{ tier: JamieModelTier; reason: 'grounded_tah' | 'weak_tah' | 'complex_task' }>;

const COMPLEX_TASK_PATTERN = /\b(compare|analy[sz]e|research|explain|plan|calculate|forecast|write|draft|design|debug|why|how should|tradeoff|pros and cons)\b/i;

export function chooseJamieModelRoute(userQuery: string, knowledge: Pick<KnowledgeContext, 'evidence'>): JamieModelRoute {
  if (COMPLEX_TASK_PATTERN.test(userQuery)) return { tier: 'strong', reason: 'complex_task' };
  const scores = knowledge.evidence.map((item) => item.score).filter((score) => Number.isFinite(score));
  const topScore = Math.max(0, ...scores);
  const averageScore = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : 0;
  if (knowledge.evidence.length >= 2 && (topScore >= 0.72 || averageScore >= 0.62)) {
    return { tier: 'cheap', reason: 'grounded_tah' };
  }
  return { tier: 'strong', reason: 'weak_tah' };
}
