export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import TourRequest from '@/models/TourRequest';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { logEvent } from '@/lib/supabase';
import { prisma } from '@calcom/prisma';
import crypto from 'node:crypto';
import fs from 'fs/promises';
import path from 'path';

// GET /api/scheduling - Retrieve scheduler information
export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const typeParam = searchParams.get('type');

    // 1. Fetch Event Types from PostgreSQL Cal.com Scheduler
    const eventTypes = await prisma.eventType.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        length: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    // 2. Fetch existing Bookings from PostgreSQL Cal.com Scheduler
    let bookings;
    if (typeParam === 'shifts' && startDateParam && endDateParam) {
      bookings = await prisma.booking.findMany({
        where: {
          startTime: {
            gte: new Date(startDateParam),
            lte: new Date(endDateParam),
          },
          eventType: {
            slug: {
              in: ['grill-shift', 'register-shift'],
            },
          },
        },
        include: {
          eventType: true,
          user: {
            include: {
              verifiedNumbers: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });
    } else {
      bookings = await prisma.booking.findMany({
        include: {
          attendees: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        take: 10, // Limit to recent 10 bookings
      });
    }

    // 3. Fetch active Users from PostgreSQL Cal.com Scheduler
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
      take: 20,
    });

    return successResponse({
      scheduler: {
        eventTypes,
        bookings,
        users,
      },
    });
  } catch (error: any) {
    console.error('[SCHEDULER_GET_ERROR]:', error);
    return errorResponse('Failed to fetch scheduling system features.', 500, error.message);
  }
};

// POST /api/scheduling - Synchronize booking request into Cal.com & MongoDB TourRequest
export const POST = async (request: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return unauthorizedResponse('Authentication required to allocate a scheduled tour.');
    }

    const requestData = await request.json();
    const {
      propertyId,
      property,
      preferredDate, // e.g. "2026-05-25"
      preferredTime, // e.g. "14:30" or "flexible"
      userName,
      userEmail,
      userPhone,
      tourType = 'in-person', // "in-person" | "video" | "virtual"
      message = '',
    } = requestData;

    if (!preferredDate || !preferredTime || !userEmail || !userName) {
      return errorResponse('Required scheduling parameters are missing (preferredDate, preferredTime, userEmail, userName).', 400);
    }

    const finalPropertyId = propertyId || property || 'sunset-pulse-default-asset';

    // Map tour type to MongoDB TourRequest enum: 'In-Person' | 'Virtual' | 'Drone-Stream' | 'Jamie-Guided'
    let mappedTourType = 'In-Person';
    const normalizedType = (tourType || '').toLowerCase();
    if (normalizedType.includes('in-person') || normalizedType.includes('inperson') || normalizedType.includes('person')) {
      mappedTourType = 'In-Person';
    } else if (normalizedType.includes('video') || normalizedType.includes('virtual') || normalizedType.includes('zoom') || normalizedType.includes('consultation')) {
      mappedTourType = 'Virtual';
    } else if (normalizedType.includes('drone') || normalizedType.includes('stream')) {
      mappedTourType = 'Drone-Stream';
    } else if (normalizedType.includes('jamie') || normalizedType.includes('guide')) {
      mappedTourType = 'Jamie-Guided';
    }

    // 1. Connect MongoDB and Create Tour Request
    await connectDB();
    const newTour = new TourRequest({
      property: finalPropertyId,
      user: sessionUser.userId,
      userName,
      userEmail,
      userPhone: userPhone || '',
      preferredDate: new Date(`${preferredDate}T00:00:00`),
      preferredTime,
      tourType: mappedTourType,
      message,
      agentId: 'taz-realty-001',
    });
    await newTour.save();

    // 2. Schedule booking into PostgreSQL Cal.com via @calcom/prisma
    let timeString = preferredTime;
    if (!/^\d{2}:\d{2}$/.test(timeString)) {
      timeString = '10:00'; // Default to 10:00 AM if flexible/invalid format
    }
    const startStr = `${preferredDate}T${timeString}:00`;
    const startTime = new Date(startStr);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000); // 45 minute tour duration

    const bookingUid = crypto.randomUUID();
    const newBooking = await prisma.booking.create({
      data: {
        uid: bookingUid,
        title: `${tourType.toUpperCase()} Tour for Asset: ${propertyId || 'Sunset Asset'}`,
        description: message || `User ${userName} requested a ${tourType} tour.`,
        startTime,
        endTime,
        status: 'ACCEPTED',
        attendees: {
          create: {
            email: userEmail,
            name: userName,
            timeZone: 'America/Chicago',
            phoneNumber: userPhone || '',
          },
        },
        userPrimaryEmail: sessionUser.email || userEmail,
      },
    });

    // 3. Log Audit Event to Supabase
    await logEvent({
      type: 'TOUR_REQUEST_SCHEDULER_SYNCED',
      description: `${userName} scheduled a ${tourType} tour. MongoDB and Cal.com synchronization completed.`,
      actorId: sessionUser.userId,
      actorName: userName,
      targetId: propertyId || 'Sunset Asset',
      severity: 'TACTICAL',
      metadata: {
        mongoTourId: newTour._id.toString(),
        postgresBookingId: newBooking.id,
        bookingUid: newBooking.uid,
        preferredDate,
        preferredTime,
      },
    });

    return successResponse({
      message: 'Booking allocation synchronized across MongoDB and PostgreSQL Scheduler.',
      requestId: newTour._id,
      bookingId: newBooking.id,
      bookingUid: newBooking.uid,
    }, 201);

  } catch (error: any) {
    console.error('[SCHEDULER_POST_ERROR]:', error);
    return errorResponse('Critical failure in scheduling synchronization.', 500, error.message);
  }
};


