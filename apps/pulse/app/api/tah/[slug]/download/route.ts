import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { resolvePairedTahPath } from '@/lib/ai/brain/cartridge_metadata';
import { getPulseCartridge, type PulseCartridge } from '@/lib/ai/brain/pulse_query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

  const data = fs.readFileSync(target.path);

  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(data.byteLength),
      'Content-Disposition': `attachment; filename="${safeDownloadName(target.filename)}"`,
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function resolveDownloadTarget(cartridge: PulseCartridge, rawPart: string | null): DownloadTarget | null {
  const part = (rawPart || '').toLowerCase();

  if (cartridge.type === 'hat') {
    if (!part || part === 'header') {
      return {
        path: cartridge.path,
        filename: cartridge.name,
        part: 'header'
      };
    }

    if (part === 'payload') {
      return {
        path: resolvePairedTahPath(cartridge.path),
        filename: path.basename(resolvePairedTahPath(cartridge.path)),
        part: 'payload'
      };
    }

    return null;
  }

  if (!part || part === 'source') {
    return {
      path: cartridge.path,
      filename: cartridge.name,
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
