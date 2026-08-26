import fs from 'fs';
import path from 'path';
import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { hashFileSha256, resolvePairedTahPath } from '@/lib/ai/brain/cartridge_metadata';
import { getPulseCartridge, type PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_MAX_DOWNLOAD_BYTES = 16 * 1024 * 1024;
const DOWNLOADS_PER_MINUTE = 5;

type TahDownloadRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

type DownloadTarget = {
  path: string;
  filename: string;
  part: 'source' | 'header' | 'payload';
};

export async function GET(request: NextRequest, { params }: TahDownloadRouteProps) {
  const limitResponse = await applyDownloadRateLimit(request);
  if (limitResponse) return limitResponse;

  return handleDownload(request, params, true);
}

export async function HEAD(request: NextRequest, { params }: TahDownloadRouteProps) {
  return handleDownload(request, params, false);
}

async function handleDownload(request: NextRequest, params: TahDownloadRouteProps['params'], includeBody: boolean) {
  const { slug } = await params;
  const cartridge = getPulseCartridge(slug);

  if (!cartridge) {
    return jsonError('TAH cartridge not found.', 404, { slug });
  }

  const target = resolveDownloadTarget(cartridge, request.nextUrl.searchParams.get('part'));
  if (!target) {
    return jsonError('Invalid cartridge download part.', 400, {
      allowedParts: cartridge.type === 'hat' ? ['header', 'payload'] : ['source']
    });
  }

  if (!fs.existsSync(target.path)) {
    return jsonError('TAH cartridge binary is not available.', 404, {
      slug,
      part: target.part
    });
  }

  const stat = fs.statSync(target.path);
  const maxBytes = maxDownloadBytes();
  if (stat.size > maxBytes) {
    return jsonError('TAH cartridge binary is too large for direct download.', 413, {
      slug,
      part: target.part,
      byteSize: stat.size,
      maxBytes
    });
  }

  const checksum = hashFileSha256(target.path);

  return new Response(includeBody ? Readable.toWeb(fs.createReadStream(target.path)) as ReadableStream : null, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${safeDownloadName(target.filename)}"`,
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      ...(checksum ? {
        ETag: `"sha256-${checksum}"`,
        'X-Checksum-SHA256': checksum
      } : {})
    }
  });
}

function resolveDownloadTarget(cartridge: PulseCartridge, rawPart: string | null): DownloadTarget | null {
  const part = (rawPart || '').toLowerCase();

  if (cartridge.type === 'hat') {
    if (!part || part === 'header') {
      return {
        path: cartridge.path,
        filename: `${cartridge.slug}.hat`,
        part: 'header'
      };
    }

    if (part === 'payload') {
      const payloadPath = resolvePairedTahPath(cartridge.path);
      return {
        path: payloadPath,
        filename: `${cartridge.slug}.payload${path.extname(payloadPath) || '.tah'}`,
        part: 'payload'
      };
    }

    return null;
  }

  if (!part || part === 'source') {
    return {
      path: cartridge.path,
      filename: `${cartridge.slug}.tah`,
      part: 'source'
    };
  }

  return null;
}

function safeDownloadName(filename: string) {
  return filename
    .replace(/["\\/:*?<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cartridge.tah';
}

function jsonError(message: string, status: number, details: Record<string, unknown> = {}) {
  return Response.json(
    {
      error: true,
      message,
      ...details
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

async function applyDownloadRateLimit(request: Request) {
  const ip = request.headers.get('x-vercel-forwarded-for')
    || request.headers.get('x-real-ip')
    || request.headers.get('x-forwarded-for')
    || 'unknown';
  const token = `tah-download:${ip.split(',')[0].trim() || 'unknown'}`;
  return applyApiRateLimit(token, DOWNLOADS_PER_MINUTE);
}

function maxDownloadBytes() {
  const configured = Number(process.env.TAH_DOWNLOAD_MAX_BYTES);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return DEFAULT_MAX_DOWNLOAD_BYTES;
}
