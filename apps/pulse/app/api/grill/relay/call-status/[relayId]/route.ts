export const dynamic = 'force-dynamic';

import { getRelaySession, updateRelaySession } from '@/lib/grill/relaySessions';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';

function emptyTwilioResponse() {
  return new Response('<Response></Response>', {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function persistRelayStatus(session: any, updates: Record<string, any>) {
  if (!session?.orderId) return;

  await connectDB();
  await Order.findByIdAndUpdate(session.orderId, updates);
}

export async function POST(request: Request, context: { params: Promise<{ relayId: string }> }) {
  const { relayId } = await context.params;
  const session = await getRelaySession(relayId);
  const formData = await request.formData();
  const callStatus = String(formData.get('CallStatus') || '').toLowerCase();

  if (!session) {
    return emptyTwilioResponse();
  }

  if (callStatus === 'completed' && session.status !== 'confirmed') {
    await updateRelaySession(relayId, {
      status: 'confirmed',
    });
    await persistRelayStatus(session, {
      'phoneRelay.status': 'confirmed',
      'phoneRelay.confirmedAt': new Date(),
      'phoneRelay.updatedAt': new Date(),
    });
  }

  return emptyTwilioResponse();
}
