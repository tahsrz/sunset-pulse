import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decodeTahEntry,
  decodeTahSpecV1,
  encodeTahEntry,
  encodeTahSpecV1,
  TAH_ENTRY_SIZE,
  TAH_SPEC_V1_PAYLOAD_SIZE
} from '@/lib/core/tah_entry_layout';

const GOLDEN_ENTRY_HEX = fs
  .readFileSync(path.resolve(process.cwd(), '../../packages/tah-spec/golden/tah-entry-v1.hex'), 'utf8')
  .trim();

const EXPECTED_ENTRY_HEX = [
  '42',
  '00000000000000',
  '0807060504030201',
  '44332211',
  '88776655',
  '03010b0a',
  Buffer.from('hello tah', 'utf8').toString('hex'),
  '00'.repeat(TAH_SPEC_V1_PAYLOAD_SIZE - 'hello tah'.length)
].join('');

describe('TAH entry binary layout', () => {
  it('packs the 80-byte entry contract with a 56-byte versioned spec block', () => {
    const packed = encodeTahEntry({
      tag: 0x42,
      offset: 0x0102030405060708n,
      length: 0x11223344,
      meta: 0x55667788,
      spec: {
        kind: 3,
        version: 1,
        flags: 0x0a0b,
        payload: 'hello tah'
      }
    });

    expect(packed.length).toBe(TAH_ENTRY_SIZE);
    expect(packed.toString('hex')).toBe(GOLDEN_ENTRY_HEX);
    expect(GOLDEN_ENTRY_HEX).toBe(EXPECTED_ENTRY_HEX);
  });

  it('round-trips entry fields without losing reserved pad or payload bytes', () => {
    const packed = Buffer.from(GOLDEN_ENTRY_HEX, 'hex');
    const decoded = decodeTahEntry(packed);

    expect(decoded.tag).toBe(0x42);
    expect(decoded.pad.equals(Buffer.alloc(7))).toBe(true);
    expect(decoded.offset).toBe(0x0102030405060708n);
    expect(decoded.length).toBe(0x11223344);
    expect(decoded.meta).toBe(0x55667788);
    expect(decoded.spec.kind).toBe(3);
    expect(decoded.spec.version).toBe(1);
    expect(decoded.spec.flags).toBe(0x0a0b);
    expect(Buffer.from(decoded.spec.payload ?? []).subarray(0, 9).toString('utf8')).toBe('hello tah');
    expect(decoded.rawSpec.equals(encodeTahSpecV1(decoded.spec))).toBe(true);
  });

  it('rejects undersized spec payloads when decoding raw spec bytes', () => {
    expect(() => decodeTahSpecV1(Buffer.alloc(55))).toThrow(/exactly 56 bytes/);
  });
});
