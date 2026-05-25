import { describe, expect, it } from 'vitest';
import {
  InvalidMemoriaV4Error,
  MEMORIA_V4_MAGIC,
  MemoriaV4HashFamily,
  MemoriaV4SectionType,
  UnsupportedMemoriaV4VersionError,
  createMemoriaV4HeaderBuffer,
  isMemoriaV4,
  parseMemoriaV4Header,
  MemoriaV4Retriever,
  MemoriaV4Builder
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

  it('correctly executes retriever parsing with MemoriaV4Retriever class', () => {
    const buffer = createMemoriaV4HeaderBuffer({
      sourceCount: 42,
      shardCount: 999,
      hashFamily: MemoriaV4HashFamily.CITYHASH64_V1,
      sections: [
        { type: MemoriaV4SectionType.GLOBAL_FILTER, offset: 192n, length: 128n },
        { type: MemoriaV4SectionType.SOURCE_TABLE, offset: 320n, length: 256n }
      ]
    });

    const retriever = new MemoriaV4Retriever(buffer);
    const sb = retriever.parseSuperblock();

    expect(sb.magic).toBe(MEMORIA_V4_MAGIC);
    expect(sb.sourceCount).toBe(42n);
    expect(sb.shardCount).toBe(999n);

    const sections = retriever.readSectionDirectory(192, 2);
    expect(sections.length).toBe(2);
    expect(sections[0].type).toBe(String(MemoriaV4SectionType.GLOBAL_FILTER));
    expect(sections[0].offset).toBe(192n);
    expect(sections[0].length).toBe(128n);

    expect(sections[1].type).toBe(String(MemoriaV4SectionType.SOURCE_TABLE));
    expect(sections[1].offset).toBe(320n);
    expect(sections[1].length).toBe(256n);
  });

  it('performs comprehensive read-after-write validation with MemoriaV4Builder and MemoriaV4Retriever', () => {
    const builder = new MemoriaV4Builder(0.0001, 100);

    // Add sources
    builder.addSource({
      sourceId: 1n,
      sourceSlug: 'source-alpha',
      sourceName: 'alpha.tah',
      sourceType: 1,
      sourcePathHash: 12345n,
      sourceContentHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01234',
      importedUnixMs: 1716578000000n,
      shardStart: 0n,
      shardCount: 2n,
      domainId: 10n,
      placeId: 100n
    });

    builder.addSource({
      sourceId: 2n,
      sourceSlug: 'source-beta',
      sourceName: 'beta.tah',
      sourceType: 2,
      sourcePathHash: 54321n,
      sourceContentHash: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a789f',
      importedUnixMs: 1716579000000n,
      shardStart: 2n,
      shardCount: 1n,
      domainId: 20n,
      placeId: 200n
    });

    // Add shards
    builder.addShard({
      shardId: 1001n,
      sourceId: 1n,
      placeId: 100n,
      domainId: 10n,
      payloadType: 1,
      compression: 0,
      qualityScore: 0.95,
      text: 'Sunset Pulse provides amazing 3D spatial properties search and NTREIS integration!'
    });

    builder.addShard({
      shardId: 1002n,
      sourceId: 1n,
      placeId: 100n,
      domainId: 10n,
      payloadType: 1,
      compression: 0,
      qualityScore: 0.88,
      text: 'Tahsin Reza is the senior security architect building modern serverless frameworks.'
    });

    builder.addShard({
      shardId: 1003n,
      sourceId: 2n,
      placeId: 200n,
      domainId: 20n,
      payloadType: 1,
      compression: 0,
      qualityScore: 0.99,
      text: 'Sunset Wars uses persistent memory cartridges for extreme performance.'
    });

    const { hat, tah } = builder.forge();

    // Verify .hat using retriever
    const retriever = new MemoriaV4Retriever(hat);
    const sb = retriever.parseSuperblock();

    expect(sb.magic).toBe(MEMORIA_V4_MAGIC);
    expect(sb.sourceCount).toBe(2n);
    expect(sb.shardCount).toBe(3n);
    expect(sb.tahByteSize).toBe(BigInt(tah.length));

    const sections = retriever.readSectionDirectory(192, 4);
    expect(sections.length).toBe(4);

    // Verify SOURCE_TABLE
    const sourceSec = sections.find(s => Number(s.type) === MemoriaV4SectionType.SOURCE_TABLE)!;
    expect(sourceSec).toBeDefined();
    expect(sourceSec.itemCount).toBe(2n);

    const sources = retriever.readSources(Number(sourceSec.offset), Number(sourceSec.itemCount));
    expect(sources.length).toBe(2);

    expect(sources[0].sourceId).toBe(1n);
    expect(sources[0].sourceSlug).toBe('source-alpha');
    expect(sources[0].sourceName).toBe('alpha.tah');
    expect(sources[0].sourceType).toBe(1);
    expect(sources[0].sourcePathHash).toBe(12345n);
    expect(sources[0].sourceContentHash).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01234');
    expect(sources[0].importedUnixMs).toBe(1716578000000n);
    expect(sources[0].shardStart).toBe(0n);
    expect(sources[0].shardCount).toBe(2n);
    expect(sources[0].domainId).toBe(10n);
    expect(sources[0].placeId).toBe(100n);

    expect(sources[1].sourceId).toBe(2n);
    expect(sources[1].sourceSlug).toBe('source-beta');
    expect(sources[1].sourceName).toBe('beta.tah');
    expect(sources[1].sourceType).toBe(2);
    expect(sources[1].sourcePathHash).toBe(54321n);
    expect(sources[1].sourceContentHash).toBe('9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a789f');
    expect(sources[1].importedUnixMs).toBe(1716579000000n);
    expect(sources[1].shardStart).toBe(2n);
    expect(sources[1].shardCount).toBe(1n);
    expect(sources[1].domainId).toBe(20n);
    expect(sources[1].placeId).toBe(200n);

    // Verify SHARD_INDEX
    const shardSec = sections.find(s => Number(s.type) === MemoriaV4SectionType.SHARD_INDEX)!;
    expect(shardSec).toBeDefined();
    expect(shardSec.itemCount).toBe(3n);

    const shards = retriever.readShardIndex(Number(shardSec.offset), Number(shardSec.itemCount));
    expect(shards.length).toBe(3);

    expect(shards[0].shardId).toBe(1001n);
    expect(shards[0].sourceId).toBe(1n);
    expect(shards[0].placeId).toBe(100n);
    expect(shards[0].domainId).toBe(10n);
    expect(shards[0].payloadType).toBe(1);
    expect(shards[0].compression).toBe(0);
    expect(shards[0].wordCount).toBe(11);
    expect(shards[0].qualityScore).toBeCloseTo(0.95);

    expect(shards[1].shardId).toBe(1002n);
    expect(shards[2].shardId).toBe(1003n);

    // Verify PAYLOAD_MAP
    const mapSec = sections.find(s => Number(s.type) === MemoriaV4SectionType.PAYLOAD_MAP)!;
    expect(mapSec).toBeDefined();
    expect(mapSec.itemCount).toBe(3n);

    const payloadMap = retriever.readPayloadMap(Number(mapSec.offset), Number(mapSec.itemCount));
    expect(payloadMap.length).toBe(3);

    expect(payloadMap[0].shardId).toBe(1001n);
    expect(payloadMap[1].shardId).toBe(1002n);
    expect(payloadMap[2].shardId).toBe(1003n);

    // Read payloads verbatim from the .tah buffer based on map offsets
    const extractText = (offset: bigint, len: bigint) => {
      const sub = tah.subarray(Number(offset), Number(offset + len));
      const stringEnd = sub.indexOf(0);
      return sub.subarray(0, stringEnd).toString('utf-8');
    };

    expect(extractText(payloadMap[0].payloadOffset, payloadMap[0].payloadLength)).toBe(
      'Sunset Pulse provides amazing 3D spatial properties search and NTREIS integration!'
    );
    expect(extractText(payloadMap[1].payloadOffset, payloadMap[1].payloadLength)).toBe(
      'Tahsin Reza is the senior security architect building modern serverless frameworks.'
    );
    expect(extractText(payloadMap[2].payloadOffset, payloadMap[2].payloadLength)).toBe(
      'Sunset Wars uses persistent memory cartridges for extreme performance.'
    );
  });

  it('builds and parses place registers inside PLACE_TABLE', () => {
    const builder = new MemoriaV4Builder(0.0001, 100);

    // Add places
    builder.addPlace({
      placeId: 1n,
      placeSlug: 'bowie',
      label: 'Bowie, Texas',
      lat: 33.559,
      lng: -97.848,
      placeType: 1,
      confidence: 100,
      coverage: 68,
      parentPlaceId: 0n
    });

    builder.addPlace({
      placeId: 2n,
      placeSlug: 'dallas',
      label: 'Dallas, Texas',
      lat: 32.7767,
      lng: -96.797,
      placeType: 6,
      confidence: 95,
      coverage: 85,
      parentPlaceId: 1n
    });

    // Add at least one source and shard to forge successfully
    builder.addSource({
      sourceId: 1n,
      sourceSlug: 'source-alpha',
      sourceName: 'alpha.tah',
      sourceType: 1,
      sourcePathHash: 12345n,
      sourceContentHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01234',
      importedUnixMs: 1716578000000n,
      shardStart: 0n,
      shardCount: 1n,
      domainId: 10n,
      placeId: 1n
    });

    builder.addShard({
      shardId: 1001n,
      sourceId: 1n,
      placeId: 1n,
      domainId: 10n,
      payloadType: 1,
      compression: 0,
      qualityScore: 0.95,
      text: 'Bowie shard text'
    });

    const { hat } = builder.forge();
    const retriever = new MemoriaV4Retriever(hat);
    const sb = retriever.parseSuperblock();

    expect(sb.placeCount).toBe(2n);

    const header = parseMemoriaV4Header(hat);
    const placeSec = header.sections.find(s => s.type === MemoriaV4SectionType.PLACE_TABLE)!;
    expect(placeSec).toBeDefined();
    expect(placeSec.itemCount).toBe(2n);

    const places = retriever.readPlaces(Number(placeSec.offset), Number(placeSec.itemCount));
    expect(places.length).toBe(2);

    expect(places[0].placeId).toBe(1n);
    expect(places[0].placeSlug).toBe('bowie');
    expect(places[0].label).toBe('Bowie, Texas');
    expect(places[0].lat).toBeCloseTo(33.559);
    expect(places[0].lng).toBeCloseTo(-97.848);
    expect(places[0].placeType).toBe(1);
    expect(places[0].confidence).toBeCloseTo(100);
    expect(places[0].coverage).toBeCloseTo(68);
    expect(places[0].parentPlaceId).toBe(0n);

    expect(places[1].placeId).toBe(2n);
    expect(places[1].placeSlug).toBe('dallas');
    expect(places[1].label).toBe('Dallas, Texas');
    expect(places[1].lat).toBeCloseTo(32.7767);
    expect(places[1].lng).toBeCloseTo(-96.797);
    expect(places[1].placeType).toBe(6);
    expect(places[1].confidence).toBeCloseTo(95);
    expect(places[1].coverage).toBeCloseTo(85);
    expect(places[1].parentPlaceId).toBe(1n);
  });
});

