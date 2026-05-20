import { NextRequest } from 'next/server';
import { listPulseCartridges, pulse_search } from '@/lib/ai/brain/pulse_query';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { syncUniversalIntelligence } from '@/lib/ai/brain/remote_atlas';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { siteUrlFromRequest } from '@/lib/core/site_url';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type TahRequest = {
  query?: string;
  q?: string;
  limit?: number | string;
  sync?: boolean;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') || request.nextUrl.searchParams.get('q') || '';
  const limit = request.nextUrl.searchParams.get('limit');
  const sync = request.nextUrl.searchParams.get('sync') === 'true';

  if (!query.trim()) {
    const host = siteUrlFromRequest(request);
    const cartridges = listPulseCartridges().map(cartridge => getCartridgeMetadata(cartridge, host));
    return successResponse({
      status: 'ready',
      endpoint: '/api/tah',
      cartridges: cartridges.map(cartridge => ({
        name: cartridge.source,
        slug: cartridge.slug,
        title: cartridge.displayTitle,
        canonicalTitle: cartridge.title,
        type: cartridge.type,
        domain: cartridge.domain,
        format: cartridge.format,
        byteSize: cartridge.byteSize,
        shardCount: cartridge.shardCount,
        summary: cartridge.summary,
        url: `/tah/${cartridge.slug}`,
        metaUrl: cartridge.routes.meta
      })),
      count: cartridges.length
    });
  }

  return runTahQuery({ query, limit, sync });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TahRequest;
    return runTahQuery(body);
  } catch (error: any) {
    return errorResponse('Invalid TAH request body.', 400, error.message);
  }
}

async function runTahQuery(input: TahRequest) {
  const query = String(input.query || input.q || '').trim();
  if (!query) {
    return errorResponse('Query is required.', 400);
  }

  if (query.length > 500) {
    return errorResponse('Query must be 500 characters or fewer.', 400);
  }

  const limit = normalizeLimit(input.limit);
  let synced: string[] = [];

  try {
    if (input.sync === true) {
      synced = await syncUniversalIntelligence();
    }

    const results = await pulse_search(query, limit);
    const sources = [...new Set(results.map(result => result.source))];

    return successResponse({
      query,
      limit,
      count: results.length,
      sources,
      synced,
      results
    });
  } catch (error: any) {
    return errorResponse('TAH search failed.', 500, error.message);
  }
}

function normalizeLimit(value: TahRequest['limit']) {
  const parsed = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}
