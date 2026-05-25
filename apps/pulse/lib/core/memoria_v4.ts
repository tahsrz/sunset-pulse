import fs from 'fs';
import { getTahIndices } from './tah_utils';
import { extractMemoriaTerms } from './memoria_builder';

export const MEMORIA_V4_MAGIC = 0x2134564d; // MV4!
export const MEMORIA_V4_SUPPORTED_MAJOR = 4;
export const MEMORIA_V4_SUPERBLOCK_SIZE = 192;
export const MEMORIA_V4_SECTION_ENTRY_SIZE = 64;

export enum MemoriaV4SectionType {
  GLOBAL_FILTER = 1,
  SOURCE_TABLE = 2,
  SHARD_INDEX = 3,
  PAYLOAD_MAP = 4,
  DOMAIN_TABLE = 5,
  PLACE_TABLE = 6,
  TERM_STATS = 7,
  BM25_STATS = 8,
  ROUTE_TABLE = 9,
  BUILD_MANIFEST = 10,
  VECTOR_INDEX = 100,
  SPATIAL_INDEX = 101,
  COMPRESSION_DICT = 102,
  DELETION_TOMBSTONES = 103,
  SIGNATURES = 104
}

export enum MemoriaV4Compression {
  NONE = 0,
  ZSTD = 1,
  GZIP = 2,
  BROTLI = 3,
  CUSTOM = 65535
}

export enum MemoriaV4HashFamily {
  CITYHASH64_V1 = 1,
  CITYHASH128_V1 = 2,
  SHA256 = 3,
  BLAKE3 = 4
}

export class InvalidMemoriaV4Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMemoriaV4Error';
  }
}

export class UnsupportedMemoriaV4VersionError extends Error {
  constructor(public major: number, public minor: number) {
    super(`Unsupported Memoria v4 version: ${major}.${minor}`);
    this.name = 'UnsupportedMemoriaV4VersionError';
  }
}

export interface MemoriaV4Superblock {
  magic: number;
  versionMajor: number;
  versionMinor: number;
  flags: bigint;
  sectionCount: number;
  hashFamily: MemoriaV4HashFamily;
  defaultBloomK: number;
  shardCount: bigint;
  sourceCount: bigint;
  placeCount: bigint;
  buildUnixMs: bigint;
  hatByteSize: bigint;
  tahByteSize: bigint;
  headerChecksum: string;
  sectionDirectoryOffset: bigint;
}

export interface MemoriaV4SectionDirectoryEntry {
  type: MemoriaV4SectionType;
  version: number;
  compression: MemoriaV4Compression;
  flags: number;
  offset: bigint;
  length: bigint;
  itemCount: bigint;
  checksum: string;
}

export interface MemoriaV4Header {
  superblock: MemoriaV4Superblock;
  sections: MemoriaV4SectionDirectoryEntry[];
}

export interface CreateMemoriaV4HeaderOptions {
  versionMinor?: number;
  flags?: bigint;
  hashFamily?: MemoriaV4HashFamily;
  defaultBloomK?: number;
  shardCount?: bigint | number;
  sourceCount?: bigint | number;
  placeCount?: bigint | number;
  buildUnixMs?: bigint | number;
  tahByteSize?: bigint | number;
  sections?: Array<Partial<MemoriaV4SectionDirectoryEntry> & { type: MemoriaV4SectionType }>;
}

export function readMemoriaV4Header(source: string | Buffer): MemoriaV4Header {
  const buffer = Buffer.isBuffer(source) ? source : fs.readFileSync(source);
  return parseMemoriaV4Header(buffer);
}

