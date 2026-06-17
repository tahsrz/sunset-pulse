import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { getTahFactOfDay } from '@/lib/core/tah_master';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    return successResponse({
      endpoint: '/api/tah/fact',
      fact: getTahFactOfDay({
        date: request.nextUrl.searchParams.get('date') || undefined,
        refresh: request.nextUrl.searchParams.get('refresh')
      })
    });
  } catch (error: any) {
    const message = error.message || 'TAH fact lookup failed.';
    const status = message.includes('not found') ? 404 : 500;
    return errorResponse(message, status);
  }
}
