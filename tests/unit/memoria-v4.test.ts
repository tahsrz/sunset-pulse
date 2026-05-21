import { describe, expect, it } from 'vitest';
import {
  InvalidMemoriaV4Error,
  MEMORIA_V4_MAGIC,
  MemoriaV4HashFamily,
  MemoriaV4SectionType,
  UnsupportedMemoriaV4VersionError,
  createMemoriaV4HeaderBuffer,
  isMemoriaV4,
  parseMemoriaV4Header
} from '@/lib/core/memoria_v4';

describe('Memoria v4 header prototype', () => {
  it('builds and parses a v4 superblock with a section directory', () => {
    const buffer = createMemoriaV4HeaderBuffer({
      sourceCount: 358,
      shardCount: 12382,
      placeCount: 12,
      tahByteSize: 30240621,
      hashFamily: MemoriaV4HashFamily.CITYHASH64_V1,
      sections: [
        { type: MemoriaV4SectionType.GLOBAL_FILTER, itemCount: 1n },
        { type: MemoriaV4SectionType.SOURCE_TABLE, itemCount: 358n },
        { type: MemoriaV4SectionType.SHARD_INDEX, itemCount: 12382n },
        { type: MemoriaV4SectionType.PAYLOAD_MAP, itemCount: 12382n },
        { type: MemoriaV4SectionType.PLACE_TABLE, itemCount: 12n },
        { type: MemoriaV4SectionType.BM25_STATS }
      ]
    });

    const header = parseMemoriaV4Header(buffer);

    expect(isMemoriaV4(buffer)).toBe(true);
    expect(header.superblock.magic).toBe(MEMORIA_V4_MAGIC);
    expect(header.superblock.versionMajor).toBe(4);
    expect(header.superblock.sourceCount).toBe(358n);
    expect(header.superblock.shardCount).toBe(12382n);
    expect(header.superblock.tahByteSize).toBe(30240621n);
    expect(header.sections.map(section => section.type)).toEqual([
      MemoriaV4SectionType.GLOBAL_FILTER,
      MemoriaV4SectionType.SOURCE_TABLE,
      MemoriaV4SectionType.SHARD_INDEX,
      MemoriaV4SectionType.PAYLOAD_MAP,
      MemoriaV4SectionType.PLACE_TABLE,
      MemoriaV4SectionType.BM25_STATS
    ]);
  });

  it('rejects unsupported Memoria major versions cleanly', () => {
    const buffer = createMemoriaV4HeaderBuffer();
    buffer.writeUInt16LE(5, 4);

    expect(() => parseMemoriaV4Header(buffer)).toThrow(UnsupportedMemoriaV4VersionError);
  });

  it('rejects older TAH and Memoria headers as non-v4 data', () => {
    const tahHeader = Buffer.alloc(192, 0);
    tahHeader.writeUInt32LE(0x54414821, 0);

    expect(isMemoriaV4(tahHeader)).toBe(false);
    expect(() => parseMemoriaV4Header(tahHeader)).toThrow(InvalidMemoriaV4Error);
  });

  it('rejects section entries that exceed the declared hat size', () => {
    const buffer = createMemoriaV4HeaderBuffer({
      sections: [
        {
          type: MemoriaV4SectionType.SOURCE_TABLE,
          offset: 500n,
          length: 100n
        }
      ]
    });

    expect(() => parseMemoriaV4Header(buffer)).toThrow(InvalidMemoriaV4Error);
  });
});
