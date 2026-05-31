export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { errorResponse } from '@/lib/core/apiResponse';

const isAuthorizedBridge = (req: NextRequest) => {
  const configuredToken = process.env.VERIFONE_BRIDGE_TOKEN;
  if (!configuredToken) return true;

  const authorization = req.headers.get('authorization') || '';
  return authorization === `Bearer ${configuredToken}`;
};

export async function GET(req: NextRequest) {
  if (!isAuthorizedBridge(req)) {
    return errorResponse('Unauthorized Verifone bridge.', 401);
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const bridgeId = searchParams.get('bridgeId') || 'kds-pi-01';
    const siteId = searchParams.get('siteId') || 'sunset-grill';
    const terminalId = searchParams.get('terminalId');

    const orders = await Order.find({
      paymentState: 'PENDING_POS_TENDER',
      ...(terminalId ? { 'posProperties.terminalId': { $in: [terminalId, null] } } : {}),
      status: { $in: ['pending', 'cooking'] },
    })
      .sort({ updatedAt: 1 })
      .limit(25)
      .lean();

    const commands = orders.map((order: any) => ({
      type: 'POS_TENDER_REQUEST',
      siteId,
      bridgeId,
      orderId: order._id.toString(),
      pickupCode: order.pickupCode,
      amount: order.totalAmount,
      terminalId: order.posProperties?.terminalId || terminalId || null,
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        ageRestricted: item.ageRestricted,
        minimumAge: item.minimumAge,
        restrictedCategory: item.restrictedCategory,
      })),
      createdAt: order.createdAt,
    }));

    const stream = `event: pulse-verifone-queue\ndata: ${JSON.stringify({ commands })}\n\n`;
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[VERIFONE_QUEUE_FAILURE]:', error);
    return errorResponse('Failed to build Verifone bridge queue.', 500, error.message);
  }
}