export function parseMemoriaV4Header(buffer: Buffer): MemoriaV4Header {
  if (buffer.length < MEMORIA_V4_SUPERBLOCK_SIZE) {
    throw new InvalidMemoriaV4Error(`Memoria v4 header is too small: ${buffer.length} bytes.`);
  }

  const superblock = parseSuperblock(buffer);
  if (superblock.magic !== MEMORIA_V4_MAGIC) {
    throw new InvalidMemoriaV4Error(`Invalid Memoria v4 magic: 0x${superblock.magic.toString(16)}.`);
  }

  if (superblock.versionMajor !== MEMORIA_V4_SUPPORTED_MAJOR) {
    throw new UnsupportedMemoriaV4VersionError(superblock.versionMajor, superblock.versionMinor);
  }

  const sectionDirectoryOffset = numberFromU64(superblock.sectionDirectoryOffset, 'section directory offset');
  const sectionDirectoryLength = superblock.sectionCount * MEMORIA_V4_SECTION_ENTRY_SIZE;

  if (sectionDirectoryOffset + sectionDirectoryLength > buffer.length) {
    throw new InvalidMemoriaV4Error('Section directory exceeds available header bytes.');
  }

  const sections = parseSections(buffer, sectionDirectoryOffset, superblock.sectionCount);
  validateSections(superblock, sections);

  return {
    superblock,
    sections
  };
}

export function createMemoriaV4HeaderBuffer(options: CreateMemoriaV4HeaderOptions = {}): Buffer {
  const sections = options.sections || [
    { type: MemoriaV4SectionType.GLOBAL_FILTER },
    { type: MemoriaV4SectionType.SOURCE_TABLE },
    { type: MemoriaV4SectionType.SHARD_INDEX },
    { type: MemoriaV4SectionType.PAYLOAD_MAP }
  ];
  const sectionDirectoryOffset = BigInt(MEMORIA_V4_SUPERBLOCK_SIZE);
  const hatByteSize = BigInt(MEMORIA_V4_SUPERBLOCK_SIZE + sections.length * MEMORIA_V4_SECTION_ENTRY_SIZE);
  const buffer = Buffer.alloc(Number(hatByteSize), 0);

  buffer.writeUInt32LE(MEMORIA_V4_MAGIC, 0);
  buffer.writeUInt16LE(MEMORIA_V4_SUPPORTED_MAJOR, 4);
  buffer.writeUInt16LE(options.versionMinor || 0, 6);
  buffer.writeBigUInt64LE(options.flags || 0n, 8);
  buffer.writeUInt32LE(sections.length, 16);
  buffer.writeUInt16LE(options.hashFamily || MemoriaV4HashFamily.CITYHASH64_V1, 20);
  buffer.writeUInt16LE(options.defaultBloomK || 14, 22);
  buffer.writeBigUInt64LE(toBigUInt64(options.shardCount || 0), 24);
  buffer.writeBigUInt64LE(toBigUInt64(options.sourceCount || 0), 32);
  buffer.writeBigUInt64LE(toBigUInt64(options.placeCount || 0), 40);
  buffer.writeBigUInt64LE(toBigUInt64(options.buildUnixMs || Date.now()), 48);
  buffer.writeBigUInt64LE(hatByteSize, 56);
  buffer.writeBigUInt64LE(toBigUInt64(options.tahByteSize || 0), 64);
  buffer.writeBigUInt64LE(sectionDirectoryOffset, 88);

  sections.forEach((section, index) => {
    const offset = Number(sectionDirectoryOffset) + index * MEMORIA_V4_SECTION_ENTRY_SIZE;
    buffer.writeUInt16LE(section.type, offset);
    buffer.writeUInt16LE(section.version || 1, offset + 2);
    buffer.writeUInt16LE(section.compression ?? MemoriaV4Compression.NONE, offset + 4);
    buffer.writeUInt16LE(section.flags || 0, offset + 6);
    buffer.writeBigUInt64LE(toBigUInt64(section.offset || 0), offset + 8);
    buffer.writeBigUInt64LE(toBigUInt64(section.length || 0), offset + 16);
    buffer.writeBigUInt64LE(toBigUInt64(section.itemCount || 0), offset + 24);
    if (section.checksum) {
      Buffer.from(section.checksum.padEnd(32, '0').slice(0, 32), 'hex').copy(buffer, offset + 32, 0, 16);
    }
  });

  return buffer;
}

