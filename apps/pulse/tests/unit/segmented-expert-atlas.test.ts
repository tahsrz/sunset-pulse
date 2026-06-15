import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TAHBuilder } from '@/lib/core/tah_builder';
import {
  SegmentedExpertAtlasBuilder,
  SegmentedExpertAtlasRetriever,
  domainMaskForLabel,
  packSegmentedExpertAtlas
} from '@/lib/core/segmented_expert_atlas';
import type { PulseCartridge } from '@/lib/ai/brain/pulse_query';

describe('Segmented expert atlas', () => {
  it('routes through a 400-expert population by pruning metadata segments before reading payloads', () => {
    const architectureMask = domainMaskForLabel('architecture cache cpu');
    const medicalMask = domainMaskForLabel('medical clinical diagnosis');
    const dallasMask = domainMaskForLabel('dallas mls listing');
    const builder = new SegmentedExpertAtlasBuilder({ segmentSize: 16 });

    for (let index = 0; index < 400; index++) {
      const isTarget = index === 237;
      const domainMask = index % 3 === 0 ? architectureMask : index % 3 === 1 ? medicalMask : dallasMask;

      builder.addExpert({
        expertId: index + 1,
        title: isTarget ? 'Cache Coherence Expert' : `Expert ${index + 1}`,
        source: isTarget ? 'architecture.tah' : `synthetic-${index % 3}.tah`,
        domainMask: isTarget ? architectureMask : domainMask,
        regionId: isTarget ? 1 : index % 8,
        complexity: isTarget ? 0.62 : (index % 10) / 10,
        relevance: isTarget ? 0.99 : 0.25 + (index % 20) / 100,
        trust: isTarget ? 0.97 : 0.55,
        recency: isTarget ? 0.91 : 0.4,
        keywords: isTarget ? ['cache coherence', 'simd', 'memory ordering'] : [`noise-${index}`],
        text: isTarget
          ? 'Cache coherence expert shard: SIMD memory ordering and cache invalidation protocols for architecture routing.'
          : `Noise shard ${index}: unrelated clinical property or visual runtime notes.`
      });
    }

    const { hat, tah } = builder.forge();
    expect(hat.readUInt32LE(8)).toBe(400);
    const retriever = new SegmentedExpertAtlasRetriever(hat, tah);
    const response = retriever.search({
      text: 'cache coherence memory ordering',
      domainMask: architectureMask,
      targetComplexity: 0.6,
      minRelevance: 0.8,
      minTrust: 0.8,
      topN: 3,
      maxSegments: 8
    });

    expect(response.results[0].title).toBe('Cache Coherence Expert');
    expect(response.results[0].text).toContain('cache invalidation');
    expect(response.results[0].density).toBeGreaterThan(0);
    expect(response.results[0].vitality).toBeGreaterThan(0);
    expect(response.results[0].concepts).toContain('cache coherence');
    expect(response.results[0].conceptLinks.length).toBeGreaterThan(0);
    expect(response.diagnostics.totalSegments).toBe(25);
    expect(response.diagnostics.visitedSegments).toBeLessThan(response.diagnostics.totalSegments);
    expect(response.diagnostics.rejectedSegments).toBeGreaterThan(0);
    expect(response.diagnostics.payloadReads).toBeLessThanOrEqual(3);
  });

  it('packs existing .tah cartridge shards into a searchable segmented atlas', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'expert-atlas-'));
    const outputDir = path.join(dir, 'atlas');
    const dallasPath = path.join(dir, 'dallas_notes.tah');
    const archPath = path.join(dir, 'architecture_notes.tah');
    const tahBuilder = new TAHBuilder();

    fs.writeFileSync(dallasPath, tahBuilder.forge([
      { keywords: ['Deep Ellum'], data: 'Deep Ellum mural corridors and Dallas market listing context.' }
    ]));
    fs.writeFileSync(archPath, tahBuilder.forge([
      { keywords: ['SIMD'], data: 'SIMD cache hierarchy and processor pipeline details.' }
    ]));

    const cartridges: PulseCartridge[] = [
      {
        name: 'dallas_notes.tah',
        path: dallasPath,
        slug: 'dallas-notes',
        title: 'Dallas Notes',
        type: 'tah'
      },
      {
        name: 'architecture_notes.tah',
        path: archPath,
        slug: 'architecture-notes',
        title: 'Architecture Notes',
        type: 'tah'
      }
    ];

    const packed = packSegmentedExpertAtlas({
      cartridges,
      outputDir,
      baseName: 'expert_atlas_test',
      maxExperts: 400,
      segmentSize: 4
    });

    const retriever = new SegmentedExpertAtlasRetriever(packed.hatPath, packed.tahPath);
    const response = retriever.search({
      text: 'Deep Ellum Dallas listing',
      domainMask: domainMaskForLabel('dallas mls listing'),
      topN: 2
    });

    expect(packed.expertCount).toBe(2);
    expect(fs.existsSync(packed.hatPath)).toBe(true);
    expect(fs.existsSync(packed.tahPath)).toBe(true);
    expect(response.results[0].source).toBe('dallas_notes.tah');
    expect(response.results[0].text).toContain('Deep Ellum');
  });
});
