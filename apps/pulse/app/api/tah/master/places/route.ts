import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { listTahMasterPlaces } from '@/lib/core/tah_master';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    return successResponse({
      endpoint: '/api/tah/master/places',
      ...listTahMasterPlaces({
        q: request.nextUrl.searchParams.get('q') || undefined,
        limit: request.nextUrl.searchParams.get('limit') || undefined,
        offset: request.nextUrl.searchParams.get('offset') || undefined
      })
    });
  } catch (error: any) {
    const message = error.message || 'TAH master places failed.';
    return errorResponse(message, message.includes('not found') ? 404 : 500);
  }
}
