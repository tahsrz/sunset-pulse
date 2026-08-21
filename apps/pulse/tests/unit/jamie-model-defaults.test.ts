import { describe, expect, it } from 'vitest';
import {
  JAMIE_DEFAULT_GROQ_MODEL,
  resolveJamieGroqModel,
} from '@/lib/ai/modelDefaults';

describe('Jamie Groq model defaults', () => {
  it('uses the current production model when no model is configured', () => {
    expect(resolveJamieGroqModel()).toBe(JAMIE_DEFAULT_GROQ_MODEL);
  });

  it('maps retired stored model IDs to the current production model', () => {
    expect(resolveJamieGroqModel('llama-3.3-70b-versatile')).toBe(JAMIE_DEFAULT_GROQ_MODEL);
    expect(resolveJamieGroqModel('llama-3.1-8b-instant')).toBe(JAMIE_DEFAULT_GROQ_MODEL);
  });

  it('preserves explicitly configured supported model IDs', () => {
    expect(resolveJamieGroqModel('openai/gpt-oss-120b')).toBe('openai/gpt-oss-120b');
  });
});