// Deterministic UUID v5 generator using native Node.js crypto module
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

// Helper to check for compatibility/conflict pairs
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

    // 1. Get all bookings on the same calendar day that might overlap
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

    // 2. Globally verify: Self-Conflict (an employee cannot work overlapping shifts with themselves)
    for (const otherBooking of sameDayBookings) {
      if (otherBooking.userId === userId) {
        // Check for time overlap
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

    // 3. Now verify Compatibility/Conflict rules loaded from config/compatibility-rules.json
    const configPath = path.resolve(process.cwd(), 'config/compatibility-rules.json');
    let conflicts: any[] = [];
    try {
      const data = await fs.readFile(configPath, 'utf8');
      conflicts = JSON.parse(data);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('Error reading compatibility rules:', err);
      }
    }

    if (conflicts.length === 0) return null;

    const userEmail = user.email.toLowerCase();
    const conflictingEmails = conflicts.reduce((emails: string[], c: any) => {
      const e1 = c.email1.trim().toLowerCase();
      const e2 = c.email2.trim().toLowerCase();
      if (e1 === userEmail) emails.push(e2);
      if (e2 === userEmail) emails.push(e1);
      return emails;
    }, []);

    if (conflictingEmails.length === 0) return null;

    for (const otherBooking of sameDayBookings) {
      if (!otherBooking.user) continue;
      const otherUserEmail = otherBooking.user.email.toLowerCase();

      if (conflictingEmails.includes(otherUserEmail)) {
        // Check for time overlap
        const s1 = new Date(startTime).getTime();
        const e1 = new Date(endTime).getTime();
        const s2 = new Date(otherBooking.startTime).getTime();
        const e2 = new Date(otherBooking.endTime).getTime();

        if (Math.max(s1, s2) < Math.min(e1, e2)) {
          return {
            otherUser: otherBooking.user,
            booking: otherBooking
          };
        }
      }
    }
  } catch (error) {
    console.error('[COMPATIBILITY_CHECK_ERROR]:', error);
  }
  return null;
}

