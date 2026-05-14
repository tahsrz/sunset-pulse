import fs from 'fs';
import path from 'path';
import { cityHash64 as city_hash64 } from './cityhash';

const MASK64 = BigInt('0xFFFFFFFFFFFFFFFF');

export interface TAHShard {
  type: number;
  offset: bigint;
  length: number;
  meta: number;
  data: string;
}

export class TAHRetriever {
  private buffer: Buffer | null = null;
  private k: number = 0;
  private m: bigint = 0n;
  private shardCount: number = 0;
  private bloomFilter: Buffer | null = null;
  private shardIndex: Buffer | null = null;

  constructor(private source: string | Buffer) {
    this.load();
  }

  private load() {
    if (Buffer.isBuffer(this.source)) {
      this.buffer = this.source;
    } else {
      if (!fs.existsSync(this.source)) {
        throw new Error(`Cartridge not found: ${this.source}`);
      }
      this.buffer = fs.readFileSync(this.source);
    }

    const magic = this.buffer.readUInt32LE(0);
    
    // Support both TAH! (0x54414821) and other potential magic numbers
    if (magic !== 0x54414821) {
      const sourceName = Buffer.isBuffer(this.source) ? 'In-Memory Buffer' : path.basename(this.source);
      console.warn(`[TAH_RETRIEVER] Unexpected magic number: 0x${magic.toString(16)} for ${sourceName}`);
    }

    this.k = this.buffer.readUInt8(6);
    this.m = this.buffer.readBigUint64LE(8);
    this.shardCount = this.buffer.readUInt32LE(16);

    const bloomByteSize = Number((this.m + 7n) / 8n);
    this.bloomFilter = this.buffer.slice(64, 64 + bloomByteSize);
    this.shardIndex = this.buffer.slice(64 + bloomByteSize, 64 + bloomByteSize + (this.shardCount * 80));
  }

  public containsKeyword(keyword: string): boolean {
    if (!this.bloomFilter) return false;

    const data = Buffer.from(keyword.toLowerCase().trim(), 'utf-8');
    const h1 = city_hash64(data);
    const h2 = city_hash64(Buffer.concat([data, Buffer.from('TAH_SALT', 'utf-8')]));

    for (let i = 0n; i < BigInt(this.k); i++) {
      const idx = ((h1 + i * h2) & MASK64) % this.m;
      const byteIdx = Number(idx / 8n);
      const bitIdx = Number(idx % 8n);
      
      if ((this.bloomFilter[byteIdx] & (1 << bitIdx)) === 0) {
        return false;
      }
    }
    return true;
  }

  public getShard(index: number): (TAHShard & { kwHash: bigint }) | null {
    if (!this.shardIndex || index >= this.shardCount) return null;

    const entryOffset = index * 80;
    const type = this.shardIndex.readUInt8(entryOffset);
    const offset = this.shardIndex.readBigUint64LE(entryOffset + 8);
    const length = this.shardIndex.readUInt32LE(entryOffset + 16);
    const meta = this.shardIndex.readUInt32LE(entryOffset + 20);
    const kwHash = this.shardIndex.readBigUint64LE(entryOffset + 24);

    const dataBuffer = this.buffer!.slice(Number(offset), Number(offset) + length);
    
    // Find null terminator for text shards
    let textLen = 0;
    while (textLen < dataBuffer.length && dataBuffer[textLen] !== 0) textLen++;
    
    const text = dataBuffer.slice(0, textLen).toString('utf-8');

    return {
      type,
      offset,
      length,
      meta,
      kwHash,
      data: text
    };
  }

  public search(query: string): TAHShard[] {
    const results: TAHShard[] = [];
    if (!this.containsKeyword(query)) return results;

    const queryBuf = Buffer.from(query.toLowerCase().trim(), 'utf-8');
    const queryHash = city_hash64(queryBuf);

    // Primary: Surgical Hash Index Match
    for (let i = 0; i < this.shardCount; i++) {
      const shard = this.getShard(i);
      if (shard && shard.kwHash === queryHash) {
        results.push(shard);
      }
    }

    // Secondary: Fallback to string search if no hash matches (legacy support)
    if (results.length === 0) {
      for (let i = 0; i < this.shardCount; i++) {
        const shard = this.getShard(i);
        if (shard && shard.data.toLowerCase().includes(query.toLowerCase())) {
          results.push(shard);
        }
      }
    }

    return results;
  }
}
