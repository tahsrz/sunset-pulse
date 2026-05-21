import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { searchTahMaster } from '@/lib/core/tah_master';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MasterSearchRequest = {
  query?: string;
  q?: string;
  limit?: number | string;
};

export async function GET(request: NextRequest) {
  return runMasterSearch({
    query: request.nextUrl.searchParams.get('query') || request.nextUrl.searchParams.get('q') || '',
    limit: request.nextUrl.searchParams.get('limit') || undefined
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MasterSearchRequest;
    return runMasterSearch({
      query: body.query || body.q || '',
      limit: body.limit
    });
  } catch (error: any) {
    return errorResponse('Invalid TAH master search request body.', 400, error.message);
  }
}

function runMasterSearch(input: MasterSearchRequest) {
  try {
    return successResponse({
      endpoint: '/api/tah/master/search',
      ...searchTahMaster({ query: input.query || '', limit: input.limit })
    });
  } catch (error: any) {
    const message = error.message || 'TAH master search failed.';
    const status = message.includes('not found') ? 404 : 400;
    return errorResponse(message, status);
  }
}
