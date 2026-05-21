import fs from 'fs';

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