export function isMemoriaV4(buffer: Buffer) {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === MEMORIA_V4_MAGIC;
}

function parseSuperblock(buffer: Buffer): MemoriaV4Superblock {
  return {
    magic: buffer.readUInt32LE(0),
    versionMajor: buffer.readUInt16LE(4),
    versionMinor: buffer.readUInt16LE(6),
    flags: buffer.readBigUInt64LE(8),
    sectionCount: buffer.readUInt32LE(16),
    hashFamily: buffer.readUInt16LE(20),
    defaultBloomK: buffer.readUInt16LE(22),
    shardCount: buffer.readBigUInt64LE(24),
    sourceCount: buffer.readBigUInt64LE(32),
    placeCount: buffer.readBigUInt64LE(40),
    buildUnixMs: buffer.readBigUInt64LE(48),
    hatByteSize: buffer.readBigUInt64LE(56),
    tahByteSize: buffer.readBigUInt64LE(64),
    headerChecksum: buffer.subarray(72, 88).toString('hex'),
    sectionDirectoryOffset: buffer.readBigUInt64LE(88)
  };
}

function parseSections(buffer: Buffer, offset: number, count: number): MemoriaV4SectionDirectoryEntry[] {
  const sections: MemoriaV4SectionDirectoryEntry[] = [];

  for (let index = 0; index < count; index++) {
    const entryOffset = offset + index * MEMORIA_V4_SECTION_ENTRY_SIZE;
    sections.push({
      type: buffer.readUInt16LE(entryOffset),
      version: buffer.readUInt16LE(entryOffset + 2),
      compression: buffer.readUInt16LE(entryOffset + 4),
      flags: buffer.readUInt16LE(entryOffset + 6),
      offset: buffer.readBigUInt64LE(entryOffset + 8),
      length: buffer.readBigUInt64LE(entryOffset + 16),
      itemCount: buffer.readBigUInt64LE(entryOffset + 24),
      checksum: buffer.subarray(entryOffset + 32, entryOffset + 48).toString('hex')
    });
  }

  return sections;
}

function validateSections(superblock: MemoriaV4Superblock, sections: MemoriaV4SectionDirectoryEntry[]) {
  const declaredHatBytes = numberFromU64(superblock.hatByteSize, 'hat byte size');

  for (const section of sections) {
    const sectionOffset = numberFromU64(section.offset, 'section offset');
    const sectionLength = numberFromU64(section.length, 'section length');
    if (sectionLength === 0) continue;

    if (sectionOffset < MEMORIA_V4_SUPERBLOCK_SIZE) {
      throw new InvalidMemoriaV4Error(`Section ${section.type} starts inside the superblock.`);
    }

    if (sectionOffset + sectionLength > declaredHatBytes) {
      throw new InvalidMemoriaV4Error(`Section ${section.type} exceeds declared .hat byte size.`);
    }
  }
}

function toBigUInt64(value: bigint | number) {
  const next = BigInt(value);
  if (next < 0n || next > 0xffffffffffffffffn) {
    throw new RangeError(`Value does not fit in u64: ${value.toString()}`);
  }
  return next;
}

function numberFromU64(value: bigint, label: string) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InvalidMemoriaV4Error(`${label} exceeds JavaScript safe integer range.`);
  }
  return Number(value);
}

export interface SectionEntry {
  type: string;
  version: number;
  offset: bigint;
  length: bigint;
  itemCount: bigint;
  compressionMode: number;
}

export class MemoriaV4Retriever {
  private hatBuffer: Buffer;

  constructor(hatBuffer: Buffer) {
    this.hatBuffer = hatBuffer;
  }

  public parseSuperblock(): MemoriaV4Superblock {
    const magic = this.hatBuffer.readUInt32LE(0);
    if (magic !== MEMORIA_V4_MAGIC && magic !== 0x54414834) {
      throw new Error("Invalid format or unsupported Memoria version.");
    }
    return parseSuperblock(this.hatBuffer);
  }

