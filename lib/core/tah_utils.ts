import { cityHash64 } from './cityhash';

const MASK64 = BigInt('0xFFFFFFFFFFFFFFFF');

/**
 * Standardizes the normalization of keywords for the TAH/Memoria Protocol.
 */
export const normalizeKeyword = (kw: string): Buffer => {
  return Buffer.from(kw.toLowerCase().trim(), 'utf-8');
};

/**
 * Generates the double-hash indices for a given keyword.
 * Consistent across TypeScript, Python, and C# implementations.
 */
export const getTahIndices = (keyword: string, m: bigint, k: number): bigint[] => {
  const data = normalizeKeyword(keyword);
  const h1 = cityHash64(data);
  const h2 = cityHash64(Buffer.concat([data, Buffer.from('TAH_SALT', 'utf-8')]));

  const indices: bigint[] = [];
  for (let i = 0n; i < BigInt(k); i++) {
    indices.push(((h1 + i * h2) & MASK64) % m);
  }
  return indices;
};

/**
 * Generates the primary surgical hash for a keyword.
 */
export const getSurgicalHash = (keyword: string): bigint => {
  return cityHash64(normalizeKeyword(keyword));
};
