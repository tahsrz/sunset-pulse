import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildMemoriaPair } from '@/lib/core/memoria_builder';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';

describe('MemoriaBuilder', () => {
  it('builds split .hat/.tah pairs that the retriever can search', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoria-builder-'));
    const basePath = path.join(dir, 'north_texas_notes');
    const memoria = buildMemoriaPair([
      { text: 'Deep Ellum has a durable concentration of music venues and murals.' },
      { text: 'Bowie, Texas is connected to regional cattle trade and courthouse-square history.' }
    ]);

    fs.writeFileSync(`${basePath}.hat`, memoria.hat);
    fs.writeFileSync(`${basePath}.tah`, memoria.tah);

    const retriever = new MemoriaRetriever(`${basePath}.hat`);
    const deepEllum = retriever.search('Deep Ellum', 5);
    const bowie = retriever.search('Bowie courthouse', 5);

    expect(memoria.stats.shardCount).toBe(2);
    expect(deepEllum.some(result => result.data.includes('Deep Ellum'))).toBe(true);
    expect(bowie.some(result => result.data.includes('Bowie'))).toBe(true);
  });
});
