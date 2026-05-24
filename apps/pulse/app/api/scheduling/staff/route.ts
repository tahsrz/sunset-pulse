export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@calcom/prisma';
import crypto from 'node:crypto';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

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

// POST /api/scheduling/staff - Enroll a new staff member (employee)
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    // Strict validation
    if (!name || !name.trim()) {
      return errorResponse('Required parameter is missing: name is required.', 400);
    }
    if (!email || !email.trim()) {
      return errorResponse('Required parameter is missing: email is required.', 400);
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone ? phone.trim() : '';

    // Generate unique slugified username
    const username = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(100 + Math.random() * 900);

    // Create user and associated verified number in a secure transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          username,
          timeZone: 'America/Chicago',
        },
      });

      if (trimmedPhone) {
        await tx.verifiedNumber.create({
          data: {
            userId: user.id,
            phoneNumber: trimmedPhone,
          },
        });
      }

      return user;
    });

    return successResponse({
      message: 'Employee successfully enrolled.',
      user: newUser,
    }, 201);

  } catch (error: any) {
    console.error('[STAFF_POST_ERROR]:', error);
    if (error.code === 'P2002') {
      return errorResponse('An employee with this email address already exists in the system.', 400);
    }
    return errorResponse('Failed to enroll employee.', 500, error.message);
  }
};

// DELETE /api/scheduling/staff - Remove an employee and safely unassign their shifts
export const DELETE = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return errorResponse('Required parameter is missing: userId is required.', 400);
    }

    const targetUserId = Number(userId);

    // Verify employee exists
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return errorResponse(`Employee with ID ${userId} could not be found.`, 404);
    }

    // Fetch all shifts currently assigned to this employee
    const bookings = await prisma.booking.findMany({
      where: { userId: targetUserId },
      include: { eventType: true },
    });

    // Perform atomic cleanup and deletion
    await prisma.$transaction(async (tx) => {
      for (const booking of bookings) {
        const startVal = new Date(booking.startTime).getTime();
        const endVal = new Date(booking.endTime).getTime();
        
        // SECURITY / UNIQUE INDEX REMEDIAL ACTION:
        // We include eventTypeId inside the unassigned UUID v5 generation to ensure two simultaneous 
        // unassigned shifts (e.g. Grill and Register) do not crash due to an idempotencyKey unique index clash.
        const eventTypeId = booking.eventTypeId || 0;
        const newIdempotencyKey = uuidv5(`${startVal}.${endVal}.${eventTypeId}.unassigned`);
        
        // Strip the user suffix from booking title
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

      // Explicitly delete verified numbers
      await tx.verifiedNumber.deleteMany({
        where: { userId: targetUserId },
      });

      // Delete the employee User record
      await tx.user.delete({
        where: { id: targetUserId },
      });
    });

    return successResponse({
      message: `Employee ${user.name} has been successfully decommissioned. ${bookings.length} shifts reverted to unassigned.`,
    });

  } catch (error: any) {
    console.error('[STAFF_DELETE_ERROR]:', error);
    return errorResponse('Failed to remove employee.', 500, error.message);
  }
};
