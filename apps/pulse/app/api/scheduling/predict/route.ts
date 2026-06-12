export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { getChicagoWeekRange } from '@/lib/core/timezone';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export async function POST(req: NextRequest) {
  try {
    const access = await requireOperatorRouteAccess(req);
    if (isAuthResponse(access)) return access;

    let bodyPayload: any = {};
    try {
      bodyPayload = await req.json();
    } catch (e) {
      // Body can be empty
    }

    const { weekOffset = 1, overwrite = true } = bodyPayload;

    // Calculate source and target date boundaries localized to America/Chicago
    // Target week is `weekOffset` weeks ahead of current week.
    // Reference week is 1 week before the target week.
    const { start: targetStart, end: targetEnd } = getChicagoWeekRange(weekOffset, true);
    const { start: sourceStart, end: sourceEnd } = getChicagoWeekRange(weekOffset - 1, true);

    console.log(`[ROSTER_PREDICTION] Source range: ${sourceStart.toISOString()} - ${sourceEnd.toISOString()}`);
    console.log(`[ROSTER_PREDICTION] Target range: ${targetStart.toISOString()} - ${targetEnd.toISOString()}`);

    // Query active source bookings (accepted grill-shift and register-shift)
    const sourceBookings = await prisma.booking.findMany({
      where: {
        status: 'ACCEPTED',
        startTime: {
          gte: sourceStart,
          lte: sourceEnd,
        },
        eventType: {
          slug: {
            in: ['grill-shift', 'register-shift'],
          },
        },
      },
      include: {
        eventType: true,
      },
    });

    if (sourceBookings.length === 0) {
      return successResponse({
        message: 'No confirmed shifts found in reference week to predict from.',
        predictedCount: 0,
      });
    }

    // Overwrite existing PENDING shifts in target week to avoid duplicates
    if (overwrite) {
      await prisma.booking.deleteMany({
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
      });
    }

    // Create predicted bookings
    const createdBookings = [];
    for (const booking of sourceBookings) {
      // Calculate target start and end times (adding exactly 7 days)
      const targetStartTime = new Date(booking.startTime);
      targetStartTime.setDate(booking.startTime.getDate() + 7);
      
      const targetEndTime = new Date(booking.endTime);
      targetEndTime.setDate(booking.endTime.getDate() + 7);

      // Check if active or pending booking already exists in target time slot for the same user
      const existing = await prisma.booking.findFirst({
        where: {
          userId: booking.userId,
          eventTypeId: booking.eventTypeId,
          startTime: targetStartTime,
          status: {
            in: ['ACCEPTED', 'PENDING'],
          },
        },
      });

      if (existing) {
        console.log(`[ROSTER_PREDICTION] Skipping duplicate for user ${booking.userId} at ${targetStartTime.toISOString()}`);
        continue;
      }

      const uid = globalThis.crypto ? globalThis.crypto.randomUUID() : 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const newBooking = await prisma.booking.create({
        data: {
          uid,
          title: booking.title,
          description: booking.description || `Predicted from shift on ${booking.startTime.toLocaleDateString()}`,
          startTime: targetStartTime,
          endTime: targetEndTime,
          status: 'PENDING', // Draft state
          userId: booking.userId,
          eventTypeId: booking.eventTypeId,
          userPrimaryEmail: booking.userPrimaryEmail,
        },
      });
      createdBookings.push(newBooking);
    }

    return successResponse({
      message: 'Successfully generated draft schedule predictions.',
      referenceWeek: {
        start: sourceStart.toISOString(),
        end: sourceEnd.toISOString(),
      },
      targetWeek: {
        start: targetStart.toISOString(),
        end: targetEnd.toISOString(),
      },
      sourceShiftsCount: sourceBookings.length,
      predictedShiftsCount: createdBookings.length,
    });

  } catch (error: any) {
    console.error('[ROSTER_PREDICTION_ERROR]:', error);
    return errorResponse('Failed to generate roster predictions.', 500, error.message);
  }
}
