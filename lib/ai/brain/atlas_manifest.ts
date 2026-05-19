import fs from 'fs';
import path from 'path';
import { buildAtlasProbe } from '@/lib/ai/brain/atlas_probe';

export type AtlasManifest = ReturnType<typeof buildAtlasManifest>;

const DEFAULT_MANIFEST_PATH = path.join(process.cwd(), 'public', 'atlas_manifest.json');

export function buildAtlasManifest(batchSize = 25) {
  let cursor: number | null = 0;
  const items: any[] = [];
  let lastBatch = buildAtlasProbe(0, batchSize);

  while (cursor !== null) {
    const batch = buildAtlasProbe(cursor, batchSize);
    items.push(...batch.items);
    lastBatch = batch;
    cursor = batch.nextCursor;
  }

  const formats = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.format] = (acc[item.format] || 0) + 1;
    return acc;
  }, {});

  return {
    name: 'Sunset Pulse TAH Atlas Manifest',
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'local-swarm-publish',
    total: lastBatch.total,
    mapped: items.length,
    percent: lastBatch.total === 0 ? 0 : Math.round((items.length / lastBatch.total) * 100),
    formats,
    items
  };
}

export function readAtlasManifest(filePath = DEFAULT_MANIFEST_PATH) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeAtlasManifest(filePath = DEFAULT_MANIFEST_PATH, batchSize = 25) {
  const manifest = buildAtlasManifest(batchSize);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}
