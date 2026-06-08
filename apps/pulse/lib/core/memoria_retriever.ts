import fs from 'fs';
import path from 'path';
import { getTahIndices } from './tah_utils';
import { WebGraph } from './webgraph';

export interface MemoriaMatch {
  score: number;
  data: string;
  links: number[];
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
  
  private registryOffset = 0n;
  private registryLength = 0;
  private linksOffset = 0n;
  private linksLength = 0;
  private linksData: Buffer | null = null;

  // v4 fields
  private isV4 = false;
  private v4ShardIndexOffset = 0;

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
    if (magic === 0x2134564d) { // MEMORIA_V4_MAGIC
      this.isV4 = true;
      const sectionCount = this.hatBuffer.readUInt32LE(16);
      this.k = this.hatBuffer.readUInt16LE(22);
      this.shardCount = Number(this.hatBuffer.readBigUInt64LE(24));
      const sectionDirectoryOffset = Number(this.hatBuffer.readBigUInt64LE(88));

      // Parse section directory
      const sections: Array<{ type: number; offset: number; length: number; itemCount: number }> = [];
      for (let index = 0; index < sectionCount; index++) {
        const entryOffset = sectionDirectoryOffset + index * 64;
        if (entryOffset + 64 <= this.hatBuffer.length) {
          sections.push({
            type: this.hatBuffer.readUInt16LE(entryOffset),
            offset: Number(this.hatBuffer.readBigUInt64LE(entryOffset + 8)),
            length: Number(this.hatBuffer.readBigUInt64LE(entryOffset + 16)),
            itemCount: Number(this.hatBuffer.readBigUInt64LE(entryOffset + 24))
          });
        }
      }

      const gfSec = sections.find(s => s.type === 1); // GLOBAL_FILTER
      if (gfSec) {
        this.globalBloom = this.hatBuffer.subarray(gfSec.offset, gfSec.offset + gfSec.length);
        this.m = BigInt(this.globalBloom.length * 8);
      }

      const siSec = sections.find(s => s.type === 3); // SHARD_INDEX
      if (siSec) {
        this.v4ShardIndexOffset = siSec.offset;
      }
      return;
    }

    if (magic !== 0x54414821 && magic !== 0x48415421) {
      throw new Error(`Invalid Memoria header magic: 0x${magic.toString(16)}`);
    }

    this.k = this.hatBuffer.readUInt8(6);
    this.m = this.hatBuffer.readBigUInt64LE(8);
    this.shardCount = this.hatBuffer.readUInt32LE(16);
    this.avgComplexity = this.hatBuffer.readUInt32LE(20) || 1;
    
    // v3.6 extensions
    this.registryOffset = this.hatBuffer.readBigUint64LE(24);
    this.registryLength = this.hatBuffer.readUInt32LE(32);
    this.linksOffset = this.hatBuffer.readBigUint64LE(36);
    this.linksLength = this.hatBuffer.readUInt32LE(44);

    const bloomSize = Number((this.m + 7n) / 8n);
    this.indexOffset = this.bloomOffset + bloomSize;
    this.globalBloom = this.hatBuffer.slice(this.bloomOffset, this.indexOffset);
    
    if (this.linksLength > 0 && this.linksOffset < BigInt(this.hatBuffer.length)) {
      this.linksData = this.hatBuffer.slice(Number(this.linksOffset), Number(this.linksOffset) + this.linksLength);
    }
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
    if (this.isV4) {
      return this.searchV4(query, topN);
    }

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

        // Note: in v3.6+, meta/bloom are at different offsets, but we fallback to 24+ for spec
        const spec = this.hatBuffer.slice(offset + 44, offset + ENTRY_SIZE); // v3.6 local bloom
        const matches = localIndices.every(idx => {
          const byteIdx = Number(idx / 8n);
          const bitIdx = Number(idx % 8n);
          return byteIdx < spec.length && (spec[byteIdx] & (1 << bitIdx)) !== 0;
        });

        if (!matches) continue;

        const tf = 1.0;
        const idf = Math.log((this.shardCount + 1) / 1.0);
        let score = idf * 2.2; // Simplified score
        if (term.includes(' ')) score *= 2.0;

        scores.set(i, (scores.get(i) || 0) + score);
      }
    }

    const tahBuffer = scores.size > 0 ? this.loadTahBuffer() : null;
    const queryText = cleanQuery.trim();
    return [...scores.entries()]
      .map(([index, score]) => {
        const offset = this.entryOffset(index);
        const linkCount = this.hatBuffer.readUInt16LE(offset + 1);
        const linkOffset = this.hatBuffer.readUInt32LE(offset + 3);
        
        const dataOffset = Number(this.hatBuffer.readBigUInt64LE(offset + 8));
        const length = this.hatBuffer.readUInt32LE(offset + 16);
        const data = tahBuffer!.slice(dataOffset, dataOffset + length).toString('utf-8').replace(/\0+$/g, '');
        
        let links: number[] = [];
        if (linkCount > 0 && this.linksData) {
          links = WebGraph.decodeLinks(this.linksData.slice(linkOffset), index, linkCount);
        }

        const normalizedData = data.toLowerCase();
        const termMatches = terms.filter(term => normalizedData.includes(term)).length;
        const phraseMatch = queryText.length > 0 && normalizedData.includes(queryText);

        return {
          score: score + termMatches * 10 + (phraseMatch ? 25 : 0),
          data,
          links,
          termMatches,
          phraseMatch
        };
      })
      .filter(match => match.termMatches > 0 || match.phraseMatch)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(({ score, data, links }) => ({ score, data, links }));
  }

  private searchV4(query: string, topN = 3): MemoriaMatch[] {
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
    const terms = cleanQuery.split(/\s+/).map(t => t.trim()).filter(t => t.length > 2);
    if (terms.length === 0) return [];

    const tahBuffer = this.loadTahBuffer();
    const scores = new Map<number, number>();

    for (let i = 0; i < this.shardCount; i++) {
      const entryOffset = this.v4ShardIndexOffset + i * 80;
      if (entryOffset + 80 > this.hatBuffer.length) break;

      const dataOffset = Number(this.hatBuffer.readBigUInt64LE(entryOffset + 32));
      const length = Number(this.hatBuffer.readBigUInt64LE(entryOffset + 40));

      if (length <= 0 || dataOffset < 0 || dataOffset + length > tahBuffer.length) continue;

      const data = tahBuffer.subarray(dataOffset, dataOffset + length).toString('utf-8').replace(/\0+$/g, '');
      const normalizedData = data.toLowerCase();

      let score = 0;
      let termMatches = 0;

      for (const term of terms) {
        if (normalizedData.includes(term)) {
          termMatches++;
          score += 10;
        }
      }

      if (termMatches > 0) {
        const queryText = cleanQuery.trim();
        if (queryText.length > 0 && normalizedData.includes(queryText)) {
          score += 25;
        }
        scores.set(i, score);
      }
    }

    return [...scores.entries()]
      .map(([index, score]) => {
        const entryOffset = this.v4ShardIndexOffset + index * 80;
        const dataOffset = Number(this.hatBuffer.readBigUInt64LE(entryOffset + 32));
        const length = Number(this.hatBuffer.readBigUInt64LE(entryOffset + 40));
        const data = tahBuffer.subarray(dataOffset, dataOffset + length).toString('utf-8').replace(/\0+$/g, '');
        return { score, data };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }
}
