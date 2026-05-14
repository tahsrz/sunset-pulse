import { getTahIndices, getSurgicalHash } from './tah_utils';

/**
 * TAHBuilder - The Memory Forge
 * Generates binary .tah cartridges from structured data.
 * Optimized for serverless "conveyor belt" execution.
 */

export interface TAHInput {
  keywords: string[];
  data: string;
  type?: number;
  meta?: number;
}

export class TAHBuilder {
  private k: number = 14; // Default k (matches listings_gate.tah)
  private m: bigint = 0n;
  private p: number = 0.001; // Desired false positive probability

  constructor(p = 0.001, k = 14) {
    this.p = p;
    this.k = k;
  }

  /**
   * Calculates optimal Bloom Filter size (m) for a given number of items.
   */
  private calculateM(n: number): bigint {
    // Formula: m = -(n * ln(p)) / (ln(2)^2)
    const mFloat = -(n * Math.log(this.p)) / (Math.pow(Math.log(2), 2));
    // Align to 64-bit boundary for safety
    return BigInt(Math.ceil(mFloat / 64) * 64);
  }

  /**
   * Forges a TAH Cartridge Buffer from inputs.
   */
  public forge(inputs: TAHInput[]): Buffer {
    const n = inputs.length;
    this.m = this.calculateM(n || 1);
    const bloomByteSize = Number((this.m + 7n) / 8n);
    const bloomFilter = Buffer.alloc(bloomByteSize, 0);

    // 1. Populate Bloom Filter
    for (const input of inputs) {
      for (const kw of input.keywords) {
        if (!kw || typeof kw !== 'string') continue;
        
        const indices = getTahIndices(kw, this.m, this.k);

        for (const idx of indices) {
          const byteIdx = Number(idx / 8n);
          const bitIdx = Number(idx % 8n);
          bloomFilter[byteIdx] |= (1 << bitIdx);
        }
      }
    }

    // 2. Prepare Data Shards and Index
    const shardIndex = Buffer.alloc(n * 80, 0);
    const dataBuffers: Buffer[] = [];
    let currentOffset = BigInt(64 + bloomByteSize + (n * 80));

    inputs.forEach((input, i) => {
      const dataBuf = Buffer.from(input.data + '\0', 'utf-8'); // Null terminated
      const entryOffset = i * 80;

      shardIndex.writeUInt8(input.type || 1, entryOffset); // Type 1: Text
      shardIndex.writeBigUint64LE(currentOffset, entryOffset + 8);
      shardIndex.writeUInt32LE(dataBuf.length, entryOffset + 16);
      shardIndex.writeUInt32LE(input.meta || 0, entryOffset + 20);

      // Surgical Index: Store the hash of the primary keyword at offset 24
      if (input.keywords.length > 0 && typeof input.keywords[0] === 'string') {
        const kwHash = getSurgicalHash(input.keywords[0]);
        shardIndex.writeBigUint64LE(kwHash, entryOffset + 24);
      }

      dataBuffers.push(dataBuf);
      currentOffset += BigInt(dataBuf.length);
    });

    // 3. Assemble Header (64 bytes)
    const header = Buffer.alloc(64, 0);
    header.writeUInt32LE(0x54414821, 0); // Magic: TAH!
    header.writeUInt16LE(0x0003, 4);     // Version: 3.0
    header.writeUInt8(this.k, 6);        // k
    header.writeBigUint64LE(this.m, 8);  // m
    header.writeUInt32LE(n, 16);         // shardCount

    // 4. Final Concatenation
    return Buffer.concat([
      header,
      bloomFilter,
      shardIndex,
      ...dataBuffers
    ]);
  }
}
