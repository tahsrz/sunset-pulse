export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import crypto from 'node:crypto';
import path from 'path';
import fs from 'fs/promises';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

import { getChicagoWeekRange } from '@/lib/core/timezone';

// Static JSON import for robust production fallback
import compatibilityRulesJson from '@/config/compatibility-rules.json';

// Deterministic UUID v5 generator
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

// Compute Monday-Sunday date range based on weekOffset localized to America/Chicago
function getWeekRange(weekOffset: number) {
  return getChicagoWeekRange(weekOffset, false);
}

// Helper to check for compatibility and double-scheduling conflicts inside bulk operations
async function checkConflictForBulk(
  userId: number,
  startTime: Date,
  endTime: Date,
  ignoreBookingIds: number[],
  tentativeUpdates: Record<number, number | null>, // map of bookingId -> userId for in-flight transaction updates
  allBookings: any[],
  conflicts: any[]
) {
  const getChicagoLocalDateString = (d: Date) => {
    return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
  };
  const targetDayStr = getChicagoLocalDateString(startTime);

  // Filter bookings to those on the same calendar day (with pending changes applied in memory)
  const sameDayBookings = allBookings.filter((b) => {
    if (ignoreBookingIds.includes(b.id)) return false;
    const bookingDay = getChicagoLocalDateString(new Date(b.startTime));
    if (bookingDay !== targetDayStr) return false;

    // Resolve userId including tentative changes
    const activeUserId = tentativeUpdates[b.id] !== undefined ? tentativeUpdates[b.id] : b.userId;
    return activeUserId !== null;
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { conflict: true, reason: 'Employee not found' };

  // 1. Check double-scheduling overlap (self-conflict)
  for (const other of sameDayBookings) {
    const activeUserId = tentativeUpdates[other.id] !== undefined ? tentativeUpdates[other.id] : other.userId;
    if (activeUserId === userId) {
      const s1 = new Date(startTime).getTime();
      const e1 = new Date(endTime).getTime();
      const s2 = new Date(other.startTime).getTime();
      const e2 = new Date(other.endTime).getTime();

      if (Math.max(s1, s2) < Math.min(e1, e2)) {
        return {
          conflict: true,
          reason: `⚠️ DOUBLE SCHEDULING: Already scheduled on overlapping shift (${other.title}) on this day.`,
        };
      }
    }
  }

  // 2. Check compatibility exclusions
  if (conflicts.length > 0) {
    const userEmail = user.email.toLowerCase();
    const conflictingEmails = conflicts.reduce((emails: string[], c: any) => {
      const e1 = c.email1.trim().toLowerCase();
      const e2 = c.email2.trim().toLowerCase();
      if (e1 === userEmail) emails.push(e2);
      if (e2 === userEmail) emails.push(e1);
      return emails;
    }, []);

    if (conflictingEmails.length > 0) {
      for (const other of sameDayBookings) {
        let otherUserEmail = other.user?.email || '';
        if (!otherUserEmail && other.userId) {
          // If in-memory, fetch email or resolve
          const dbUser = await prisma.user.findUnique({ where: { id: other.userId } });
          otherUserEmail = dbUser?.email || '';
        }
        otherUserEmail = otherUserEmail.toLowerCase();

        if (conflictingEmails.includes(otherUserEmail)) {
          const s1 = new Date(startTime).getTime();
          const e1 = new Date(endTime).getTime();
          const s2 = new Date(other.startTime).getTime();
          const e2 = new Date(other.endTime).getTime();

          if (Math.max(s1, s2) < Math.min(e1, e2)) {
            const dbOtherUser = await prisma.user.findUnique({
              where: { email: otherUserEmail },
            });
            return {
              conflict: true,
              reason: `⚠️ COMPATIBILITY CONFLICT: Cannot work with ${dbOtherUser?.name || 'conflicting employee'} on overlapping shifts.`,
            };
          }
        }
      }
    }
  }

  return null;
}

// POST /api/scheduling/bulk - Process bulk operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, weekOffset } = body;

    if (weekOffset === undefined || weekOffset === null) {
      return errorResponse('Required parameter is missing: weekOffset is required.', 400);
    }

    const offsetVal = Number(weekOffset);

    if (action === 'clear') {
      const { start, end } = getWeekRange(offsetVal);

      // Fetch target bookings
      const bookings = await prisma.booking.findMany({
        where: {
          startTime: { gte: start, lte: end },
          eventType: { slug: { in: ['grill-shift', 'register-shift'] } },
        },
        include: { eventType: true },
      });

      if (bookings.length === 0) {
        return successResponse({
          message: 'No active shifts found to clear for this week range.',
          clearedCount: 0,
        });
      }

      // Bulk clear inside transaction
      await prisma.$transaction(async (tx) => {
        for (const booking of bookings) {
          const startVal = new Date(booking.startTime).getTime();
          const endVal = new Date(booking.endTime).getTime();
          const eventTypeId = booking.eventTypeId || 0;
          const newIdempotencyKey = uuidv5(`${startVal}.${endVal}.${eventTypeId}.unassigned`);
          const baseTitle = booking.eventType?.title || 'Shift';

          await tx.booking.update({
            where: { id: booking.id },
            data: {
              userId: null,
              userPrimaryEmail: null,
              title: baseTitle,
              idempotencyKey: newIdempotencyKey,
            },
          });
        }
      });

      return successResponse({
        message: `Successfully cleared assignments for ${bookings.length} shifts.`,
        clearedCount: bookings.length,
      });

    } else if (action === 'clone') {
      const sourceRange = getWeekRange(offsetVal - 1);
      const targetRange = getWeekRange(offsetVal);

      // Load compatibility exclusions (with static import fallback)
      let conflicts: any[] = [];
      try {
        const configPath = path.resolve(process.cwd(), 'config/compatibility-rules.json');
        const data = await fs.readFile(configPath, 'utf8');
        conflicts = JSON.parse(data);
      } catch {
        conflicts = compatibilityRulesJson;
      }

      // Fetch bookings for source and target weeks
      const sourceBookings = await prisma.booking.findMany({
        where: {
          startTime: { gte: sourceRange.start, lte: sourceRange.end },
          eventType: { slug: { in: ['grill-shift', 'register-shift'] } },
        },
        include: { eventType: true, user: true },
      });

      const targetBookings = await prisma.booking.findMany({
        where: {
          startTime: { gte: targetRange.start, lte: targetRange.end },
          eventType: { slug: { in: ['grill-shift', 'register-shift'] } },
        },
        include: { eventType: true, user: true },
      });

      if (sourceBookings.length === 0) {
        return errorResponse('Previous week has no scheduled shifts to copy assignments from.', 400);
      }
      if (targetBookings.length === 0) {
        return errorResponse('Target active week has no shifts initialized.', 400);
      }

      // Organize shifts by day and slot index
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      const getShiftsByDayAndRole = (bookingsList: any[]) => {
        const map: Record<string, Record<string, any[]>> = {};
        for (const b of bookingsList) {
          const d = daysOfWeek[new Date(b.startTime).getDay()];
          const slug = b.eventType?.slug || 'shift';
          if (!map[d]) map[d] = {};
          if (!map[d][slug]) map[d][slug] = [];
          map[d][slug].push(b);
        }

        // Sort shifts chronologically within each day/role
        for (const d of Object.keys(map)) {
          for (const s of Object.keys(map[d])) {
            map[d][s].sort((a, b) => {
              const t1 = new Date(a.startTime).getHours() * 60 + new Date(a.startTime).getMinutes();
              const t2 = new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes();
              return t1 - t2;
            });
          }
        }
        return map;
      };

      const sourceMapped = getShiftsByDayAndRole(sourceBookings);
      const targetMapped = getShiftsByDayAndRole(targetBookings);

      const tentativeUpdates: Record<number, number | null> = {};
      const operations: Array<{ targetBooking: any; sourceUser: any }> = [];
      const skippedAlerts: Array<{ shiftTitle: string; day: string; userName: string; reason: string }> = [];

      // Align source and target shifts and validate conflicts
      for (const day of daysOfWeek) {
        if (!targetMapped[day] || !sourceMapped[day]) continue;

        for (const slug of ['grill-shift', 'register-shift']) {
          const targetList = targetMapped[day][slug] || [];
          const sourceList = sourceMapped[day][slug] || [];

          // Match index-by-index
          const maxMatch = Math.min(targetList.length, sourceList.length);
          for (let i = 0; i < maxMatch; i++) {
            const targetShift = targetList[i];
            const sourceShift = sourceList[i];

            if (sourceShift.userId && sourceShift.user) {
              const employeeId = sourceShift.userId;
              const employeeName = sourceShift.user.name;

              // Check conflict on target shift
              const conflict = await checkConflictForBulk(
                employeeId,
                new Date(targetShift.startTime),
                new Date(targetShift.endTime),
                [targetShift.id],
                tentativeUpdates,
                targetBookings,
                conflicts
              );

              if (conflict) {
                skippedAlerts.push({
                  shiftTitle: targetShift.eventType?.title || 'Shift',
                  day,
                  userName: employeeName,
                  reason: conflict.reason,
                });
              } else {
                // Keep track of planned update in memory for subsequent loop validations
                tentativeUpdates[targetShift.id] = employeeId;
                operations.push({
                  targetBooking: targetShift,
                  sourceUser: sourceShift.user,
                });
              }
            }
          }
        }
      }

      if (operations.length === 0 && skippedAlerts.length > 0) {
        return errorResponse(
          `Failed to clone previous roster. Every matched assignment resulted in a compatibility or double-scheduling conflict.`,
          400,
          skippedAlerts
        );
      }

      // Execute atomic updates in a transaction
      await prisma.$transaction(async (tx) => {
        for (const op of operations) {
          const { targetBooking, sourceUser } = op;
          const startVal = new Date(targetBooking.startTime).getTime();
          const endVal = new Date(targetBooking.endTime).getTime();
          const idempotencyKey = uuidv5(`${startVal}.${endVal}.${sourceUser.id}`);
          const title = `${targetBooking.eventType?.title || 'Shift'} - ${sourceUser.name}`;

          await tx.booking.update({
            where: { id: targetBooking.id },
            data: {
              userId: sourceUser.id,
              userPrimaryEmail: sourceUser.email,
              title,
              idempotencyKey,
            },
          });
        }
      });

      return successResponse({
        message: `Successfully cloned previous week's roster assignments onto ${operations.length} shifts.`,
        clonedCount: operations.length,
        skippedCount: skippedAlerts.length,
        skipped: skippedAlerts,
      });

    } else {
      return errorResponse(`Action "${action}" is not supported.`, 400);
    }
  } catch (error: any) {
    console.error('[SCHEDULER_BULK_ERROR]:', error);
    return errorResponse('Failed to execute bulk roster action.', 500, error.message);
  }
}
