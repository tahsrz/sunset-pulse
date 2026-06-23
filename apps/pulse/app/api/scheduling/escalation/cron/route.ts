export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { sendSMS } from '@/lib/twilio';
import { logEvent } from '@/lib/supabase';

// Self-contained, timezone-aware compatibility & conflict check
async function hasConflict(userId: number, startTime: Date, endTime: Date, ignoreBookingId: number): Promise<boolean> {
  try {
    const getChicagoLocalDateString = (d: Date) => {
      return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    };
    const targetDayStr = getChicagoLocalDateString(new Date(startTime));

    const candidateBookings = await prisma.booking.findMany({
      where: {
        id: { not: ignoreBookingId },
        status: { in: ['ACCEPTED', 'PENDING'] },
        eventType: {
          slug: { in: ['grill-shift', 'register-shift'] }
        },
        userId: { not: null }
      }
    });

    const sameDayBookings = candidateBookings.filter(b => getChicagoLocalDateString(new Date(b.startTime)) === targetDayStr);

    for (const otherBooking of sameDayBookings) {
      if (otherBooking.userId === userId) {
        const s1 = new Date(startTime).getTime();
        const e1 = new Date(endTime).getTime();
        const s2 = new Date(otherBooking.startTime).getTime();
        const e2 = new Date(otherBooking.endTime).getTime();

        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          return true; // Overlap detected
        }
      }
    }
  } catch (err) {
    console.error('[CRON_CHECK_CONFLICT_ERROR]:', err);
  }
  return false;
}

