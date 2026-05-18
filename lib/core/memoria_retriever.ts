import fs from 'fs';
import path from 'path';
import { getTahIndices } from './tah_utils';

export interface MemoriaMatch {
  score: number;
  data: string;
}

const TAG_TEXT = 0;
const LOCAL_BLOOM_BITS = 448n;
const LOCAL_BLOOM_HASHES = 4;
const ENTRY_SIZE = 80;

/**
 * Reader for split Memoria cartridges where the .hat file holds the header,
 * global Bloom filter, and shard index while the paired .tah file holds text.
 */
export class MemoriaRetriever {
  private hatBuffer: Buffer;
  private tahBuffer: Buffer | null = null;
  private tahPath: string;
  private k = 0;
  private m = 0n;
  private shardCount = 0;
  private avgComplexity = 1;
  private bloomOffset = 64;
  private indexOffset = 64;
  private globalBloom: Buffer = Buffer.alloc(0);

  constructor(private hatPath: string) {
    if (!fs.existsSync(hatPath)) {
      throw new Error(`Header Atlas not found: ${hatPath}`);
    }

    this.hatBuffer = fs.readFileSync(hatPath);
    this.tahPath = this.resolveTahPath(hatPath);
    this.loadMetadata();
  }

  private resolveTahPath(hatPath: string): string {
    if (hatPath.endsWith('.tah.hat')) {
      return `${hatPath.slice(0, -8)}.tah.tah`;
    }

    return path.join(path.dirname(hatPath), `${path.basename(hatPath, '.hat')}.tah`);
  }

  private loadMetadata() {
    if (this.hatBuffer.length < 64) {
      throw new Error(`Invalid Memoria header: ${path.basename(this.hatPath)}`);
    }

    const magic = this.hatBuffer.readUInt32LE(0);
    if (magic !== 0x54414821 && magic !== 0x48415421) {
      throw new Error(`Invalid Memoria header magic: 0x${magic.toString(16)}`);
    }

    this.k = this.hatBuffer.readUInt8(6);
    this.m = this.hatBuffer.readBigUInt64LE(8);
    this.shardCount = this.hatBuffer.readUInt32LE(16);
    this.avgComplexity = this.hatBuffer.readUInt32LE(20) || 1;

    const bloomSize = Number((this.m + 7n) / 8n);
    this.indexOffset = this.bloomOffset + bloomSize;
    this.globalBloom = this.hatBuffer.slice(this.bloomOffset, this.indexOffset);
  }

  private containsKeyword(keyword: string): boolean {
    for (const idx of getTahIndices(keyword, this.m, this.k)) {
      const byteIdx = Number(idx / 8n);
      const bitIdx = Number(idx % 8n);

      if ((this.globalBloom[byteIdx] & (1 << bitIdx)) === 0) {
        return false;
      }
    }

    return true;
  }

  private loadTahBuffer(): Buffer {
    if (!this.tahBuffer) {
      if (!fs.existsSync(this.tahPath)) {
        throw new Error(`Tactical Data not found: ${this.tahPath}`);
      }
      this.tahBuffer = fs.readFileSync(this.tahPath);
    }

    return this.tahBuffer;
  }

  private entryOffset(index: number): number {
    return this.indexOffset + index * ENTRY_SIZE;
  }

  public search(query: string, topN = 3): MemoriaMatch[] {
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
    const terms = cleanQuery.split(/\s+/).map(t => t.trim()).filter(t => t.length > 2);
    const ngrams = [...terms];

    for (let i = 0; i < terms.length - 1; i++) {
      ngrams.push(`${terms[i]} ${terms[i + 1]}`);
    }

    const scores = new Map<number, number>();

    for (const term of ngrams) {
      if (!this.containsKeyword(term)) continue;

      const localIndices = getTahIndices(term, LOCAL_BLOOM_BITS, LOCAL_BLOOM_HASHES);

      for (let i = 0; i < this.shardCount; i++) {
        const offset = this.entryOffset(i);
        if (offset + ENTRY_SIZE > this.hatBuffer.length) break;

        const tag = this.hatBuffer.readUInt8(offset);
        if (tag !== TAG_TEXT) continue;

        const meta = this.hatBuffer.readUInt32LE(offset + 20);
        const spec = this.hatBuffer.slice(offset + 24, offset + ENTRY_SIZE);
        const matches = localIndices.every(idx => {
          const byteIdx = Number(idx / 8n);
          const bitIdx = Number(idx % 8n);
          return (spec[byteIdx] & (1 << bitIdx)) !== 0;
        });

        if (!matches) continue;

        const tf = 1.0;
        const idf = Math.log((this.shardCount + 1) / 1.0);
        let score = idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (meta / this.avgComplexity))));
        if (term.includes(' ')) score *= 2.0;

        scores.set(i, (scores.get(i) || 0) + score);
      }
    }

    const tahBuffer = scores.size > 0 ? this.loadTahBuffer() : null;
    const queryText = cleanQuery.trim();
    return [...scores.entries()]
      .map(([index, score]) => {
        const offset = this.entryOffset(index);
        const dataOffset = Number(this.hatBuffer.readBigUInt64LE(offset + 8));
        const length = this.hatBuffer.readUInt32LE(offset + 16);
        const data = tahBuffer!.slice(dataOffset, dataOffset + length).toString('utf-8').replace(/\0+$/g, '');
        const normalizedData = data.toLowerCase();
        const termMatches = terms.filter(term => normalizedData.includes(term)).length;
        const phraseMatch = queryText.length > 0 && normalizedData.includes(queryText);

        return {
          score: score + termMatches * 10 + (phraseMatch ? 25 : 0),
          data,
          termMatches,
          phraseMatch
        };
      })
      .filter(match => match.termMatches > 0 || match.phraseMatch)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(({ score, data }) => ({ score, data }));
  }
}
