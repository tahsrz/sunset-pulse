export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { assertBridgeToken, readUsbBridgeState, writeUsbBridgeState } from '@/lib/cms/usbBridge';

export const GET = async () => {
  try {
    return successResponse(await readUsbBridgeState(), {
      source: 'local-cms-usb-bridge',
    });
  } catch (error: any) {
    return errorResponse('Failed to load CMS USB bridge state.', 500, error.message);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const token = request.headers.get('x-cms-bridge-token');
    if (!assertBridgeToken(token)) {
      return unauthorizedResponse('CMS bridge token rejected.');
    }

    const body = await request.json();
    const state = await writeUsbBridgeState({
      status: body.status || 'attached',
      mode: body.mode || 'usb-serial',
      deviceLabel: body.deviceLabel || 'RubyCi USB export bridge',
      portName: body.portName || 'AUTO',
      vendorId: body.vendorId,
      productId: body.productId,
      warning: body.warning,
    });

    return successResponse(state, {
      source: 'local-cms-usb-bridge',
    });
  } catch (error: any) {
    return errorResponse('Failed to update CMS USB bridge state.', 500, error.message);
  }
};
