import fs from 'fs';
import path from 'path';
import type { PulseNewsArticle } from './rssFeed';

type OllamaMiniModel = {
  name: string;
  manifestPath: string;
};

type OllamaGenerateResponse = {
  response?: string;
};

export type MiniNewsResult = {
  articles: PulseNewsArticle[];
  model?: string;
  status: 'enhanced' | 'skipped' | 'failed';
};

const DEFAULT_MANIFEST_DIR = 'C:\\Users\\Taz\\.ollama\\models\\manifests\\registry.ollama.ai\\library';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MINI_MODEL_PREFERENCE = ['phi4-mini', 'smollm2', 'gemma4'];

export const callOllama = async (prompt: string, options: { temperature?: number, num_predict?: number } = {}) => {
  const model = chooseMiniModel();
  if (!model) throw new Error("No Ollama mini model found.");

  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model.name,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.15,
        num_predict: options.num_predict ?? 900,
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Ollama call failed: ${response.status}`);
  }

  const data = (await response.json()) as OllamaGenerateResponse;
  return data.response || '';
};

const getManifestDir = () => process.env.OLLAMA_LIBRARY_MANIFESTS || DEFAULT_MANIFEST_DIR;

export const listOllamaMiniModels = (): OllamaMiniModel[] => {
  const manifestDir = getManifestDir();

  if (!fs.existsSync(manifestDir)) {
    return [];
  }

  return fs
    .readdirSync(manifestDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const modelDir = path.join(manifestDir, entry.name);
      return fs
        .readdirSync(modelDir, { withFileTypes: true })
        .filter((tag) => tag.isFile())
        .map((tag) => ({
          name: `${entry.name}:${tag.name}`,
          manifestPath: path.join(modelDir, tag.name),
        }));
    });
};

const chooseMiniModel = () => {
  const configured = process.env.NEWS_OLLAMA_MODEL;
  if (configured) {
    return { name: configured, manifestPath: 'env:NEWS_OLLAMA_MODEL' };
  }

  const models = listOllamaMiniModels();
  for (const preferred of MINI_MODEL_PREFERENCE) {
    const match = models.find((model) => model.name.startsWith(`${preferred}:`));
    if (match) return match;
  }

  return models[0];
};

const extractJson = (value: string) => {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || trimmed;
  const firstBracket = candidate.indexOf('[');
  const lastBracket = candidate.lastIndexOf(']');

  if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
    return '';
  }

  return candidate.slice(firstBracket, lastBracket + 1);
};

const normalizeCategory = (category: unknown, fallback: PulseNewsArticle['category']) => {
  return category === 'local' || category === 'market' || category === 'ops' ? category : fallback;
};

const cleanSummary = (summary: unknown, fallback: string) => {
  if (typeof summary !== 'string') return fallback;
  const normalized = summary.replace(/\s+/g, ' ').trim();
  return normalized.length > 24 ? normalized.slice(0, 260) : fallback;
};

export const enhancePulseNewsWithMini = async (articles: PulseNewsArticle[]): Promise<MiniNewsResult> => {
  if (process.env.NEWS_OLLAMA_ENABLED === 'false') {
    return { articles, status: 'skipped' };
  }

  const model = chooseMiniModel();
  if (!model) {
    return { articles, status: 'skipped' };
  }

  const articlePayload = articles.slice(0, 12).map((article, index) => ({
    index,
    title: article.title,
    summary: article.summary,
    source: article.source,
    category: article.category,
  }));

  const prompt = [
    'You are the Sunset Pulse local news desk.',
    'Rewrite each RSS item into a concise operational brief for a gas station, grill, local retail, and property-market command center.',
    'Preserve the facts from the input. Do not invent names, numbers, dates, or events.',
    'Return only a JSON array. Each item must have: index, summary, category.',
    'category must be one of local, market, ops.',
    'Keep every summary under 28 words.',
    JSON.stringify(articlePayload),
  ].join('\n');

  try {
    const responseText = await callOllama(prompt);
    const parsed = JSON.parse(extractJson(responseText)) as Array<{
      index?: number;
      summary?: string;
      category?: PulseNewsArticle['category'];
    }>;
    const patches = new Map(parsed.map((item) => [item.index, item]));

    const model = chooseMiniModel();
    return {
      articles: articles.map((article, index) => {
        const patch = patches.get(index);
        if (!patch) return article;

        return {
          ...article,
          summary: cleanSummary(patch.summary, article.summary),
          category: normalizeCategory(patch.category, article.category),
        };
      }),
      model: model?.name,
      status: 'enhanced',
    };
  } catch (error: any) {
    const model = chooseMiniModel();
    if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      console.warn(`[PULSE_NEWS_MINI] Ollama service offline (${OLLAMA_HOST}). Raw news fallback engaged.`);
    } else {
      console.warn('[PULSE_NEWS_MINI_FALLBACK]', error.message || error);
    }
    return { articles, model: model?.name, status: 'failed' };
  }
};
