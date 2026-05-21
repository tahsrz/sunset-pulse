import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { getTahMasterMetadata } from '@/lib/core/tah_master';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  const archive = getTahMasterMetadata();

  if (archive.status !== 'ready') {
    return errorResponse('TAH master archive not found.', 404, {
      expected: archive.files,
      command: 'npm run tah:pack-master'
    });
  }

  return successResponse({
    endpoint: '/api/tah/master',
    archive
  });
}
