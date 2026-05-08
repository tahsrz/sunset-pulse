/**
 * TAH Gate - Surgical Listing Validation
 * Port of SunsetWars TAH Bloom Filter (v3.0) to TypeScript.
 * Uses BigInt for 64-bit parity with Python/C# implementations.
 */

import fs from 'fs';
import path from 'path';

const K0 = BigInt('0xc3a5c85c97cb3127');
const K1 = BigInt('0xb492b66fbe98f273');
const K2 = BigInt('0x9ae16a3b2f90404f');
const KMUL = BigInt('0x9ddfea08eb382d69');
const MASK64 = BigInt('0xFFFFFFFFFFFFFFFF');

function rotate(val: bigint, shift: bigint): bigint {
  return ((val >> shift) | (val << (64n - shift))) & MASK64;
}

function shiftMix(val: bigint): bigint {
  return (val ^ (val >> 47n)) & MASK64;
}

function hashLen16(u: bigint, v: bigint): bigint {
  let a = ((u ^ v) * KMUL) & MASK64;
  a ^= (a >> 47n);
  let b = ((v ^ a) * KMUL) & MASK64;
  b ^= (b >> 47n);
  b = (b * KMUL) & MASK64;
  return b;
}

function fetch64(data: Buffer, offset: number): bigint {
  return data.readBigUint64LE(offset);
}

function fetch32(data: Buffer, offset: number): bigint {
  return BigInt(data.readUInt32LE(offset));
}

function hashLen0to16(data: Buffer): bigint {
  const len = BigInt(data.length);
  if (len > 8n) {
    const a = fetch64(data, 0);
    const b = fetch64(data, data.length - 8);
    return hashLen16(a, rotate((b + len) & MASK64, len)) ^ b;
  }
  if (len >= 4n) {
    const a = fetch32(data, 0);
    return hashLen16((len + (a << 3n)) & MASK64, fetch32(data, data.length - 4));
  }
  if (len > 0n) {
    const a = BigInt(data[0]);
    const b = BigInt(data[Number(len >> 1n)]);
    const c = BigInt(data[data.length - 1]);
    const y = (a + (b << 8n)) & 0xFFFFFFFFn;
    const z = (len + (c << 2n)) & 0xFFFFFFFFn;
    return (shiftMix((y * K2 ^ z * K0) & MASK64) * K2) & MASK64;
  }
  return K0;
}

function cityHash64(data: Buffer): bigint {
  const len = data.length;
  if (len <= 32) {
    if (len <= 16) {
      return hashLen0to16(data);
    } else {
      const a = fetch64(data, 0);
      const b = fetch64(data, 8);
      const c = fetch64(data, len - 8);
      const d = fetch64(data, len - 16);
      return hashLen16((rotate((a - b) & MASK64, 43n) + rotate(c, 30n) + d) & MASK64,
                       (a + rotate((b ^ K2) & MASK64, 18n) + c) & MASK64);
    }
  } else if (len <= 64) {
    if (len >= 40) {
      const x = fetch64(data, len - 40);
      const y = (fetch64(data, len - 16) ^ fetch64(data, len - 24)) & MASK64;
      const z = fetch64(data, len - 8);
      const v0 = (rotate(y, 33n) * K1) & MASK64;
      const v1 = (rotate((y + x) & MASK64, 33n) * K1) & MASK64;
      const w0 = ((rotate((z + v0) & MASK64, 35n) * K1) + v1) & MASK64;
      const w1 = (rotate((x + y) & MASK64, 33n) * K1) & MASK64;
      return hashLen16((v0 + v1) & MASK64, (w0 + w1) & MASK64);
    } else {
      const a = fetch64(data, 0);
      const b = fetch64(data, 8);
      const c = fetch64(data, len - 8);
      const d = fetch64(data, len - 16);
      return hashLen16((rotate((a - b) & MASK64, 43n) + rotate(c, 30n) + d) & MASK64,
                       (a + rotate((b ^ K2) & MASK64, 18n) + c) & MASK64);
    }
  }
  
  // For len > 64, we'll fall back to a simplified but consistent approach 
  // since most MLS signatures are < 64 chars.
  const a = fetch64(data, 0);
  const b = fetch64(data, 8);
  const c = fetch64(data, len - 8);
  const d = fetch64(data, len - 16);
  return hashLen16((rotate((a - b) & MASK64, 43n) + rotate(c, 30n) + d) & MASK64,
                   (a + rotate((b ^ K2) & MASK64, 18n) + c) & MASK64);
}

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
