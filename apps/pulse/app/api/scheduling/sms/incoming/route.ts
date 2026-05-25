export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@calcom/prisma';
import { logEvent } from '@/lib/supabase';
import crypto from 'node:crypto';

// Standard TwiML XML Response helper
function twimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
}

// Deterministic UUID v5 generator (standard RFC 4122)
function uuidv5(name: string): string {
  const namespace = Buffer.from('6ba7b8119dad11d180b400c04fd430c8', 'hex');
  const nameBuffer = Buffer.from(name, 'utf8');
  const hash = crypto.createHash('sha1');
  hash.update(namespace);
  hash.update(nameBuffer);
  const digest = hash.digest();
  digest[6] = (digest[6] & 0x0f) | 0x50; // Set version to 5
  digest[8] = (digest[8] & 0x3f) | 0x80; // Set variant to RFC 4122
  const hex = digest.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Self-contained, lightweight timezone-aware compatibility & conflict check
async function checkCompatibilityConflict(userId: number, startTime: Date, endTime: Date, ignoreBookingIds?: number[]) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;

    const getChicagoLocalDateString = (d: Date) => {
      return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
    };
    const targetDayStr = getChicagoLocalDateString(new Date(startTime));

    // 1. Fetch same-day active bookings
    const candidateBookings = await prisma.booking.findMany({
      where: {
        id: ignoreBookingIds ? { notIn: ignoreBookingIds.map(Number) } : undefined,
        status: { in: ['ACCEPTED', 'PENDING'] },
        eventType: {
          slug: { in: ['grill-shift', 'register-shift'] }
        },
        userId: { not: null }
      },
      include: {
        user: true
      }
    });

    const sameDayBookings = candidateBookings.filter(b => getChicagoLocalDateString(new Date(b.startTime)) === targetDayStr);

    // 2. Overlap/Double-Scheduling check
    for (const otherBooking of sameDayBookings) {
      if (otherBooking.userId === userId) {
        const s1 = new Date(startTime).getTime();
        const e1 = new Date(endTime).getTime();
        const s2 = new Date(otherBooking.startTime).getTime();
        const e2 = new Date(otherBooking.endTime).getTime();

        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          return {
            selfConflict: true,
            booking: otherBooking
          };
        }
      }
    }
  } catch (error) {
    console.error('[SMS_COMPATIBILITY_CHECK_ERROR]:', error);
  }
  return null;
}

