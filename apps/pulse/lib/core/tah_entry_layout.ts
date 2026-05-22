import { Buffer } from 'node:buffer';

export const TAH_ENTRY_SIZE = 80;
export const TAH_ENTRY_HEADER_SIZE = 24;
export const TAH_ENTRY_SPEC_SIZE = 56;
export const TAH_ENTRY_PAD_SIZE = 7;
export const TAH_SPEC_V1_PAYLOAD_SIZE = 52;

export interface TahSpecV1 {
  kind: number;
  version: number;
  flags: number;
  payload?: Buffer | Uint8Array | string;
}

export interface TahEntry {
  tag: number;
  pad?: Buffer | Uint8Array;
  offset: bigint | number;
  length: number;
  meta: number;
  spec: TahSpecV1 | Buffer | Uint8Array;
}

export interface DecodedTahEntry {
  tag: number;
  pad: Buffer;
  offset: bigint;
  length: number;
  meta: number;
  spec: TahSpecV1;
  rawSpec: Buffer;
}

export function encodeTahSpecV1(spec: TahSpecV1): Buffer {
  assertUInt('spec.kind', spec.kind, 0xff);
  assertUInt('spec.version', spec.version, 0xff);
  assertUInt('spec.flags', spec.flags, 0xffff);

  const out = Buffer.alloc(TAH_ENTRY_SPEC_SIZE);
  out.writeUInt8(spec.kind, 0);
  out.writeUInt8(spec.version, 1);
  out.writeUInt16LE(spec.flags, 2);
  toFixedBuffer(spec.payload ?? Buffer.alloc(0), TAH_SPEC_V1_PAYLOAD_SIZE, 'spec.payload').copy(out, 4);
  return out;
}

export function decodeTahSpecV1(bytes: Uint8Array): TahSpecV1 {
  const spec = toExactBuffer(bytes, TAH_ENTRY_SPEC_SIZE, 'spec');
  return {
    kind: spec.readUInt8(0),
    version: spec.readUInt8(1),
    flags: spec.readUInt16LE(2),
    payload: spec.subarray(4, TAH_ENTRY_SPEC_SIZE)
  };
}

export function encodeTahEntry(entry: TahEntry): Buffer {
  assertUInt('entry.tag', entry.tag, 0xff);
  assertUInt('entry.length', entry.length, 0xffffffff);
  assertUInt('entry.meta', entry.meta, 0xffffffff);

  const offset = BigInt(entry.offset);
  if (offset < 0n || offset > 0xffffffffffffffffn) {
    throw new RangeError('entry.offset must be an unsigned 64-bit integer');
  }

  const out = Buffer.alloc(TAH_ENTRY_SIZE);
  const pad = entry.pad
    ? toExactBuffer(entry.pad, TAH_ENTRY_PAD_SIZE, 'entry.pad')
    : Buffer.alloc(TAH_ENTRY_PAD_SIZE);
  const spec = entry.spec instanceof Uint8Array
    ? toExactBuffer(entry.spec, TAH_ENTRY_SPEC_SIZE, 'entry.spec')
    : encodeTahSpecV1(entry.spec);

  out.writeUInt8(entry.tag, 0);
  pad.copy(out, 1);
  out.writeBigUInt64LE(offset, 8);
  out.writeUInt32LE(entry.length, 16);
  out.writeUInt32LE(entry.meta, 20);
  spec.copy(out, TAH_ENTRY_HEADER_SIZE);
  return out;
}

export function decodeTahEntry(bytes: Uint8Array): DecodedTahEntry {
  const entry = toExactBuffer(bytes, TAH_ENTRY_SIZE, 'entry');
  const rawSpec = entry.subarray(TAH_ENTRY_HEADER_SIZE, TAH_ENTRY_SIZE);

  return {
    tag: entry.readUInt8(0),
    pad: entry.subarray(1, 8),
    offset: entry.readBigUInt64LE(8),
    length: entry.readUInt32LE(16),
    meta: entry.readUInt32LE(20),
    spec: decodeTahSpecV1(rawSpec),
    rawSpec
  };
}

function assertUInt(name: string, value: number, max: number) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${name} must be an unsigned integer <= ${max}`);
  }
}

function toFixedBuffer(value: Buffer | Uint8Array | string, size: number, label: string): Buffer {
  const source = typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
  if (source.length > size) {
    throw new RangeError(`${label} must be ${size} bytes or less`);
  }

  const out = Buffer.alloc(size);
  source.copy(out);
  return out;
}

function toExactBuffer(value: Uint8Array, size: number, label: string): Buffer {
  const source = Buffer.from(value);
  if (source.length !== size) {
    throw new RangeError(`${label} must be exactly ${size} bytes`);
  }
  return source;
}
