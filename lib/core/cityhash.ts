/**
 * CityHash64 implementation in TypeScript
 * RIGOROUSLY MASKED FOR 64-BIT PARITY
 */

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

function weakHashLen32WithSeeds(w: bigint, x: bigint, y: bigint, z: bigint, a: bigint, b: bigint): [bigint, bigint] {
  a = (a + w) & MASK64;
  b = rotate((b + a + z) & MASK64, 21n);
  const c = a;
  a = (a + x) & MASK64;
  a = (a + y) & MASK64;
  b = (b + rotate(a, 44n)) & MASK64;
  return [(a + z) & MASK64, (b + c) & MASK64];
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
    const b = BigInt(data[Math.floor(data.length / 2)]);
    const c = BigInt(data[data.length - 1]);
    const y = (a + (b << 8n)) & 0xFFFFFFFFn;
    const z = (len + (c << 2n)) & 0xFFFFFFFFn;
    return (shiftMix((y * K2 ^ z * K0) & MASK64) * K2) & MASK64;
  }
  return K0;
}

export function cityHash64(data: Buffer): bigint {
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
  
  let x = fetch64(data, 0);
  let y = (fetch64(data, len - 16) ^ fetch64(data, len - 32)) & MASK64;
  let z = fetch64(data, len - 8);
  let v: [bigint, bigint] = [
    (rotate(y, 33n) * K1) & MASK64,
    (rotate((y + x) & MASK64, 33n) * K1) & MASK64
  ];
  let w: [bigint, bigint] = [
    ((rotate((z + v[0]) & MASK64, 35n) * K1) + v[1]) & MASK64,
    (rotate((x + y) & MASK64, 33n) * K1) & MASK64
  ];
  x = (rotate((x + y) & MASK64, 42n) * K1) & MASK64;
  
  let offset = 0;
  while (len - offset > 64) {
    x = (rotate((x + y + v[0] + fetch64(data, offset + 8)) & MASK64, 37n) * K1) & MASK64;
    y = (rotate((y + v[1] + fetch64(data, offset + 48)) & MASK64, 42n) * K1) & MASK64;
    x ^= w[1];
    y = (y + v[0] + fetch64(data, offset + 40)) & MASK64;
    z = (rotate((z + w[0]) & MASK64, 33n) * K1) & MASK64;
    v = weakHashLen32WithSeeds(fetch64(data, offset), fetch64(data, offset + 16), fetch64(data, offset + 24), fetch64(data, offset + 32), v[0], v[1]);
    w = weakHashLen32WithSeeds(fetch64(data, offset + 32), fetch64(data, offset + 40), fetch64(data, offset + 48), fetch64(data, offset + 56), w[0], w[1]);
    const temp = z;
    z = x;
    x = temp;
    offset += 64;
  }
  
  return hashLen16((hashLen16(v[0], v[1]) + (shiftMix(y) * K1) + z) & MASK64,
                   (hashLen16(w[0], w[1]) + x) & MASK64);
}
