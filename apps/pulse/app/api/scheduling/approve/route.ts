export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { logEvent } from '@/lib/supabase';
import { getChicagoWeekRange } from '@/lib/core/timezone';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export async function POST(req: NextRequest) {
  try {
    const access = await requireOperatorRouteAccess(req);
    if (isAuthResponse(access)) return access;
    const operator = operatorAuditUser(access);

    let bodyPayload: any = {};
    try {
      bodyPayload = await req.json();
    } catch (e) {
      // Body can be empty
    }

    const { weekOffset = 1 } = bodyPayload;

    // Calculate target date boundaries localized to America/Chicago
    const { start: targetStart, end: targetEnd } = getChicagoWeekRange(weekOffset, true);

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
          description: `${operator.name} approved weekly shift roster for week starting ${targetStart.toLocaleDateString()}. Approved ${updateResult.count} shifts.`,
          actorId: operator.userId,
          actorName: operator.name,
          targetId: `week-starting-${targetStart.toISOString().split('T')[0]}`,
          severity: 'TACTICAL',
          metadata: {
            approvedCount: updateResult.count,
            start: targetStart.toISOString(),
            end: targetEnd.toISOString(),
            operatorEmail: operator.email,
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
