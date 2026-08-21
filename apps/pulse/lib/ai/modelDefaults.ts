export const JAMIE_DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

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
