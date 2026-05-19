import { PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { getCartridgeApiUrl, getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';

type HeadlessPreview = {
  score?: number;
  text?: string;
  source?: string;
};

export function formatHeadlessCatalog(host: string, cartridges: PulseCartridge[]) {
  return [
    'TAH_ARCHIVE',
    'FORMAT: text/plain',
    'VERSION: 1',
    `GENERATED_AT: ${new Date().toISOString()}`,
    `CATALOG_COUNT: ${cartridges.length}`,
    `HTML_INDEX: ${host}/tah`,
    `JSON_INDEX: ${host}/tah/index.json`,
    `SEARCH_API: ${host}/api/tah`,
    '',
    'SCRAPER_INSTRUCTIONS:',
    '- Use this endpoint for plain backend-oriented catalog discovery.',
    '- Use /tah/index.json for structured machine reads.',
    '- Use /tah/{slug}/headless for cartridge-specific plain text.',
    '- Use /api/tah?q={query}&limit={n} for ranked retrieval snippets.',
    '',
    ...cartridges.flatMap((cartridge, index) => [
      `ENTRY ${index + 1}:`,
      `SLUG: ${cartridge.slug}`,
      `TITLE: ${cartridge.title}`,
      `TYPE: ${cartridge.type}`,
      `SOURCE: ${cartridge.name}`,
      `QUERY_SEED: ${getCartridgeSearchQuery(cartridge)}`,
      `HTML: ${host}/tah/${cartridge.slug}`,
      `HEADLESS: ${host}/tah/${cartridge.slug}/headless`,
      `API: ${getCartridgeApiUrl(host, cartridge)}`,
      ''
    ])
  ].join('\n');
}

export function formatHeadlessCartridge(host: string, cartridge: PulseCartridge, previews: HeadlessPreview[]) {
  return [
    'TAH_CARTRIDGE',
    'FORMAT: text/plain',
    'VERSION: 1',
    `GENERATED_AT: ${new Date().toISOString()}`,
    `SLUG: ${cartridge.slug}`,
    `TITLE: ${cartridge.title}`,
    `TYPE: ${cartridge.type}`,
    `SOURCE: ${cartridge.name}`,
    `QUERY_SEED: ${getCartridgeSearchQuery(cartridge)}`,
    `HTML: ${host}/tah/${cartridge.slug}`,
    `HEADLESS: ${host}/tah/${cartridge.slug}/headless`,
    `JSON_INDEX: ${host}/tah/index.json`,
    `QUERY_API: ${getCartridgeApiUrl(host, cartridge)}`,
    '',
    'PREVIEW_SHARDS:',
    previews.length > 0
      ? previews.map((preview, index) => [
          `[${index}]`,
          `SCORE: ${Number(preview.score || 0).toFixed(4)}`,
          `SOURCE: ${preview.source || cartridge.name}`,
          'TEXT:',
          preview.text || '',
          ''
        ].join('\n')).join('\n')
      : 'NONE',
    ''
  ].join('\n');
}

export function plainTextResponse(body: string) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
