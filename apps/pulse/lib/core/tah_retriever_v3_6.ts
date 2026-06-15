import fs from 'fs';
import path from 'path';
import { getTahIndices, getSurgicalHash } from './tah_utils';

export interface ShardAnalytics {
  complexity: number;
  relevance: number;
  timestamp: number;
  sourceId: number;
  regionId: number;
}

export interface TAHShardV36 {
  type: number;
  offset: bigint;
  length: number;
  analytics: ShardAnalytics;
  kwHash: bigint;
  data: string;
}

export interface SourceMetadata {
  url: string;
  location: string;
  created_at: number;
}

export interface TAHSearchResultV36 extends TAHShardV36 {
  source: SourceMetadata | null;
  score: number;
}

const ENTRY_SIZE = 80;
const TAG_TEXT = 0;
const LOCAL_BLOOM_BITS = 288n;
const LOCAL_BLOOM_HASHES = 4;
const LOCAL_BLOOM_OFFSET = 44;
const LOCAL_BLOOM_BYTES = 36;

export class TAHRetrieverV36 {
  private buffer: Buffer | null = null;
  private k: number = 0;
  private m: bigint = 0n;
  private shardCount: number = 0;
  private bloomFilter: Buffer | null = null;
  private shardIndex: Buffer | null = null;
  private sourceRegistry: SourceMetadata[] = [];

  constructor(private sourceBase: string) {
    this.load();
  }

  private load() {
    const hatPath = this.sourceBase.endsWith('.hat') ? this.sourceBase : `${this.sourceBase}.hat`;
    const tahPath = this.sourceBase.endsWith('.tah') ? this.sourceBase : `${this.sourceBase}.tah`;

    if (!fs.existsSync(hatPath) || !fs.existsSync(tahPath)) {
      throw new Error(`Cartridge files missing: ${hatPath} or ${tahPath}`);
    }

    const hatBuffer = fs.readFileSync(hatPath);
    const tahBuffer = fs.readFileSync(tahPath);
    this.buffer = tahBuffer; // Data is in .tah

    const magic = hatBuffer.readUInt32LE(0);
    const version = hatBuffer.readUInt16LE(4);
    
    if (magic !== 0x54414821 && magic !== 0x4d454d21) {
      throw new Error(`Invalid magic number: 0x${magic.toString(16)}`);
    }

    this.k = hatBuffer.readUInt8(6);
    this.m = hatBuffer.readBigUint64LE(8);
    this.shardCount = hatBuffer.readUInt32LE(16);
    
    const registryOffset = hatBuffer.readBigUint64LE(24);
    const registryLen = hatBuffer.readUInt32LE(32);

    const bloomByteSize = Number((this.m + 7n) / 8n);
    this.bloomFilter = hatBuffer.slice(64, 64 + bloomByteSize);
    this.shardIndex = hatBuffer.slice(64 + bloomByteSize, 64 + bloomByteSize + (this.shardCount * 80));

    if (registryLen > 0) {
      const registryJson = hatBuffer.slice(Number(registryOffset), Number(registryOffset) + registryLen).toString('utf-8');
      this.sourceRegistry = JSON.parse(registryJson);
    }
  }

  public getShard(index: number): TAHShardV36 | null {
    if (!this.shardIndex || index >= this.shardCount) return null;

    const meta = this.getShardMeta(index);
    if (!meta) return null;

    const dataBuffer = this.buffer!.slice(Number(meta.offset), Number(meta.offset) + meta.length);
    let textLen = 0;
    while (textLen < dataBuffer.length && dataBuffer[textLen] !== 0) textLen++;
    const text = dataBuffer.slice(0, textLen).toString('utf-8');

    return {
      type: meta.type,
      offset: meta.offset,
      length: meta.length,
      kwHash: meta.kwHash,
      analytics: {
        complexity: meta.complexity,
        relevance: meta.relevance,
        timestamp: meta.timestamp,
        sourceId: meta.sourceId,
        regionId: meta.regionId
      },
      data: text
    };
  }

