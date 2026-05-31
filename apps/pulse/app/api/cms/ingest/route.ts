export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { assertBridgeToken, writeUsbBridgeState } from '@/lib/cms/usbBridge';

type CmsIngestBatch = {
  batchId?: string;
  source?: string;
  records?: unknown[];
  warnings?: string[];
};

export const POST = async (request: NextRequest) => {
  try {
    const token = request.headers.get('x-cms-bridge-token');
    if (!assertBridgeToken(token)) {
      return unauthorizedResponse('CMS bridge token rejected.');
    }

    const body = (await request.json()) as CmsIngestBatch;
    const records = Array.isArray(body.records) ? body.records : [];
    const batchId = body.batchId || `USB-BATCH-${Date.now()}`;
    const warning = body.warnings?.length ? body.warnings.join(' | ') : undefined;

    const state = await writeUsbBridgeState({
      status: 'ingesting',
      mode: 'usb-serial',
      deviceLabel: body.source || 'RubyCi USB export bridge',
      lastBatchId: batchId,
      acceptedRecords: records.length,
      warning,
    });

    return successResponse(
      {
        batchId,
        acceptedRecords: records.length,
        rejectedRecords: 0,
        bridge: state,
        note: 'Batch accepted into the local CMS bridge contract. Persistence can be wired to Mongo/Supabase next.',
      },
      {
        source: 'local-cms-usb-bridge',
      }
    );
  } catch (error: any) {
    return errorResponse('Failed to ingest CMS USB bridge batch.', 500, error.message);
  }
};
