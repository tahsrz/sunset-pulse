export const JAMIE_DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const JAMIE_FALLBACK_GROQ_MODEL = 'openai/gpt-oss-20b';

const DEPRECATED_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]);

export function resolveJamieGroqModel(model?: string | null) {
  const candidate = model?.trim();
  return !candidate || DEPRECATED_GROQ_MODELS.has(candidate)
    ? JAMIE_DEFAULT_GROQ_MODEL
    : candidate;
}

export function getJamieGroqModelCandidates(model?: string | null) {
  return Array.from(new Set([
    resolveJamieGroqModel(model),
    JAMIE_DEFAULT_GROQ_MODEL,
    JAMIE_FALLBACK_GROQ_MODEL,
  ]));
}

export function shouldRetryJamieModel(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: unknown; code?: unknown };
  return candidate.status === 404 || candidate.code === 'model_not_found';
}
