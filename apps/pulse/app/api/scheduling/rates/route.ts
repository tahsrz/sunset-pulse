export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import fs from 'fs/promises';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'config/hourly-rates.json');

// Helper to safely read rates
async function readRates(): Promise<Record<string, number>> {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    // If file doesn't exist, return empty object
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

// Helper to safely write rates
async function writeRates(rates: Record<string, number>) {
  // Ensure the directory exists
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(rates, null, 2), 'utf8');
}

// GET /api/scheduling/rates - Fetch all employee hourly rates
export const GET = async (request: NextRequest) => {
  try {
    const rates = await readRates();
    return successResponse({ rates });
  } catch (error: any) {
    console.error('[RATES_GET_ERROR]:', error);
    return errorResponse('Failed to fetch hourly rates.', 500, error.message);
  }
};

// POST /api/scheduling/rates - Update or delete an employee's custom hourly rate
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { email, rate } = body;

    if (!email || !email.trim()) {
      return errorResponse('Required parameter is missing: email is required.', 400);
    }

    const trimmedEmail = email.trim().toLowerCase();
    const rates = await readRates();

    if (rate === null || rate === undefined || isNaN(Number(rate)) || Number(rate) < 0) {
      // If rate is null/invalid, delete custom rate (falls back to default shift rates)
      delete rates[trimmedEmail];
      await writeRates(rates);
      return successResponse({
        message: `Custom hourly rate for ${trimmedEmail} removed.`,
        rates,
      });
    }

    const numericRate = Number(rate);
    rates[trimmedEmail] = numericRate;

    await writeRates(rates);
    return successResponse({
      message: `Hourly rate for ${trimmedEmail} updated to $${numericRate.toFixed(2)}/hr.`,
      rates,
    }, 200);

  } catch (error: any) {
    console.error('[RATES_POST_ERROR]:', error);
    return errorResponse('Failed to update hourly rates.', 500, error.message);
  }
};
