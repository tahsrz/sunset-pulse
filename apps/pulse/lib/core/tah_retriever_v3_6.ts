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

    const start = index * 80;
    const type = this.shardIndex.readUInt8(start);
    const offset = this.shardIndex.readBigUint64LE(start + 8);
    const length = this.shardIndex.readUInt32LE(start + 16);
    
    // v3.6 Specifics
    const sourceId = this.shardIndex.readUInt16LE(start + 20);
    const regionId = this.shardIndex.readUInt16LE(start + 22);
    const kwHash = this.shardIndex.readBigUint64LE(start + 24);
    const complexity = this.shardIndex.readFloatLE(start + 32);
    const relevance = this.shardIndex.readFloatLE(start + 36);
    const timestamp = this.shardIndex.readUInt32LE(start + 40);

    const dataBuffer = this.buffer!.slice(Number(offset), Number(offset) + length);
    let textLen = 0;
    while (textLen < dataBuffer.length && dataBuffer[textLen] !== 0) textLen++;
    const text = dataBuffer.slice(0, textLen).toString('utf-8');

    return {
      type,
      offset,
      length,
      kwHash,
      analytics: {
        complexity,
        relevance,
        timestamp,
        sourceId,
        regionId
      },
      data: text
    };
  }

  public getSource(id: number): SourceMetadata | null {
    return this.sourceRegistry[id] || null;
  }

  public search(query: string): any[] {
    const results: any[] = [];
    const queryHash = getSurgicalHash(query);

    for (let i = 0; i < this.shardCount; i++) {
      const shard = this.getShard(i);
      if (shard && (shard.kwHash === queryHash || shard.data.toLowerCase().includes(query.toLowerCase()))) {
        results.push({
          ...shard,
          source: this.getSource(shard.analytics.sourceId)
        });
      }
    }
    return results;
  }
}
