import fs from 'fs';
import path from 'path';
import { getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import type { PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { resolvePairedTahPath } from '@/lib/ai/brain/cartridge_metadata';
import { TAHInput } from './tah_builder';
import { TAHRetriever } from './tah_retriever';
import { extractMemoriaTerms, segmentTextForMemoria } from './memoria_builder';

export interface ExtractedTextShard {
  source: string;
  text: string;
  meta?: number;
}

export interface UploadedCartridgeFile {
  name: string;
  contentBase64: string;
}

const MAX_INDEXED_SHARDS = 2500;

export function createTahInputsFromText(text: string, keywords: string[] = []): TAHInput[] {
  return segmentTextForMemoria(text, 1000).map((segment, index) => {
    const segmentKeywords = [
      ...keywords,
      ...extractMemoriaTerms(segment).slice(0, 8)
    ].filter(Boolean);

    return {
      keywords: uniqueStrings(segmentKeywords.length ? segmentKeywords : [`shard ${index + 1}`]),
      data: segment
    };
  });
}

export function extractTextShardsFromCartridge(cartridge: PulseCartridge): ExtractedTextShard[] {
  const label = getCartridgeSearchQuery(cartridge) || cartridge.title || cartridge.name;

  if (cartridge.type === 'hat') {
    return extractTextShardsFromMemoriaPair(
      fs.readFileSync(cartridge.path),
      fs.readFileSync(resolvePairedTahPath(cartridge.path)),
      label
    );
  }

  return extractTextShardsFromTahBuffer(fs.readFileSync(cartridge.path), label);
}

export function extractTextShardsFromUploads(files: UploadedCartridgeFile[]): ExtractedTextShard[] {
  const buffers = files.map(file => ({
    name: path.basename(file.name),
    buffer: Buffer.from(file.contentBase64, 'base64')
  }));
  const byName = new Map(buffers.map(file => [file.name.toLowerCase(), file]));
  const processed = new Set<string>();
  const shards: ExtractedTextShard[] = [];

  for (const file of buffers) {
    const lowerName = file.name.toLowerCase();
    if (processed.has(lowerName)) continue;

    if (lowerName.endsWith('.hat')) {
      const tahName = pairedTahName(file.name).toLowerCase();
      const tahFile = byName.get(tahName);
      if (tahFile) {
        shards.push(...extractTextShardsFromMemoriaPair(file.buffer, tahFile.buffer, file.name));
        processed.add(lowerName);
        processed.add(tahName);
        continue;
      }
    }

    if (lowerName.endsWith('.tah')) {
      const hatName = pairedHatName(file.name).toLowerCase();
      if (byName.has(hatName)) continue;
    }

    shards.push(...extractTextShardsFromTahBuffer(file.buffer, file.name));
    processed.add(lowerName);
  }

  return shards;
}

export function extractTextShardsFromTahBuffer(buffer: Buffer, source: string): ExtractedTextShard[] {
  if (isIndexedTah(buffer)) {
    try {
      const retriever = new TAHRetriever(buffer);
      const shardCount = Math.min(buffer.readUInt32LE(16), MAX_INDEXED_SHARDS);
      const shards: ExtractedTextShard[] = [];

      for (let index = 0; index < shardCount; index++) {
        const shard = retriever.getShard(index);
        const text = cleanExtractedText(shard?.data || '');
        if (text) shards.push({ source, text, meta: countWords(text) });
      }

      if (shards.length) return shards;
    } catch {
      // Fall through to raw-text ingestion for malformed or unsupported files.
    }
  }

  const rawText = cleanExtractedText(buffer.toString('utf-8'));
  return segmentTextForMemoria(rawText, 1200).map(text => ({
    source,
    text,
    meta: countWords(text)
  }));
}

export function extractTextShardsFromMemoriaPair(hatBuffer: Buffer, tahBuffer: Buffer, source: string): ExtractedTextShard[] {
  if (hatBuffer.length < 64) return [];

  const magic = hatBuffer.readUInt32LE(0);
  if (magic !== 0x54414821 && magic !== 0x48415421) return [];

  const bloomBits = hatBuffer.readBigUInt64LE(8);
  const shardCount = Math.min(hatBuffer.readUInt32LE(16), MAX_INDEXED_SHARDS);
  const bloomByteSize = Number((bloomBits + 7n) / 8n);
  const indexOffset = 64 + bloomByteSize;
  const shards: ExtractedTextShard[] = [];

  for (let index = 0; index < shardCount; index++) {
    const entryOffset = indexOffset + index * 80;
    if (entryOffset + 80 > hatBuffer.length) break;

    const tag = hatBuffer.readUInt8(entryOffset);
    if (tag !== 0) continue;

    const offset = Number(hatBuffer.readBigUInt64LE(entryOffset + 8));
    const length = hatBuffer.readUInt32LE(entryOffset + 16);
    const meta = hatBuffer.readUInt32LE(entryOffset + 20);
    if (offset < 0 || length <= 0 || offset + length > tahBuffer.length) continue;

    const text = cleanExtractedText(tahBuffer.slice(offset, offset + length).toString('utf-8'));
    if (text) shards.push({ source, text, meta });
  }

  return shards;
}

export function cleanExtractedText(text: string) {
  return text
    .replace(/\0+$/g, '')
    .replace(/\0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isIndexedTah(buffer: Buffer) {
  if (buffer.length < 64) return false;
  if (buffer.readUInt32LE(0) !== 0x54414821) return false;

  const bloomBits = buffer.readBigUInt64LE(8);
  const shardCount = buffer.readUInt32LE(16);
  const bloomByteSize = Number((bloomBits + 7n) / 8n);
  const indexEnd = 64 + bloomByteSize + shardCount * 80;

  return shardCount >= 0 && shardCount < 100000 && indexEnd <= buffer.length;
}

function pairedTahName(fileName: string) {
  if (fileName.toLowerCase().endsWith('.tah.hat')) {
    return `${fileName.slice(0, -8)}.tah.tah`;
  }

  return `${fileName.slice(0, -4)}.tah`;
}

function pairedHatName(fileName: string) {
  if (fileName.toLowerCase().endsWith('.tah.tah')) {
    return `${fileName.slice(0, -8)}.tah.hat`;
  }

  return `${fileName.slice(0, -4)}.hat`;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