// POST /api/scheduling/sms/incoming - Twilio Webhook Handler
export async function POST(req: NextRequest) {
  try {
    // 1. Parse Twilio URL-encoded form payload
    const formData = await req.formData();
    const from = (formData.get('From') as string || '').trim();
    const bodyText = (formData.get('Body') as string || '').trim();

    if (!from || !bodyText) {
      console.warn('[SMS_INCOMING_BAD_PAYLOAD]: Missing From or Body in SMS webhook.');
      return new Response(twimlResponse('Error: Missing parameters.'), {
        status: 400,
        headers: { 'Content-Type': 'application/xml' }
      });
    }

    console.log(`[SMS_INCOMING_RECEIVED]: Received text from ${from}: "${bodyText}"`);

    // 2. Identify the employee by their verified phone number
    const verifiedNum = await prisma.verifiedNumber.findFirst({
      where: { phoneNumber: from },
      include: {
        user: true
      }
    });

    if (!verifiedNum || !verifiedNum.user) {
      console.warn(`[SMS_INCOMING_UNIDENTIFIED]: Sender phone ${from} does not match any registered employee.`);
      return new Response(twimlResponse("Sorry, we couldn't find an employee profile associated with this phone number. Please contact your manager."), {
        headers: { 'Content-Type': 'application/xml' }
      });
    }

    const employee = verifiedNum.user;
    const bodyNormalized = bodyText.toUpperCase();

    // 3. Process ACCEPT / CLAIM replies
    if (bodyNormalized.startsWith('ACCEPT') || bodyNormalized.startsWith('CLAIM')) {
      // Find active pending SmsShiftOffer for this user
      const pendingOffer = await prisma.smsShiftOffer.findFirst({
        where: {
          userId: employee.id,
          status: 'PENDING',
          expiresAt: { gte: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!pendingOffer) {
        console.warn(`[SMS_CLAIM_FAILED]: No pending shift offer found for ${employee.name} (${from}).`);
        return new Response(twimlResponse("You have no pending shift offers to claim, or the offer has expired."), {
          headers: { 'Content-Type': 'application/xml' }
        });
      }

      const bookingId = pendingOffer.bookingId;

      // 4. Fetch the target shift
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { eventType: true }
      });

      if (!booking) {
        console.warn(`[SMS_CLAIM_FAILED]: Shift booking #${bookingId} not found in database.`);
        return new Response(twimlResponse("The shift could not be found."), {
          headers: { 'Content-Type': 'application/xml' }
        });
      }

      if (booking.userId !== null) {
        console.warn(`[SMS_CLAIM_FAILED]: Shift booking #${bookingId} already assigned to user ID ${booking.userId}.`);
        return new Response(twimlResponse("Sorry, this shift has already been claimed by another team member."), {
          headers: { 'Content-Type': 'application/xml' }
        });
      }

      // 5. Run compatibility & overlap check
      const conflict = await checkCompatibilityConflict(employee.id, booking.startTime, booking.endTime, [booking.id]);
      if (conflict) {
        if (conflict.selfConflict) {
          console.warn(`[SMS_CLAIM_FAILED]: Shift booking #${bookingId} overlaps with shift #${conflict.booking.id} for ${employee.name}.`);
          return new Response(twimlResponse(`Conflict: You are already scheduled to work an overlapping shift (${conflict.booking.title}) on this day.`), {
            headers: { 'Content-Type': 'application/xml' }
          });
        }
      }

      // 6. Execute atomic claim inside database transaction
      const startVal = new Date(booking.startTime).getTime();
      const endVal = new Date(booking.endTime).getTime();
      const idempotencyKey = uuidv5(`${startVal}.${endVal}.${employee.id}`);
      const title = `${booking.eventType?.title || 'Shift'} - ${employee.name}`;

      await prisma.$transaction([
        // A. Assign shift to employee
        prisma.booking.update({
          where: { id: bookingId },
          data: {
            userId: employee.id,
            userPrimaryEmail: employee.email,
            title,
            idempotencyKey
          }
        }),
        // B. Mark this specific offer as CLAIMED
        prisma.smsShiftOffer.update({
          where: { id: pendingOffer.id },
          data: { status: 'CLAIMED' }
        }),
        // C. Mark all other pending offers for this booking as EXPIRED
        prisma.smsShiftOffer.updateMany({
          where: {
            bookingId,
            id: { not: pendingOffer.id },
            status: 'PENDING'
          },
          data: { status: 'EXPIRED' }
        })
      ]);

      // 7. Log Audit Event
      try {
        await logEvent({
          type: 'ROSTER_SHIFT_CLAIMED_VIA_SMS',
          description: `Shift "${title}" successfully claimed via SMS by employee ${employee.name}.`,
          actorId: employee.id,
          actorName: employee.name,
          targetId: String(bookingId),
          severity: 'TACTICAL',
          metadata: {
            bookingId,
            offerId: pendingOffer.id,
            phoneNumber: from,
            idempotencyKey
          }
        });
      } catch (logErr) {
        console.error('Audit log skipped in SMS webhook:', logErr);
      }

      // 8. TwiML success response
      const formatDate = (d: Date) => {
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
      };
      const formatTime = (d: Date) => {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' });
      };

      const finalSmsText = `Success! You have claimed the ${booking.eventType?.title || 'Shift'} on ${formatDate(booking.startTime)} (${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}). See you there!`;
      return new Response(twimlResponse(finalSmsText), {
        headers: { 'Content-Type': 'application/xml' }
      });

    } else {
      // Unrecognized action / text command
      return new Response(twimlResponse("Command not recognized. To claim a shift, reply with ACCEPT."), {
        headers: { 'Content-Type': 'application/xml' }
      });
    }

  } catch (error: any) {
    console.error('[SMS_INCOMING_WEBHOOK_ERROR]:', error);
    return new Response(twimlResponse("Critical server error processing shift claim. Please contact support."), {
      status: 500,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
