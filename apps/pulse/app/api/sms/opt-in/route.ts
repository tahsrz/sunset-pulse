import { z } from 'zod';
import connectDB from '@/lib/core/database';
import SmsOptIn from '@/models/SmsOptIn';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { errorResponse, successResponse, validationErrorResponse } from '@/lib/core/apiResponse';

export const SMS_OPT_IN_CONSENT_TEXT =
  'I agree to receive recurring automated SMS/text messages from Sunset Pulse about property updates, scheduling, grill/order updates, and local offers at the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe and HELP for help. Consent is not a condition of purchase.';

const SmsOptInSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  phone: z.string().trim().min(7, 'Enter a valid mobile phone number'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'SMS consent is required.' }),
  }),
  source: z.string().trim().max(80).optional().or(z.literal('')),
});

function normalizePhone(rawPhone: string) {
  const trimmed = rawPhone.trim();
  if (trimmed.startsWith('+')) {
    const e164 = `+${trimmed.replace(/\D/g, '')}`;
    return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = SmsOptInSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const phone = normalizePhone(validation.data.phone);
    if (!phone) {
      return validationErrorResponse({ phone: ['Enter a valid US mobile phone number or E.164 number.'] });
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous';
    const limitResponse = await applyApiRateLimit(`sms-opt-in-${ipAddress}`, 5);
    if (limitResponse) return limitResponse;

    await connectDB();

    const now = new Date();
    const record = await SmsOptIn.findOneAndUpdate(
      { phone },
      {
        $set: {
          name: validation.data.name || '',
          email: validation.data.email || '',
          phone,
          status: 'opted_in',
          source: validation.data.source || 'sms-opt-in-webform',
          consentText: SMS_OPT_IN_CONSENT_TEXT,
          termsVersion: '2026-06-12',
          consentedAt: now,
          optedOutAt: null,
          ipAddress,
          userAgent: request.headers.get('user-agent') || '',
          metadata: {
            page: '/sms-opt-in',
            submittedAt: now.toISOString(),
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return successResponse({
      message: 'SMS opt-in recorded.',
      phone: record.phone,
      status: record.status,
      consentedAt: record.consentedAt,
    });
  } catch (error: any) {
    console.error('[SMS_OPT_IN_POST_ERROR]:', error);
    return errorResponse('Failed to record SMS opt-in.', 500, error.message);
  }
}
