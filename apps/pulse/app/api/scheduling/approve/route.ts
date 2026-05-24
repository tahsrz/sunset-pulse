export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@calcom/prisma';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { logEvent } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    let bodyPayload: any = {};
    try {
      bodyPayload = await req.json();
    } catch (e) {
      // Body can be empty
    }

    const { weekOffset = 1 } = bodyPayload;

    // Calculate target date boundaries
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Days to next Monday
    const daysToMonday = currentDay === 0 ? 1 : 8 - currentDay;

    // Target week start: next Monday + (weekOffset - 1) * 7 days
    const targetStart = new Date(today);
    targetStart.setDate(today.getDate() + daysToMonday + (weekOffset - 1) * 7);
    targetStart.setHours(0, 0, 0, 0);

    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetStart.getDate() + 6);
    targetEnd.setHours(23, 59, 59, 999);

    console.log(`[ROSTER_APPROVAL] Approving shifts for target range: ${targetStart.toISOString()} - ${targetEnd.toISOString()}`);

    // Update all pending bookings in target week matching the shift slugs
    const updateResult = await prisma.booking.updateMany({
      where: {
        status: 'PENDING',
        startTime: {
          gte: targetStart,
          lte: targetEnd,
        },
        eventType: {
          slug: {
            in: ['grill-shift', 'register-shift'],
          },
        },
      },
      data: {
        status: 'ACCEPTED',
      },
    });

    console.log(`[ROSTER_APPROVAL] Successfully approved ${updateResult.count} shift bookings.`);

    // Log Event to Supabase if we have updates
    if (updateResult.count > 0) {
      try {
        await logEvent({
          type: 'WEEKLY_ROSTER_APPROVED',
          description: `Manager approved weekly shift roster for week starting ${targetStart.toLocaleDateString()}. Approved ${updateResult.count} shifts.`,
          actorId: 'manager-admin-id',
          actorName: 'Sunset Manager',
          targetId: `week-starting-${targetStart.toISOString().split('T')[0]}`,
          severity: 'TACTICAL',
          metadata: {
            approvedCount: updateResult.count,
            start: targetStart.toISOString(),
            end: targetEnd.toISOString(),
          },
        });
      } catch (err: any) {
        console.error('[ROSTER_APPROVAL_LOG_WARNING]: Could not log approval event to Supabase:', err.message);
      }
    }

    return successResponse({
      message: `Successfully approved weekly roster.`,
      approvedCount: updateResult.count,
      weekRange: {
        start: targetStart.toISOString(),
        end: targetEnd.toISOString(),
      },
    });

  } catch (error: any) {
    console.error('[ROSTER_APPROVAL_ERROR]:', error);
    return errorResponse('Failed to approve weekly shift roster.', 500, error.message);
  }
}