  public readSectionDirectory(offset: number, count: number): SectionEntry[] {
    const parsedSections = parseSections(this.hatBuffer, offset, count);
    return parsedSections.map(section => ({
      type: String(section.type),
      version: section.version,
      offset: section.offset,
      length: section.length,
      itemCount: section.itemCount,
      compressionMode: section.compression
    }));
  }

  public readSources(offset: number, count: number): MemoriaV4SourceInput[] {
    const sources: MemoriaV4SourceInput[] = [];
    for (let index = 0; index < count; index++) {
      const srcOffset = offset + index * 164;
      if (srcOffset + 164 > this.hatBuffer.length) {
        throw new Error('Read bounds exceed available buffer size during SOURCE_TABLE parsing.');
      }
      const sourceId = this.hatBuffer.readBigUInt64LE(srcOffset);
      const sourceSlug = this.hatBuffer.subarray(srcOffset + 8, srcOffset + 40).toString('ascii').replace(/\0/g, '');
      const sourceName = this.hatBuffer.subarray(srcOffset + 40, srcOffset + 72).toString('ascii').replace(/\0/g, '');
      const sourceType = this.hatBuffer.readUInt16LE(srcOffset + 72);
      const sourcePathHash = this.hatBuffer.readBigUInt64LE(srcOffset + 74);
      const sourceContentHash = this.hatBuffer.subarray(srcOffset + 82, srcOffset + 114).toString('hex');
      const importedUnixMs = this.hatBuffer.readBigUInt64LE(srcOffset + 114);
      const shardStart = this.hatBuffer.readBigUInt64LE(srcOffset + 122);
      const shardCount = this.hatBuffer.readBigUInt64LE(srcOffset + 130);
      const domainId = this.hatBuffer.readBigUInt64LE(srcOffset + 138);
      const placeId = this.hatBuffer.readBigUInt64LE(srcOffset + 146);

      sources.push({
        sourceId,
        sourceSlug,
        sourceName,
        sourceType,
        sourcePathHash,
        sourceContentHash,
        importedUnixMs,
        shardStart,
        shardCount,
        domainId,
        placeId
      });
    }
    return sources;
  }

  public readShardIndex(offset: number, count: number) {
    const shards: Array<Omit<MemoriaV4ShardInput, 'text'> & { payloadOffset: bigint; payloadLength: bigint; wordCount: number }> = [];
    for (let index = 0; index < count; index++) {
      const shardOffset = offset + index * 80;
      if (shardOffset + 80 > this.hatBuffer.length) {
        throw new Error('Read bounds exceed available buffer size during SHARD_INDEX parsing.');
      }
      const shardId = this.hatBuffer.readBigUInt64LE(shardOffset);
      const sourceId = this.hatBuffer.readBigUInt64LE(shardOffset + 8);
      const placeId = this.hatBuffer.readBigUInt64LE(shardOffset + 16);
      const domainId = this.hatBuffer.readBigUInt64LE(shardOffset + 24);
      const payloadOffset = this.hatBuffer.readBigUInt64LE(shardOffset + 32);
      const payloadLength = this.hatBuffer.readBigUInt64LE(shardOffset + 40);
      const payloadType = this.hatBuffer.readUInt16LE(shardOffset + 48);
      const compression = this.hatBuffer.readUInt16LE(shardOffset + 50);
      const wordCount = this.hatBuffer.readUInt32LE(shardOffset + 52);
      const qualityScore = this.hatBuffer.readFloatLE(shardOffset + 56);

      shards.push({
        shardId,
        sourceId,
        placeId,
        domainId,
        payloadOffset,
        payloadLength,
        payloadType,
        compression,
        wordCount,
        qualityScore
      });
    }
    return shards;
  }