// PATCH /api/scheduling - Modify shifts (reassign or swap employees)
export const PATCH = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'reassign') {
      const { bookingId, userId } = body;
      if (!bookingId || !userId) {
        return errorResponse('Required parameters are missing (bookingId, userId).', 400);
      }

      // 1. Fetch the booking
      const booking = await prisma.booking.findUnique({
        where: { id: Number(bookingId) },
        include: { eventType: true },
      });

      if (!booking) {
        return errorResponse(`Booking with ID ${bookingId} not found.`, 404);
      }

      // 2. Fetch the user
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        return errorResponse(`User with ID ${userId} not found.`, 404);
      }

      // Check for Compatibility Conflict
      const conflict = await checkCompatibilityConflict(user.id, booking.startTime, booking.endTime, [booking.id]);
      if (conflict) {
        if (conflict.selfConflict) {
          return errorResponse(`⚠️ DOUBLE SCHEDULING CONFLICT: ${user.name} is already scheduled to work an overlapping shift (${conflict.booking.title}) on this day.`, 400);
        }
        return errorResponse(`⚠️ COMPATIBILITY CONFLICT: ${user.name} and ${conflict.otherUser.name} cannot be scheduled on the same shift.`, 400);
      }

      // 3. Recalculate idempotencyKey and title
      const startVal = new Date(booking.startTime).getTime();
      const endVal = new Date(booking.endTime).getTime();
      const idempotencyKey = uuidv5(`${startVal}.${endVal}.${userId}`);
      const title = `${booking.eventType?.title || 'Shift'} - ${user.name}`;

      // 4. Update the booking
      const updatedBooking = await prisma.booking.update({
        where: { id: Number(bookingId) },
        data: {
          userId: user.id,
          userPrimaryEmail: user.email,
          title,
          idempotencyKey,
        },
        include: {
          eventType: true,
          user: {
            include: {
              verifiedNumbers: true,
            },
          },
        },
      });

      // 5. Log audit event
      try {
        await logEvent({
          type: 'ROSTER_SHIFT_REASSIGNED',
          description: `Reassigned ${title} to ${user.name}`,
          actorId: 'admin-operations-001',
          actorName: 'Admin Operations',
          targetId: String(bookingId),
          severity: 'TACTICAL',
          metadata: {
            bookingId,
            userId,
            title,
            idempotencyKey,
          },
        });
      } catch (logErr) {
        console.error('Audit log error skipped:', logErr);
      }

      return successResponse({
        message: 'Shift successfully reassigned.',
        booking: updatedBooking,
      });

    } else if (action === 'swap') {
      const { bookingId1, bookingId2 } = body;
      if (!bookingId1 || !bookingId2) {
        return errorResponse('Required parameters are missing (bookingId1, bookingId2).', 400);
      }

      // 1. Fetch both bookings
      const booking1 = await prisma.booking.findUnique({
        where: { id: Number(bookingId1) },
        include: { eventType: true },
      });

      const booking2 = await prisma.booking.findUnique({
        where: { id: Number(bookingId2) },
        include: { eventType: true },
      });

      if (!booking1 || !booking2) {
        return errorResponse('One or both bookings could not be found.', 404);
      }

      if (!booking1.userId || !booking2.userId) {
        return errorResponse('Both bookings must be assigned to employees to perform a swap.', 400);
      }

      // 2. Validate same calendar day in America/Chicago
      const d1 = new Date(booking1.startTime);
      const d2 = new Date(booking2.startTime);
      const getChicagoLocalDateString = (d: Date) => {
        return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
      };
      if (getChicagoLocalDateString(d1) !== getChicagoLocalDateString(d2)) {
        return errorResponse('Swaps are strictly constrained to bookings on the same calendar day.', 400);
      }

      // 3. Fetch both users
      const user1 = await prisma.user.findUnique({ where: { id: booking1.userId } });
      const user2 = await prisma.user.findUnique({ where: { id: booking2.userId } });

      if (!user1 || !user2) {
        return errorResponse('One or both assigned users could not be found.', 404);
      }

      // Check Compatibility Conflicts for the swap
      // User 2 is moving to Booking 1
      const conflict1 = await checkCompatibilityConflict(user2.id, booking1.startTime, booking1.endTime, [booking1.id, booking2.id]);
      if (conflict1) {
        if (conflict1.selfConflict) {
          return errorResponse(`⚠️ DOUBLE SCHEDULING CONFLICT: Swapping will put ${user2.name} on an overlapping shift (${conflict1.booking.title}) on this day.`, 400);
        }
        return errorResponse(`⚠️ COMPATIBILITY CONFLICT: Swapping will put ${user2.name} on the same shift with ${conflict1.otherUser.name}.`, 400);
      }

      // User 1 is moving to Booking 2
      const conflict2 = await checkCompatibilityConflict(user1.id, booking2.startTime, booking2.endTime, [booking1.id, booking2.id]);
      if (conflict2) {
        if (conflict2.selfConflict) {
          return errorResponse(`⚠️ DOUBLE SCHEDULING CONFLICT: Swapping will put ${user1.name} on an overlapping shift (${conflict2.booking.title}) on this day.`, 400);
        }
        return errorResponse(`⚠️ COMPATIBILITY CONFLICT: Swapping will put ${user1.name} on the same shift with ${conflict2.otherUser.name}.`, 400);
      }

      // 4. Swap and update inside transaction
      const [updated1, updated2] = await prisma.$transaction(async (tx) => {
        // Booking 1 gets user 2
        const startVal1 = new Date(booking1.startTime).getTime();
        const endVal1 = new Date(booking1.endTime).getTime();
        const idempotencyKey1 = uuidv5(`${startVal1}.${endVal1}.${user2.id}`);
        const title1 = `${booking1.eventType?.title || 'Shift'} - ${user2.name}`;

        // Booking 2 gets user 1
        const startVal2 = new Date(booking2.startTime).getTime();
        const endVal2 = new Date(booking2.endTime).getTime();
        const idempotencyKey2 = uuidv5(`${startVal2}.${endVal2}.${user1.id}`);
        const title2 = `${booking2.eventType?.title || 'Shift'} - ${user1.name}`;

        const b1 = await tx.booking.update({
          where: { id: booking1.id },
          data: {
            userId: user2.id,
            userPrimaryEmail: user2.email,
            title: title1,
            idempotencyKey: idempotencyKey1,
          },
          include: {
            eventType: true,
            user: {
              include: {
                verifiedNumbers: true,
              },
            },
          },
        });

        const b2 = await tx.booking.update({
          where: { id: booking2.id },
          data: {
            userId: user1.id,
            userPrimaryEmail: user1.email,
            title: title2,
            idempotencyKey: idempotencyKey2,
          },
          include: {
            eventType: true,
            user: {
              include: {
                verifiedNumbers: true,
              },
            },
          },
        });

        return [b1, b2];
      });

      // Log audit event
      try {
        await logEvent({
          type: 'ROSTER_SHIFTS_SWAPPED',
          description: `Swapped shifts between ${user1.name} and ${user2.name}`,
          actorId: 'admin-operations-001',
          actorName: 'Admin Operations',
          targetId: `${bookingId1}_${bookingId2}`,
          severity: 'TACTICAL',
          metadata: {
            bookingId1,
            bookingId2,
            userId1: user1.id,
            userId2: user2.id,
          },
        });
      } catch (logErr) {
        console.error('Audit log error skipped:', logErr);
      }

      return successResponse({
        message: 'Shifts successfully swapped.',
        bookings: [updated1, updated2],
      });

    } else {
      return errorResponse(`Action "${action}" is not supported.`, 400);
    }
  } catch (error: any) {
    console.error('[SCHEDULER_PATCH_ERROR]:', error);
    return errorResponse('Failed to update scheduling assignments.', 500, error.message);
  }
};
