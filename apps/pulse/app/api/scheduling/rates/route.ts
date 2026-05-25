export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/core/apiResponse';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { logEvent } from '@/lib/supabase';
import { prisma } from '@calcom/prisma';
import fs from 'fs/promises';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'config/hourly-rates.json');

// Helper to safely read static default/legacy rates from the config file (read-only fallback)
async function readStaticRates(): Promise<Record<string, number>> {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.warn('[STATIC_RATES_READ_WARNING]: Could not read static rates file:', error.message);
    return {};
  }
}

// Compile rates by merging static rates and custom rates from the database user metadata
async function compileRates(): Promise<Record<string, number>> {
  // 1. Read static rates from config file
  const staticRates = await readStaticRates();
  
  // 2. Fetch all users from the database
  const users = await prisma.user.findMany({
    select: {
      email: true,
      metadata: true,
    },
  });

  const mergedRates: Record<string, number> = { ...staticRates };

  for (const user of users) {
    if (user.email && user.metadata && typeof user.metadata === 'object' && !Array.isArray(user.metadata)) {
      const metadataObj = user.metadata as Record<string, any>;
      if (metadataObj.hourlyRate !== undefined && metadataObj.hourlyRate !== null) {
        const rate = Number(metadataObj.hourlyRate);
        if (!isNaN(rate)) {
          mergedRates[user.email.toLowerCase().trim()] = rate;
        }
      }
    }
  }

  return mergedRates;
}

// GET /api/scheduling/rates - Fetch all employee hourly rates
export const GET = async (request: NextRequest) => {
  try {
    const rates = await compileRates();
    return successResponse({ rates });
  } catch (error: any) {
    console.error('[RATES_GET_ERROR]:', error);
    return errorResponse('Failed to fetch hourly rates.', 500, error.message);
  }
};

// POST /api/scheduling/rates - Update or delete an employee's custom hourly rate
export const POST = async (request: NextRequest) => {
  try {
    // Anyone is authorized to modify employee hourly rates (no authentication or role restrictions)
    const activeSession = await getSessionUser();
    const sessionUser = activeSession || {
      userId: 'anonymous-operator',
      user: {
        id: 'anonymous-operator',
        name: 'Anonymous Operator',
        email: 'anonymous@sunsetpulse.com'
      }
    };

    const body = await request.json();
    const { email, rate } = body;

    if (!email || !email.trim()) {
      return errorResponse('Required parameter is missing: email is required.', 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Verify employee (User) exists in the database
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return errorResponse(`Employee with email ${trimmedEmail} could not be found.`, 404);
    }

    const currentMetadata = (user.metadata && typeof user.metadata === 'object' && !Array.isArray(user.metadata))
      ? { ...(user.metadata as Record<string, any>) }
      : {};

    if (rate === null || rate === undefined || isNaN(Number(rate)) || Number(rate) < 0) {
      // Remove custom hourly rate from metadata
      delete currentMetadata.hourlyRate;

      await prisma.user.update({
        where: { id: user.id },
        data: { metadata: currentMetadata },
      });

      // Log audit event
      try {
        await logEvent({
          type: 'ROSTER_RATE_REMOVED',
          description: `Removed custom hourly rate for ${trimmedEmail} by admin operator ${sessionUser.user.name}`,
          actorId: sessionUser.userId,
          actorName: sessionUser.user.name,
          targetId: String(user.id),
          severity: 'TACTICAL',
          metadata: {
            employeeId: user.id,
            employeeEmail: trimmedEmail,
            operatorEmail: sessionUser.user.email,
          },
        });
      } catch (logErr) {
        console.error('Audit log error skipped:', logErr);
      }

      const rates = await compileRates();
      return successResponse({
        message: `Custom hourly rate for ${trimmedEmail} removed.`,
        rates,
      });
    }

    const numericRate = Number(rate);
    currentMetadata.hourlyRate = numericRate;

    await prisma.user.update({
      where: { id: user.id },
      data: { metadata: currentMetadata },
    });

    // Log audit event
    try {
      await logEvent({
        type: 'ROSTER_RATE_UPDATED',
        description: `Updated hourly rate for ${trimmedEmail} to $${numericRate.toFixed(2)}/hr by admin operator ${sessionUser.user.name}`,
        actorId: sessionUser.userId,
        actorName: sessionUser.user.name,
        targetId: String(user.id),
        severity: 'TACTICAL',
        metadata: {
          employeeId: user.id,
          employeeEmail: trimmedEmail,
          hourlyRate: numericRate,
          operatorEmail: sessionUser.user.email,
        },
      });
    } catch (logErr) {
      console.error('Audit log error skipped:', logErr);
    }

    const rates = await compileRates();
    return successResponse({
      message: `Hourly rate for ${trimmedEmail} updated to $${numericRate.toFixed(2)}/hr.`,
      rates,
    }, 200);

  } catch (error: any) {
    console.error('[RATES_POST_ERROR]:', error);
    return errorResponse('Failed to update hourly rates.', 500, error.message);
  }
};
