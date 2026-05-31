export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { getCmsSummary } from '@/lib/cms/mockData';
import { readUsbBridgeState } from '@/lib/cms/usbBridge';

export const GET = async () => {
  try {
    return successResponse(
      {
        ...getCmsSummary(),
        usbBridge: await readUsbBridgeState(),
      },
      {
      source: 'mock-rubyci-cms',
      mode: 'read-only',
      }
    );
  } catch (error: any) {
    return errorResponse('Failed to load CMS command data.', 500, error.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const summary = getCmsSummary();

    return successResponse(
      {
        config: {
          ...summary.config,
          ...body,
          mode: 'read-only',
        },
        accepted: true,
        note: 'Mock connector settings staged locally. Production write access remains disabled.',
      },
      {
        source: 'mock-rubyci-cms',
      }
    );
  } catch (error: any) {
    return errorResponse('Failed to stage CMS connector settings.', 500, error.message);
  }
};
