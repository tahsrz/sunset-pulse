export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { sendSMS, formatWeeklyEmployeeSchedule, formatWeeklyMasterSchedule } from '@/lib/twilio';
import { getChicagoWeekRange } from '@/lib/core/timezone';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader) {
      const secretKey = process.env.SCHEDULER_DISPATCH_SECRET;
      if (!secretKey) {
        return errorResponse('Scheduler dispatch secret is not configured.', 503);
      }

      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== secretKey) {
        console.warn('[WEEKLY_DISPATCH_UNAUTHORIZED]: Unauthorized attempt to trigger weekly dispatch.');
        return errorResponse('Unauthorized: Invalid authorization token.', 401);
      }
    } else {
      const access = await requireOperatorRouteAccess(req);
      if (isAuthResponse(access)) return access;
    }

    let bodyPayload: any = {};
    try {
      bodyPayload = await req.json();
    } catch (e) {
      // Body may be empty, which is completely fine
    }

    const { weekOffset = 0 } = bodyPayload;

    // 3. Compute Monday-Sunday date range localized to America/Chicago
    let startDate: Date;
    let endDate: Date;

    if (bodyPayload.startDate && bodyPayload.endDate) {
      startDate = new Date(bodyPayload.startDate);
      endDate = new Date(bodyPayload.endDate);
    } else {
      const range = getChicagoWeekRange(weekOffset + 1, true);
      startDate = range.start;
      endDate = range.end;
    }

    console.log(`[WEEKLY_DISPATCH]: Processing week of ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // 4. Query Cal.com for active bookings
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'ACCEPTED',
        startTime: {
          gte: startDate,
          lte: endDate,
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
    });

    // 5. Structure schedule maps
    const employeeSchedules: Record<string, {
      name: string;
      phone: string;
      shifts: Array<{ day: string; role: string; time: string }>;
    }> = {};

    const dailyRoster: Record<string, { grill?: string; register?: string }> = {
      Monday: {},
      Tuesday: {},
      Wednesday: {},
      Thursday: {},
      Friday: {},
      Saturday: {},
      Sunday: {},
    };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOrder: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };

    for (const booking of bookings) {
      const user = booking.user;
      if (!user) continue;

      const name = user.name || user.username || 'Employee';
      const phone = user.verifiedNumbers?.[0]?.phoneNumber || null;
      const role = booking.eventType?.slug === 'grill-shift' ? 'Grill Staff' : 'Register Staff';
      const dayName = daysOfWeek[booking.startTime.getDay()];

      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/Chicago',
        });
      };
      const timeRangeStr = `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`;

      // Map to individual roster
      if (phone) {
        if (!employeeSchedules[phone]) {
          employeeSchedules[phone] = { name, phone, shifts: [] };
        }
        employeeSchedules[phone].shifts.push({ day: dayName, role, time: timeRangeStr });
      }

      // Map to daily master roster
      if (dailyRoster[dayName]) {
        const roleKey = booking.eventType?.slug === 'grill-shift' ? 'grill' : 'register';
        dailyRoster[dayName][roleKey] = `${name} (${phone || 'No Phone'})`;
      }
    }

    // Sort personal shifts chronologically
    for (const phone of Object.keys(employeeSchedules)) {
      employeeSchedules[phone].shifts.sort((a, b) => dayOrder[a.day] - dayOrder[b.day]);
    }

    // 6. Dispatch Employee SMS messages Concurrently
    const dispatchResults: Array<{ to: string; name: string; success: boolean; error?: string }> = [];
    const smsPromises = Object.entries(employeeSchedules).map(async ([phone, record]) => {
      const text = formatWeeklyEmployeeSchedule(record.name, record.shifts);
      const res = await sendSMS(phone, text);
      dispatchResults.push({
        to: phone,
        name: record.name,
        success: res.success,
        error: res.error,
      });
    });
    await Promise.all(smsPromises);

    // 7. Dispatch Master Digest SMS to Manager/Admin
    const fallbackPhone = process.env.FALLBACK_NOTIFICATION_PHONE;
    let masterSent = false;
    let masterError = null;

    if (fallbackPhone) {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'America/Chicago' };
      const startStr = startDate.toLocaleDateString('en-US', options);
      const endStr = endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' });
      const rangeStr = `${startStr} - ${endStr}`;

      const masterText = formatWeeklyMasterSchedule(rangeStr, dailyRoster);
      const masterRes = await sendSMS(fallbackPhone, masterText);
      masterSent = masterRes.success;
      masterError = masterRes.error || null;
    } else {
      console.warn('[WEEKLY_DISPATCH_WARNING]: No FALLBACK_NOTIFICATION_PHONE environment variable configured.');
    }

    return successResponse({
      message: 'Weekly schedule dispatch complete.',
      timeframe: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      bookingsProcessed: bookings.length,
      dispatches: dispatchResults,
      masterDispatch: {
        sent: masterSent,
        to: fallbackPhone || null,
        error: masterError,
      },
    });

  } catch (error: any) {
    console.error('[WEEKLY_DISPATCH_ERROR]:', error);
    return errorResponse('Critical failure during schedule compilation and dispatch.', 500, error.message);
  }
}
