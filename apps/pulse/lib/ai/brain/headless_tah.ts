import { PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';

type HeadlessPreview = {
  score?: number;
  text?: string;
  source?: string;
};

export function formatHeadlessCatalog(host: string, cartridges: PulseCartridge[]) {
  const metadata = cartridges.map(cartridge => getCartridgeMetadata(cartridge, host));

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
    ...metadata.flatMap((cartridge, index) => [
      `ENTRY ${index + 1}:`,
      `SLUG: ${cartridge.slug}`,
      `TITLE: ${cartridge.displayTitle}`,
      `CANONICAL_TITLE: ${cartridge.title}`,
      `TYPE: ${cartridge.type}`,
      `DOMAIN: ${cartridge.domain.label}`,
      `FORMAT: ${cartridge.format}`,
      `SHARDS: ${cartridge.shardCount}`,
      `BYTES: ${cartridge.byteSize}`,
      `SOURCE: ${cartridge.source}`,
      `QUERY_SEED: ${cartridge.searchQuery}`,
      `SUMMARY: ${cartridge.summary}`,
      `HTML: ${cartridge.routes.html}`,
      `HEADLESS: ${cartridge.routes.headless}`,
      `API: ${cartridge.routes.api}`,
      `META: ${cartridge.routes.meta}`,
      ''
    ])
  ].join('\n');
}

export function formatHeadlessCartridge(host: string, cartridge: PulseCartridge, previews: HeadlessPreview[]) {
  const metadata = getCartridgeMetadata(cartridge, host);

  return [
    'TAH_CARTRIDGE',
    'FORMAT: text/plain',
    'VERSION: 1',
    `GENERATED_AT: ${new Date().toISOString()}`,
    `SLUG: ${metadata.slug}`,
    `TITLE: ${metadata.displayTitle}`,
    `CANONICAL_TITLE: ${metadata.title}`,
    `TYPE: ${metadata.type}`,
    `DOMAIN: ${metadata.domain.label}`,
    `FORMAT: ${metadata.format}`,
    `SHARDS: ${metadata.shardCount}`,
    `BYTES: ${metadata.byteSize}`,
    `SOURCE: ${metadata.source}`,
    `QUERY_SEED: ${metadata.searchQuery}`,
    `SUMMARY: ${metadata.summary}`,
    `HTML: ${metadata.routes.html}`,
    `HEADLESS: ${metadata.routes.headless}`,
    `JSON_INDEX: ${host}/tah/index.json`,
    `QUERY_API: ${metadata.routes.api}`,
    `META_API: ${metadata.routes.meta}`,
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