  private getShardMeta(index: number) {
    if (!this.shardIndex || index < 0 || index >= this.shardCount) return null;

    const start = index * ENTRY_SIZE;
    if (start + ENTRY_SIZE > this.shardIndex.length) return null;

    return {
      type: this.shardIndex.readUInt8(start),
      offset: this.shardIndex.readBigUint64LE(start + 8),
      length: this.shardIndex.readUInt32LE(start + 16),
      sourceId: this.shardIndex.readUInt16LE(start + 20),
      regionId: this.shardIndex.readUInt16LE(start + 22),
      kwHash: this.shardIndex.readBigUint64LE(start + 24),
      complexity: this.shardIndex.readFloatLE(start + 32),
      relevance: this.shardIndex.readFloatLE(start + 36),
      timestamp: this.shardIndex.readUInt32LE(start + 40),
      localBloom: this.shardIndex.slice(start + LOCAL_BLOOM_OFFSET, start + LOCAL_BLOOM_OFFSET + LOCAL_BLOOM_BYTES)
    };
  }

  public getSource(id: number): SourceMetadata | null {
    return this.sourceRegistry[id] || null;
  }

  /**
   * Performs an O(1) surgical check against the Global Bloom Filter.
   */
  public contains(keyword: string): boolean {
    if (!this.bloomFilter) return true;
    const indices = getTahIndices(keyword, this.m, this.k);
    for (const idx of indices) {
      const byteIdx = Number(idx / 8n);
      const bitIdx = Number(idx % 8n);
      if (!(this.bloomFilter[byteIdx] & (1 << bitIdx))) return false;
    }
    return true;
  }

  private localContains(localBloom: Buffer, keyword: string): boolean {
    const indices = getTahIndices(keyword, LOCAL_BLOOM_BITS, LOCAL_BLOOM_HASHES);
    for (const idx of indices) {
      const byteIdx = Number(idx / 8n);
      const bitIdx = Number(idx % 8n);
      if (byteIdx >= localBloom.length || !(localBloom[byteIdx] & (1 << bitIdx))) {
        return false;
      }
    }
    return true;
  }

  private getSearchTerms(query: string): string[] {
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
    const terms = cleanQuery.split(/\s+/).map(t => t.trim()).filter(t => t.length > 2);
    const ngrams = [...terms];

    for (let i = 0; i < terms.length - 1; i++) {
      ngrams.push(`${terms[i]} ${terms[i + 1]}`);
    }

    return Array.from(new Set(ngrams));
  }

  /**
   * The "Surgical Retrieval" path. 
   * Pre-filters the vault via Global Bloom, scores local Bloom hits, then reads
   * payload text only for candidate shards.
   */
  public search(query: string, topN: number = 3): TAHSearchResultV36[] {
    const queryHash = getSurgicalHash(query);
    const searchTerms = this.getSearchTerms(query);
    const globallyPresentTerms = searchTerms.filter(term => this.contains(term));
    
    // O(1) Pre-check
    if (!this.contains(query) && globallyPresentTerms.length === 0) {
      return [];
    }

    const scores: Map<number, number> = new Map();

    for (let i = 0; i < this.shardCount; i++) {
      const meta = this.getShardMeta(i);
      if (!meta || meta.type !== TAG_TEXT) continue;

      let score = 0;
      if (meta.kwHash === queryHash) {
        score += 100.0; // Surgical Bullseye
      }

      for (const term of globallyPresentTerms) {
        if (this.localContains(meta.localBloom, term)) {
          score += term.includes(' ') ? 8.0 : 3.5;
        }
      }

      if (score > 0) {
        // Intelligence-Weighting
        const complexity = isNaN(meta.complexity) ? 1.0 : meta.complexity;
        const relevance = isNaN(meta.relevance) ? 1.0 : meta.relevance;
        const weightedScore = score * (relevance * 2.0) + (complexity * 1.5);
        scores.set(i, weightedScore);
      }
    }

    const queryText = query.toLowerCase().trim();
    const candidates = Array.from(scores.keys()).map(index => {
      const shard = this.getShard(index);
      if (!shard) return null;

      const normalizedData = shard.data.toLowerCase();
      const termMatches = searchTerms.filter(term => normalizedData.includes(term)).length;
      const phraseMatch = queryText.length > 0 && normalizedData.includes(queryText);
      const score = scores.get(index)! + (termMatches * 10) + (phraseMatch ? 25 : 0);

      return {
        ...shard,
        source: this.getSource(shard.analytics.sourceId),
        score
      };
    }).filter((result): result is TAHSearchResultV36 => Boolean(result));

    return candidates
      .filter(result => result.score >= 100 || searchTerms.some(term => result.data.toLowerCase().includes(term)))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }
}