  public readPayloadMap(offset: number, count: number) {
    const payloadMaps: Array<{ shardId: bigint; payloadOffset: bigint; payloadLength: bigint }> = [];
    for (let index = 0; index < count; index++) {
      const pmOffset = offset + index * 32;
      if (pmOffset + 32 > this.hatBuffer.length) {
        throw new Error('Read bounds exceed available buffer size during PAYLOAD_MAP parsing.');
      }
      const shardId = this.hatBuffer.readBigUInt64LE(pmOffset);
      const payloadOffset = this.hatBuffer.readBigUInt64LE(pmOffset + 8);
      const payloadLength = this.hatBuffer.readBigUInt64LE(pmOffset + 16);

      payloadMaps.push({
        shardId,
        payloadOffset,
        payloadLength
      });
    }
    return payloadMaps;
  }

  public readPlaces(offset: number, count: number): MemoriaV4PlaceInput[] {
    const places: MemoriaV4PlaceInput[] = [];
    for (let index = 0; index < count; index++) {
      const pOffset = offset + index * 128;
      if (pOffset + 128 > this.hatBuffer.length) {
        throw new Error('Read bounds exceed available buffer size during PLACE_TABLE parsing.');
      }
      const placeId = this.hatBuffer.readBigUInt64LE(pOffset);
      const placeSlug = this.hatBuffer.subarray(pOffset + 8, pOffset + 40).toString('ascii').replace(/\0/g, '');
      const label = this.hatBuffer.subarray(pOffset + 40, pOffset + 72).toString('utf-8').replace(/\0/g, '');
      const lat = this.hatBuffer.readDoubleLE(pOffset + 72);
      const lng = this.hatBuffer.readDoubleLE(pOffset + 80);
      const placeType = this.hatBuffer.readUInt16LE(pOffset + 88);
      const confidence = this.hatBuffer.readFloatLE(pOffset + 90);
      const coverage = this.hatBuffer.readFloatLE(pOffset + 94);
      const parentPlaceId = this.hatBuffer.readBigUInt64LE(pOffset + 98);

      places.push({
        placeId,
        placeSlug,
        label,
        lat,
        lng,
        placeType,
        confidence,
        coverage,
        parentPlaceId
      });
    }
    return places;
  }
}

export interface MemoriaV4PlaceInput {
  placeId: bigint;
  placeSlug: string;
  label: string;
  lat: number;
  lng: number;
  placeType: number;
  confidence: number;
  coverage: number;
  parentPlaceId: bigint;
  region?: string;
  physicalAnchor?: string;
  stage?: string;
}

export interface MemoriaV4SourceInput {
  sourceId: bigint;
  sourceSlug: string;
  sourceName: string;
  sourceType: number;
  sourcePathHash: bigint;
  sourceContentHash: string; // 32-byte hex string (sha256)
  importedUnixMs: bigint;
  shardStart: bigint;
  shardCount: bigint;
  domainId: bigint;
  placeId: bigint;
}

export interface MemoriaV4ShardInput {
  shardId: bigint;
  sourceId: bigint;
  placeId: bigint;
  domainId: bigint;
  payloadType: number;
  compression: number;
  qualityScore: number;
  text: string;
}

export class MemoriaV4Builder {
  private sources: MemoriaV4SourceInput[] = [];
  private shards: MemoriaV4ShardInput[] = [];
  private places: MemoriaV4PlaceInput[] = [];
  private targetFalsePositiveRate: number;
  private expectedElements: number;
  private m: bigint;
  private k: number;
  private globalBloom: Buffer;

  constructor(targetFalsePositiveRate = 0.0001, expectedElements = 5000) {
    this.targetFalsePositiveRate = targetFalsePositiveRate;
    this.expectedElements = expectedElements;

    const n = Math.max(1, Math.floor(expectedElements));
    const mFloat = -(n * Math.log(targetFalsePositiveRate)) / Math.pow(Math.log(2), 2);
    this.m = BigInt(Math.ceil(mFloat / 8) * 8);
    this.k = Math.max(1, Math.ceil((Number(this.m) / n) * Math.log(2)));
    this.globalBloom = Buffer.alloc(Number(this.m / 8n), 0);
  }

