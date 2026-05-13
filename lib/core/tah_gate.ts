/**
 * TAH Gate - Surgical Listing Validation
 * Port of SunsetWars TAH Bloom Filter (v3.0) to TypeScript.
 * Uses BigInt for 64-bit parity with Python/C# implementations.
 */

import fs from 'fs';
import path from 'path';

import { cityHash64 } from './cityhash';

const MASK64 = BigInt('0xFFFFFFFFFFFFFFFF');

export class TAHGate {
  private bloomFilter: Uint8Array | null = null;
  private k: number = 0;
  private m: bigint = 0n;

  constructor(cartridgePath: string) {
    this.loadCartridge(cartridgePath);
  }

  private loadCartridge(filePath: string) {
    if (!fs.existsSync(filePath)) {
      console.warn(`[TAH_GATE] Cartridge not found: ${filePath}`);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x54414821) {
      console.error('[TAH_GATE] Invalid TAH magic number');
      return;
    }

    this.k = buffer.readUInt8(6);
    this.m = buffer.readBigUint64LE(8);
    
    const bloomByteSize = Number((this.m + 7n) / 8n);
    this.bloomFilter = new Uint8Array(buffer.buffer, buffer.byteOffset + 64, bloomByteSize);
    console.log(`[TAH_GATE] Loaded cartridge: ${path.basename(filePath)} (m=${this.m}, k=${this.k})`);
  }

  public isProbablyPresent(text: string): boolean {
    if (!this.bloomFilter) return false;

    const data = Buffer.from(text.toLowerCase().strip(), 'utf-8');
    const h1 = cityHash64(data);
    const h2 = cityHash64(Buffer.concat([data, Buffer.from('TAH_SALT', 'utf-8')]));

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
}

// Extension to String for parity with Python logic
declare global {
  interface String {
    strip(): string;
  }
}

if (!String.prototype.strip) {
  String.prototype.strip = function() {
    return this.trim();
  };
}