// POST /api/scheduling/escalation/cron - State-Machine Escalation Runner
export async function POST(req: NextRequest) {
  try {
    // 1. Authorize trigger via headers
    const authHeader = req.headers.get('Authorization') || '';
    const secretKey = process.env.SCHEDULER_DISPATCH_SECRET;
    if (!secretKey) {
      return errorResponse('Scheduler dispatch secret is not configured.', 503);
    }
    const token = authHeader.replace('Bearer ', '').trim();

    if (token !== secretKey) {
      console.warn('[ESCALATION_CRON_UNAUTHORIZED]: Unauthorized attempt to trigger escalation cron.');
      return errorResponse('Unauthorized: Invalid authorization token.', 401);
    }

    // 2. Fetch pending escalations where escalation time is elapsed
    const escalations = await prisma.shiftEscalation.findMany({
      where: {
        status: 'PENDING',
        nextEscalationTime: { lte: new Date() }
      }
    });

    if (escalations.length === 0) {
      return successResponse({
        message: 'No pending escalations processed.',
        escalationsProcessed: 0
      });
    }

    console.log(`[ESCALATION_CRON]: Processing ${escalations.length} expired escalations...`);

    const processedResults = [];

    for (const esc of escalations) {
      const booking = await prisma.booking.findUnique({
        where: { id: esc.bookingId },
        include: { eventType: true }
      });

      // If shift is already assigned (resolved), close escalation
      if (!booking || booking.userId !== null) {
        await prisma.shiftEscalation.update({
          where: { id: esc.id },
          data: { status: 'RESOLVED' }
        });
        processedResults.push({ id: esc.id, status: 'RESOLVED_AUTO' });
        continue;
      }

      const roleType = booking.eventType?.slug === 'grill-shift' ? 'Grill' : 'Register';
      const startLocalStr = booking.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
      const timeLocalStr = `${booking.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })} - ${booking.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })}`;

      if (esc.currentTier === 1) {
        // --- ESCALATE TIER 1 TO TIER 2 ---
        console.log(`[ESCALATION_ENGINE]: Escalating booking #${booking.id} from Tier 1 to Tier 2.`);

        // Get all active employees
        const allUsers = await prisma.user.findMany({
          include: {
            verifiedNumbers: true
          }
        });

        // Filter qualified users who don't have conflicts
        const eligibleUsers = [];
        for (const user of allUsers) {
          const userPhone = user.verifiedNumbers?.[0]?.phoneNumber;
          if (!userPhone) continue;

          // Check if already has a pending offer (Tier 1 got immediate dispatch)
          const existingOffer = await prisma.smsShiftOffer.findFirst({
            where: { bookingId: booking.id, userId: user.id }
          });
          if (existingOffer) continue;

          // Check overlap conflict
          const conflictFound = await hasConflict(user.id, booking.startTime, booking.endTime, booking.id);
          if (conflictFound) continue;

          eligibleUsers.push(user);
        }

        // Send SMS offers to newly expanded audience
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins expiration
        const smsOffers = [];

        for (const user of eligibleUsers) {
          const userPhone = user.verifiedNumbers[0].phoneNumber;
          const text = `[Sunset Grill] Shift available: ${startLocalStr} ${roleType} ${timeLocalStr}. Reply ACCEPT to claim!`;

          // Send Telnyx SMS
          await sendSMS(userPhone, text);

          // Record ShiftOffer in DB
          smsOffers.push(
            prisma.smsShiftOffer.create({
              data: {
                bookingId: booking.id,
                userId: user.id,
                phoneNumber: userPhone,
                status: 'PENDING',
                expiresAt
              }
            })
          );
        }

        // Batch create offers and update Escalation Tier state
        await prisma.$transaction([
          ...smsOffers,
          prisma.shiftEscalation.update({
            where: { id: esc.id },
            data: {
              currentTier: 2,
              nextEscalationTime: new Date(Date.now() + 30 * 60 * 1000) // Next trigger in 30 mins
            }
          })
        ]);

        try {
          await logEvent({
            type: 'ROSTER_ESCALATION_TIER_PROMOTED',
            description: `Roster coverage for booking #${booking.id} escalated to Tier 2. Offers sent to ${eligibleUsers.length} staff.`,
            actorId: 0,
            actorName: 'SYSTEM_CRON',
            targetId: String(booking.id),
            severity: 'TACTICAL',
            metadata: {
              bookingId: booking.id,
              escalationId: esc.id,
              tierBefore: 1,
              tierAfter: 2,
              offersSent: eligibleUsers.length
            }
          });
        } catch (logErr) {
          console.error('Audit log error skipped:', logErr);
        }

        processedResults.push({ id: esc.id, status: 'PROMOTED_TO_TIER2', offersSent: eligibleUsers.length });

      } else if (esc.currentTier === 2) {
        // --- ESCALATE TIER 2 TO TIER 3 (MANUAL INTERVENTION) ---
        console.log(`[ESCALATION_ENGINE]: Escalating booking #${booking.id} from Tier 2 to Tier 3 (Failing Open).`);

        // Close offers
        await prisma.smsShiftOffer.updateMany({
          where: { bookingId: booking.id, status: 'PENDING' },
          data: { status: 'EXPIRED' }
        });

        // Set status to EXPIRED/MANUAL_INTERVENTION
        await prisma.shiftEscalation.update({
          where: { id: esc.id },
          data: {
            currentTier: 3,
            status: 'EXPIRED'
          }
        });

        // Dispatch alert SMS to Fallback Manager Phone
        const fallbackPhone = process.env.FALLBACK_NOTIFICATION_PHONE;
        let smsAlertSent = false;

        if (fallbackPhone) {
          const managerText = `[Sunset Grill] CRITICAL: ${startLocalStr} ${roleType} shift (${timeLocalStr}) remains UNCLAIMED after Tier 2 escalation. Immediate manual assignment required.`;
          const res = await sendSMS(fallbackPhone, managerText);
          smsAlertSent = res.success;
        }

        try {
          await logEvent({
            type: 'ROSTER_ESCALATION_FAILED',
            description: `Coverage for booking #${booking.id} failed automated backfill. Escalated to Tier 3 (Manual Intervention).`,
            actorId: 0,
            actorName: 'SYSTEM_CRON',
            targetId: String(booking.id),
            severity: 'TACTICAL',
            metadata: {
              bookingId: booking.id,
              escalationId: esc.id,
              managerAlerted: smsAlertSent
            }
          });
        } catch (logErr) {
          console.error('Audit log error skipped:', logErr);
        }

        processedResults.push({ id: esc.id, status: 'FAILED_TO_TIER3', managerAlerted: smsAlertSent });
      }
    }

    return successResponse({
      message: 'Escalation cron completed successfully.',
      processedCount: processedResults.length,
      details: processedResults
    });

  } catch (error: any) {
    console.error('[ESCALATION_CRON_ERROR]:', error);
    return errorResponse('Critical failure during auto-escalation cron execution.', 500, error.message);
  }
}
