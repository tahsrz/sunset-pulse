import { describe, it, expect } from 'vitest';
import { cityHash64 } from '@/lib/core/cityhash';

describe('CityHash64', () => {
  it('should generate consistent hashes for the same input', () => {
    const input = Buffer.from('sunset-pulse');
    const hash1 = cityHash64(input);
    const hash2 = cityHash64(input);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = cityHash64(Buffer.from('dallas'));
    const hash2 = cityHash64(Buffer.from('fortworth'));
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty buffers', () => {
    const hash = cityHash64(Buffer.from(''));
    expect(typeof hash).toBe('bigint');
  });

  it('should handle long buffers (> 64 bytes)', () => {
    const longInput = Buffer.from('a'.repeat(100));
    const hash = cityHash64(longInput);
    expect(typeof hash).toBe('bigint');
  });
});