  public addSource(source: MemoriaV4SourceInput) {
    this.sources.push(source);
  }

  public addPlace(place: MemoriaV4PlaceInput) {
    this.places.push(place);
  }

  public addShard(shard: MemoriaV4ShardInput) {
    this.shards.push(shard);
  }

  public forge(): { hat: Buffer; tah: Buffer } {
    // 1. Compile Global Bloom Filter
    this.shards.forEach(shard => {
      const terms = extractMemoriaTerms(shard.text);
      terms.forEach(term => {
        const indices = getTahIndices(term, this.m, this.k);
        indices.forEach(idx => {
          const byteIdx = Number(idx / 8n);
          const bitIdx = Number(idx % 8n);
          if (byteIdx >= 0 && byteIdx < this.globalBloom.length) {
            this.globalBloom[byteIdx] |= (1 << bitIdx);
          }
        });
      });
    });

    // 2. Prepare .tah payload store and Shard metadata
    let currentPayloadOffset = 0;
    const shardPayloads: Buffer[] = [];
    const shardIndexEntries: Array<{
      shardId: bigint;
      sourceId: bigint;
      placeId: bigint;
      domainId: bigint;
      payloadOffset: bigint;
      payloadLength: bigint;
      payloadType: number;
      compression: number;
      wordCount: number;
      qualityScore: number;
    }> = [];

    this.shards.forEach(shard => {
      const cleanText = shard.text
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const payloadData = Buffer.concat([Buffer.from(cleanText, 'utf-8'), Buffer.from([0, 0])]);
      const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

      shardPayloads.push(payloadData);
      shardIndexEntries.push({
        shardId: shard.shardId,
        sourceId: shard.sourceId,
        placeId: shard.placeId,
        domainId: shard.domainId,
        payloadOffset: BigInt(currentPayloadOffset),
        payloadLength: BigInt(payloadData.length),
        payloadType: shard.payloadType,
        compression: shard.compression,
        wordCount,
        qualityScore: shard.qualityScore
      });

      currentPayloadOffset += payloadData.length;
    });

    const tah = Buffer.concat(shardPayloads);

    // 3. Serialize required sections contents
    // Section 2: SOURCE_TABLE
    const sourceTableBuffer = Buffer.alloc(this.sources.length * 164, 0);
    this.sources.forEach((src, idx) => {
      const rowOffset = idx * 164;
      sourceTableBuffer.writeBigUInt64LE(src.sourceId, rowOffset);
      
      const slugBuf = Buffer.alloc(32, 0);
      slugBuf.write(src.sourceSlug.slice(0, 31), 'ascii');
      slugBuf.copy(sourceTableBuffer, rowOffset + 8);

      const nameBuf = Buffer.alloc(32, 0);
      nameBuf.write(src.sourceName.slice(0, 31), 'ascii');
      nameBuf.copy(sourceTableBuffer, rowOffset + 40);

      sourceTableBuffer.writeUInt16LE(src.sourceType, rowOffset + 72);
      sourceTableBuffer.writeBigUInt64LE(src.sourcePathHash, rowOffset + 74);

      const hashBuf = Buffer.alloc(32, 0);
      if (src.sourceContentHash) {
        Buffer.from(src.sourceContentHash.padEnd(64, '0').slice(0, 64), 'hex').copy(hashBuf, 0, 0, 32);
      }
      hashBuf.copy(sourceTableBuffer, rowOffset + 82);

      sourceTableBuffer.writeBigUInt64LE(src.importedUnixMs, rowOffset + 114);
      sourceTableBuffer.writeBigUInt64LE(src.shardStart, rowOffset + 122);
      sourceTableBuffer.writeBigUInt64LE(src.shardCount, rowOffset + 130);
      sourceTableBuffer.writeBigUInt64LE(src.domainId, rowOffset + 138);
      sourceTableBuffer.writeBigUInt64LE(src.placeId, rowOffset + 146);
    });

    // Section 3: SHARD_INDEX
    const shardIndexBuffer = Buffer.alloc(this.shards.length * 80, 0);
    shardIndexEntries.forEach((shard, idx) => {
      const rowOffset = idx * 80;
      shardIndexBuffer.writeBigUInt64LE(shard.shardId, rowOffset);
      shardIndexBuffer.writeBigUInt64LE(shard.sourceId, rowOffset + 8);
      shardIndexBuffer.writeBigUInt64LE(shard.placeId, rowOffset + 16);
      shardIndexBuffer.writeBigUInt64LE(shard.domainId, rowOffset + 24);
      shardIndexBuffer.writeBigUInt64LE(shard.payloadOffset, rowOffset + 32);
      shardIndexBuffer.writeBigUInt64LE(shard.payloadLength, rowOffset + 40);
      shardIndexBuffer.writeUInt16LE(shard.payloadType, rowOffset + 48);
      shardIndexBuffer.writeUInt16LE(shard.compression, rowOffset + 50);
      shardIndexBuffer.writeUInt32LE(shard.wordCount, rowOffset + 52);
      shardIndexBuffer.writeFloatLE(shard.qualityScore, rowOffset + 56);
      shardIndexBuffer.writeUInt32LE(0, rowOffset + 60); // local_filter_ref
      shardIndexBuffer.writeUInt32LE(0, rowOffset + 64); // bm25_ref
    });

    // Section 4: PAYLOAD_MAP
    const payloadMapBuffer = Buffer.alloc(this.shards.length * 32, 0);
    shardIndexEntries.forEach((shard, idx) => {
      const rowOffset = idx * 32;
      payloadMapBuffer.writeBigUInt64LE(shard.shardId, rowOffset);
      payloadMapBuffer.writeBigUInt64LE(shard.payloadOffset, rowOffset + 8);
      payloadMapBuffer.writeBigUInt64LE(shard.payloadLength, rowOffset + 16);
    });

    // Section 6: PLACE_TABLE
    let placeTableBuffer: Buffer | null = null;
    let ptOffset = 0n;
    let ptLength = 0n;

    if (this.places.length > 0) {
      placeTableBuffer = Buffer.alloc(this.places.length * 128, 0);
      this.places.forEach((place, idx) => {
        const rowOffset = idx * 128;
        placeTableBuffer!.writeBigUInt64LE(place.placeId, rowOffset);
        
        const slugBuf = Buffer.alloc(32, 0);
        slugBuf.write(place.placeSlug.slice(0, 31), 'ascii');
        slugBuf.copy(placeTableBuffer!, rowOffset + 8);

        const labelBuf = Buffer.alloc(32, 0);
        labelBuf.write(place.label.slice(0, 31), 'utf-8');
        labelBuf.copy(placeTableBuffer!, rowOffset + 40);

        placeTableBuffer!.writeDoubleLE(place.lat, rowOffset + 72);
        placeTableBuffer!.writeDoubleLE(place.lng, rowOffset + 80);
        placeTableBuffer!.writeUInt16LE(place.placeType, rowOffset + 88);
        placeTableBuffer!.writeFloatLE(place.confidence, rowOffset + 90);
        placeTableBuffer!.writeFloatLE(place.coverage, rowOffset + 94);
        placeTableBuffer!.writeBigUInt64LE(place.parentPlaceId, rowOffset + 98);
      });
    }

    // 4. Calculate table layouts and offset locations
    const activeSectionsCount = placeTableBuffer ? 5 : 4;
    const sectionDirectorySize = BigInt(activeSectionsCount * 64);
    const gfOffset = 192n + sectionDirectorySize;
    const gfLength = BigInt(this.globalBloom.length);

    const stOffset = gfOffset + gfLength;
    const stLength = BigInt(sourceTableBuffer.length);

    const siOffset = stOffset + stLength;
    const siLength = BigInt(shardIndexBuffer.length);

    const pmOffset = siOffset + siLength;
    const pmLength = BigInt(payloadMapBuffer.length);

    let currentOffset = pmOffset + pmLength;

    if (placeTableBuffer) {
      ptOffset = currentOffset;
      ptLength = BigInt(placeTableBuffer.length);
      currentOffset += ptLength;
    }

    const hatByteSize = currentOffset;

    const hat = Buffer.alloc(Number(hatByteSize), 0);

    // 5. Serialize Superblock (192 bytes)
    const activeSections = [
      { type: MemoriaV4SectionType.GLOBAL_FILTER, offset: gfOffset, length: gfLength, count: 1n },
      { type: MemoriaV4SectionType.SOURCE_TABLE, offset: stOffset, length: stLength, count: BigInt(this.sources.length) },
      { type: MemoriaV4SectionType.SHARD_INDEX, offset: siOffset, length: siLength, count: BigInt(this.shards.length) },
      { type: MemoriaV4SectionType.PAYLOAD_MAP, offset: pmOffset, length: pmLength, count: BigInt(this.shards.length) }
    ];

    if (placeTableBuffer) {
      activeSections.push({
        type: MemoriaV4SectionType.PLACE_TABLE,
        offset: ptOffset,
        length: ptLength,
        count: BigInt(this.places.length)
      });
    }

    hat.writeUInt32LE(MEMORIA_V4_MAGIC, 0);
    hat.writeUInt16LE(MEMORIA_V4_SUPPORTED_MAJOR, 4);
    hat.writeUInt16LE(0, 6); // versionMinor
    hat.writeBigUInt64LE(0n, 8); // flags
    hat.writeUInt32LE(activeSections.length, 16); // sectionCount
    hat.writeUInt16LE(MemoriaV4HashFamily.CITYHASH64_V1, 20);
    hat.writeUInt16LE(this.k, 22); // defaultBloomK
    hat.writeBigUInt64LE(BigInt(this.shards.length), 24); // shardCount
    hat.writeBigUInt64LE(BigInt(this.sources.length), 32); // sourceCount
    hat.writeBigUInt64LE(BigInt(this.places.length), 40); // placeCount
    hat.writeBigUInt64LE(BigInt(Date.now()), 48); // buildUnixMs
    hat.writeBigUInt64LE(hatByteSize, 56); // hatByteSize
    hat.writeBigUInt64LE(BigInt(tah.length), 64); // tahByteSize
    hat.writeBigUInt64LE(192n, 88); // sectionDirectoryOffset

    // 6. Serialize Section Directory
    const writeSectionEntry = (type: number, offset: bigint, length: bigint, itemCount: bigint, entryOffset: number) => {
      hat.writeUInt16LE(type, entryOffset);
      hat.writeUInt16LE(1, entryOffset + 2); // version
      hat.writeUInt16LE(MemoriaV4Compression.NONE, entryOffset + 4);
      hat.writeUInt16LE(0, entryOffset + 6); // flags
      hat.writeBigUInt64LE(offset, entryOffset + 8);
      hat.writeBigUInt64LE(length, entryOffset + 16);
      hat.writeBigUInt64LE(itemCount, entryOffset + 24);
    };

    activeSections.forEach((sec, idx) => {
      writeSectionEntry(sec.type, sec.offset, sec.length, sec.count, 192 + idx * 64);
    });

    // 7. Write compiled section contents
    this.globalBloom.copy(hat, Number(gfOffset));
    sourceTableBuffer.copy(hat, Number(stOffset));
    shardIndexBuffer.copy(hat, Number(siOffset));
    payloadMapBuffer.copy(hat, Number(pmOffset));
    if (placeTableBuffer) {
      placeTableBuffer.copy(hat, Number(ptOffset));
    }

    return { hat, tah };
  }
}
