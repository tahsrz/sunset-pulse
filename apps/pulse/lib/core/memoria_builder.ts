import { getTahIndices } from './tah_utils';

export interface MemoriaTextInput {
  text: string;
  meta?: number;
}

export interface MemoriaBuildResult {
  hat: Buffer;
  tah: Buffer;
  stats: {
    shardCount: number;
    bloomBits: string;
    hashCount: number;
    payloadByteSize: number;
    headerByteSize: number;
  };
}

const TAG_TEXT = 0;
const LOCAL_BLOOM_BITS = 448n;
const LOCAL_BLOOM_HASHES = 4;
const LOCAL_BLOOM_BYTES = 56;
const ENTRY_SIZE = 80;

const NEGATIVE_UNIGRAMS = new Set([
  'the',
  'and',
  'for',
  'with',
  'under',
  'over',
  'from',
  'this',
  'that',
  'these',
  'those',
  'is',
  'are',
  'was',
  'were',
  'been',
  'being',
  'have',
  'has',
  'had',
  'what',
  'how',
  'where',
  'when',
  'which',
  'who',
  'whom',
  'common',
  'rules',
  'general',
  'about',
  'above',
  'below',
  'into',
  'onto',
  'your',
  'their',
  'there',
  'than',
  'then',
  'them',
  'they'
]);

type PendingShard = {
  offset: number;
  length: number;
  meta: number;
  localBloom: Buffer;
  data: Buffer;
};

export class MemoriaBuilder {
  private m: bigint;
  private k: number;
  private globalBloom: Buffer;
  private shards: PendingShard[] = [];
  private payloadByteSize = 0;
  private totalWordCount = 0;

  constructor(targetFalsePositiveRate = 0.0001, expectedElements = 5000) {
    const n = Math.max(1, Math.floor(expectedElements));
    const mFloat = -(n * Math.log(targetFalsePositiveRate)) / Math.pow(Math.log(2), 2);
    this.m = BigInt(Math.ceil(mFloat / 8) * 8);
    this.k = Math.max(1, Math.ceil((Number(this.m) / n) * Math.log(2)));
    this.globalBloom = Buffer.alloc(Number(this.m / 8n), 0);
  }

  public addTextShard(text: string, meta?: number) {
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!cleanText) return;

    const localBloom = this.buildLocalBloom(cleanText);
    const wordCount = meta || countWords(cleanText);
    const data = Buffer.concat([Buffer.from(cleanText, 'utf-8'), Buffer.from([0, 0])]);

    this.shards.push({
      offset: this.payloadByteSize,
      length: data.length,
      meta: wordCount,
      localBloom,
      data
    });
    this.payloadByteSize += data.length;
    this.totalWordCount += wordCount;
  }

  public forge(inputs: MemoriaTextInput[]): MemoriaBuildResult {
    inputs.forEach(input => this.addTextShard(input.text, input.meta));

    const header = Buffer.alloc(64, 0);
    const avgComplexity = this.shards.length > 0 ? Math.floor(this.totalWordCount / this.shards.length) : 0;

    header.writeUInt32LE(0x54414821, 0);
    header.writeUInt16LE(0x0350, 4);
    header.writeUInt8(this.k, 6);
    header.writeBigUInt64LE(this.m, 8);
    header.writeUInt32LE(this.shards.length, 16);
    header.writeUInt32LE(avgComplexity, 20);

    const entries = this.shards.map(shard => {
      const entry = Buffer.alloc(ENTRY_SIZE, 0);
      entry.writeUInt8(TAG_TEXT, 0);
      entry.writeBigUInt64LE(BigInt(shard.offset), 8);
      entry.writeUInt32LE(shard.length, 16);
      entry.writeUInt32LE(shard.meta, 20);
      shard.localBloom.copy(entry, 24);
      return entry;
    });

    const tah = Buffer.concat(this.shards.map(shard => shard.data));
    const hat = Buffer.concat([header, this.globalBloom, ...entries]);

    return {
      hat,
      tah,
      stats: {
        shardCount: this.shards.length,
        bloomBits: this.m.toString(),
        hashCount: this.k,
        payloadByteSize: tah.length,
        headerByteSize: hat.length
      }
    };
  }

  private buildLocalBloom(text: string) {
    const bloom = Buffer.alloc(LOCAL_BLOOM_BYTES, 0);

    for (const term of extractMemoriaTerms(text)) {
      this.addToGlobalFilter(term);

      for (const idx of getTahIndices(term, LOCAL_BLOOM_BITS, LOCAL_BLOOM_HASHES)) {
        const byteIdx = Number(idx / 8n);
        const bitIdx = Number(idx % 8n);
        bloom[byteIdx] |= 1 << bitIdx;
      }
    }

    return bloom;
  }

  private addToGlobalFilter(term: string) {
    for (const idx of getTahIndices(term, this.m, this.k)) {
      const byteIdx = Number(idx / 8n);
      const bitIdx = Number(idx % 8n);
      this.globalBloom[byteIdx] |= 1 << bitIdx;
    }
  }
}

export function buildMemoriaPair(inputs: MemoriaTextInput[], expectedElements?: number) {
  const terms = inputs.reduce((count, input) => count + extractMemoriaTerms(input.text).length, 0);
  const builder = new MemoriaBuilder(0.0001, expectedElements || Math.max(64, terms));
  return builder.forge(inputs);
}

export function segmentTextForMemoria(text: string, maxShardSize = 1200): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const rawChunks = normalized.split(/\n{2,}|(?=^#\s+)/m).map(chunk => chunk.trim()).filter(Boolean);
  const shards: string[] = [];
  let current = '';

  for (const chunk of rawChunks.length ? rawChunks : [normalized]) {
    if (!current) {
      current = chunk;
      continue;
    }

    if (current.length + chunk.length + 2 <= maxShardSize) {
      current = `${current}\n\n${chunk}`;
    } else {
      shards.push(...splitOversizedShard(current, maxShardSize));
      current = chunk;
    }
  }

  if (current) shards.push(...splitOversizedShard(current, maxShardSize));
  return shards.map(shard => shard.trim()).filter(Boolean);
}

export function extractMemoriaTerms(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean);

  const terms = new Set<string>();
  for (const word of words) {
    if (word.length > 2 && !NEGATIVE_UNIGRAMS.has(word)) terms.add(word);
  }

  for (let index = 0; index < words.length - 1; index++) {
    const pair = `${words[index]} ${words[index + 1]}`.trim();
    if (pair.length > 5) terms.add(pair);
  }

  return [...terms];
}

function splitOversizedShard(text: string, maxShardSize: number): string[] {
  if (text.length <= maxShardSize) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const shards: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (current.length + sentence.length + 1 <= maxShardSize) {
      current = `${current} ${sentence}`;
    } else {
      shards.push(current);
      current = sentence;
    }
  }

  if (current) shards.push(current);
  return shards.flatMap(shard => {
    if (shard.length <= maxShardSize) return [shard];

    const chunks: string[] = [];
    for (let index = 0; index < shard.length; index += maxShardSize) {
      chunks.push(shard.slice(index, index + maxShardSize));
    }
    return chunks;
  });
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
