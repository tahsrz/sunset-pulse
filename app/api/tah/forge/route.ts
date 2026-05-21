import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { getPulseCartridge } from '@/lib/ai/brain/pulse_query';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { TAHBuilder } from '@/lib/core/tah_builder';
import { buildMemoriaPair } from '@/lib/core/memoria_builder';
import {
  ExtractedTextShard,
  UploadedCartridgeFile,
  createTahInputsFromText,
  extractTextShardsFromCartridge,
  extractTextShardsFromUploads
} from '@/lib/core/tah_ingest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ForgeRequest = {
  mode?: 'tah' | 'memoria';
  name?: string;
  text?: string;
  keywords?: string[] | string;
  slugs?: string[];
  files?: UploadedCartridgeFile[];
};

const MAX_TEXT_CHARS = 2_000_000;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_FILES = 48;
const MAX_MEMORIA_SHARDS = 5000;

export async function POST(request: NextRequest) {
  let body: ForgeRequest;

  try {
    body = await request.json();
  } catch (error: any) {
    return errorResponse('Invalid forge request body.', 400, error.message);
  }

  try {
    if (body.mode === 'tah') return forgeTahFromText(body);
    if (body.mode === 'memoria') return forgeMemoria(body);
    return errorResponse('Forge mode must be tah or memoria.', 400);
  } catch (error: any) {
    return errorResponse('TAH forge failed.', 500, error.message);
  }
}

function forgeTahFromText(body: ForgeRequest) {
  const text = normalizeText(body.text);
  if (!text) return errorResponse('Text is required to create a TAH cartridge.', 400);

  const inputs = createTahInputsFromText(text, normalizeKeywords(body.keywords));
  if (!inputs.length) return errorResponse('Text did not produce any usable shards.', 400);

  const outputDir = resolveOutputDir();
  const baseName = uniqueBaseName(outputDir, safeBaseName(body.name, 'custom_tah'), ['.tah']);
  const tahPath = path.join(outputDir, `${baseName}.tah`);
  const buffer = new TAHBuilder().forge(inputs);
  fs.writeFileSync(tahPath, buffer);

  return successResponse({
    mode: 'tah',
    name: `${baseName}.tah`,
    directory: path.relative(process.cwd(), outputDir) || '.',
    files: [fileSummary(tahPath)],
    shardCount: inputs.length,
    message: 'TAH cartridge created.'
  });
}

function forgeMemoria(body: ForgeRequest) {
  const shards: ExtractedTextShard[] = [];
  const slugs = uniqueStrings(body.slugs || []);

  for (const slug of slugs) {
    const cartridge = getPulseCartridge(slug);
    if (!cartridge) return errorResponse(`Unknown cartridge: ${slug}`, 404);
    shards.push(...extractTextShardsFromCartridge(cartridge));
  }

  const uploadedFiles = normalizeUploadedFiles(body.files || []);
  if (uploadedFiles.length) {
    shards.push(...extractTextShardsFromUploads(uploadedFiles));
  }

  const text = normalizeText(body.text, false);
  if (text) {
    shards.push(...createTahInputsFromText(text).map(input => ({
      source: 'pasted text',
      text: input.data,
      meta: input.data.split(/\s+/).filter(Boolean).length
    })));
  }

  const cleanShards = shards
    .map(shard => ({
      source: shard.source,
      text: shard.text.replace(/\s+/g, ' ').trim(),
      meta: shard.meta
    }))
    .filter(shard => shard.text.length > 0)
    .slice(0, MAX_MEMORIA_SHARDS);

  if (!cleanShards.length) {
    return errorResponse('Select cartridges, upload files, or paste text before creating Memoria.', 400);
  }

  const sourceCount = new Set(cleanShards.map(shard => shard.source)).size;
  const memoriaInputs = cleanShards.map(shard => ({
    text: sourceCount > 1 ? `SOURCE: ${shard.source}\n${shard.text}` : shard.text,
    meta: shard.meta
  }));

  const outputDir = resolveOutputDir();
  const baseName = uniqueBaseName(outputDir, safeBaseName(body.name, 'custom_memoria'), ['.hat', '.tah']);
  const hatPath = path.join(outputDir, `${baseName}.hat`);
  const tahPath = path.join(outputDir, `${baseName}.tah`);
  const memoria = buildMemoriaPair(memoriaInputs);

  fs.writeFileSync(hatPath, memoria.hat);
  fs.writeFileSync(tahPath, memoria.tah);

  return successResponse({
    mode: 'memoria',
    name: baseName,
    directory: path.relative(process.cwd(), outputDir) || '.',
    files: [fileSummary(hatPath), fileSummary(tahPath)],
    sourceCount,
    shardCount: memoria.stats.shardCount,
    stats: memoria.stats,
    message: 'Memoria pair created.'
  });
}

function normalizeText(text: ForgeRequest['text'], enforceLimit = true) {
  const value = String(text || '').trim();
  if (enforceLimit && value.length > MAX_TEXT_CHARS) {
    throw new Error(`Text must be ${MAX_TEXT_CHARS.toLocaleString()} characters or fewer.`);
  }
  return value;
}

function normalizeKeywords(keywords: ForgeRequest['keywords']) {
  if (Array.isArray(keywords)) return uniqueStrings(keywords);
  return uniqueStrings(String(keywords || '').split(/[,;\n]/));
}

function normalizeUploadedFiles(files: UploadedCartridgeFile[]) {
  if (files.length > MAX_UPLOAD_FILES) {
    throw new Error(`Upload ${MAX_UPLOAD_FILES} files or fewer at a time.`);
  }

  let totalBytes = 0;
  return files.map(file => {
    const name = path.basename(String(file.name || 'upload.tah'));
    const contentBase64 = String(file.contentBase64 || '');
    const byteSize = Buffer.byteLength(contentBase64, 'base64');
    totalBytes += byteSize;
    if (totalBytes > MAX_UPLOAD_BYTES) {
      throw new Error('Uploaded cartridge files are too large for one forge request.');
    }

    return { name, contentBase64 };
  });
}

function resolveOutputDir() {
  const preferred = process.env.PULSE_FORGE_OUTPUT_DIR?.trim() || path.join(process.cwd(), 'cartridges', 'custom');
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const fallback = path.join(os.tmpdir(), 'cartridges');
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

function safeBaseName(name: string | undefined, fallback: string) {
  return String(name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || fallback;
}

function uniqueBaseName(dir: string, baseName: string, extensions: string[]) {
  let candidate = baseName;
  let suffix = 2;

  while (extensions.some(extension => fs.existsSync(path.join(dir, `${candidate}${extension}`)))) {
    candidate = `${baseName}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function fileSummary(filePath: string) {
  return {
    name: path.basename(filePath),
    path: path.relative(process.cwd(), filePath),
    byteSize: fs.statSync(filePath).size
  };
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}
