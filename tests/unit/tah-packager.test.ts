import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TAHBuilder } from '@/lib/core/tah_builder';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';
import { packPulseCatalog } from '@/lib/core/tah_packager';
import type { PulseCartridge } from '@/lib/ai/brain/pulse_query';

describe('TAH master packager', () => {
  it('packages multiple cartridges into one searchable Memoria pair', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tah-packager-'));
    const outputDir = path.join(dir, 'master');
    const dallasPath = path.join(dir, 'dallas_notes.tah');
    const bowiePath = path.join(dir, 'bowie_notes.tah');
    const builder = new TAHBuilder();

    fs.writeFileSync(dallasPath, builder.forge([
      { keywords: ['Deep Ellum'], data: 'Deep Ellum music corridors and mural districts.' }
    ]));
    fs.writeFileSync(bowiePath, builder.forge([
      { keywords: ['Bowie'], data: 'Bowie courthouse square and cattle trade history.' }
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
        name: 'bowie_notes.tah',
        path: bowiePath,
        slug: 'bowie-notes',
        title: 'Bowie Notes',
        type: 'tah'
      }
    ];

    const result = packPulseCatalog({
      cartridges,
      outputDir,
      baseName: 'atlas_pulse_master_test'
    });
    const retriever = new MemoriaRetriever(result.hatPath);
    const dallasResults = retriever.search('Deep Ellum', 5);
    const bowieResults = retriever.search('Bowie courthouse', 5);
    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf-8'));

    expect(result.sourceCount).toBe(2);
    expect(result.shardCount).toBe(2);
    expect(fs.existsSync(result.tahPath)).toBe(true);
    expect(dallasResults.some(result => result.data.includes('SOURCE: dallas_notes.tah'))).toBe(true);
    expect(bowieResults.some(result => result.data.includes('SOURCE: bowie_notes.tah'))).toBe(true);
    expect(manifest.sources.map((source: any) => source.slug)).toEqual(['dallas-notes', 'bowie-notes']);
  });
});
