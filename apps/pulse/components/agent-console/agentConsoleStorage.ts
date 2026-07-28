import {
  defaultPreferences,
  type AgentPreferences,
  type SavedExample,
} from './agentConsoleConfig';

export function normalizePreferences(preferences: AgentPreferences): AgentPreferences {
  return {
    agentName: preferences.agentName.trim(),
    market: preferences.market.trim() || defaultPreferences.market,
    tone: preferences.tone.trim() || defaultPreferences.tone,
    cta: preferences.cta.trim() || defaultPreferences.cta,
  };
}

export function formatAgentPreferences(preferences: AgentPreferences) {
  const normalized = normalizePreferences(preferences);
  return [
    `Agent name: ${normalized.agentName || 'Not provided'}`,
    `Market: ${normalized.market}`,
    `Tone: ${normalized.tone}`,
    `Preferred CTA: ${normalized.cta}`,
  ].join('\n');
}

export function restoreAgentPreferences(value: string | null): AgentPreferences | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AgentPreferences>;
    if (!parsed || typeof parsed !== 'object') return null;

    return normalizePreferences({
      agentName: typeof parsed.agentName === 'string' ? parsed.agentName : '',
      market: typeof parsed.market === 'string' ? parsed.market : defaultPreferences.market,
      tone: typeof parsed.tone === 'string' ? parsed.tone : defaultPreferences.tone,
      cta: typeof parsed.cta === 'string' ? parsed.cta : defaultPreferences.cta,
    });
  } catch {
    return null;
  }
}

export function restoreSavedExamples(value: string | null): SavedExample[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Partial<SavedExample>[];
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((example) => {
      if (
        typeof example?.id !== 'string'
        || typeof example.jobId !== 'string'
        || typeof example.title !== 'string'
        || typeof example.input !== 'string'
        || typeof example.output !== 'string'
        || typeof example.createdAt !== 'string'
      ) {
        return [];
      }

      return [{
        id: example.id,
        jobId: example.jobId,
        title: example.title,
        input: example.input,
        output: example.output,
        createdAt: example.createdAt,
      }];
    }).slice(0, 12);
  } catch {
    return [];
  }
}
