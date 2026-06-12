import { z } from 'zod';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { sendContactEmail } from '@/lib/core/contactEmail';

const ContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  message: z.string().min(5, 'Message must be at least 5 characters'),
});

export const POST = async (request: Request) => {
  try {
    const body = await request.json();

    const validation = ContactSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const { name, email, message } = validation.data;

    // Use IP for rate limiting since user might be anonymous
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const limitResponse = await applyApiRateLimit(`contact-${ip}`, 3); // 3 per minute
    if (limitResponse) return limitResponse;

    const result = await sendContactEmail({ name, email, message });

    if (result.success === false) {
      return errorResponse(result.reason, result.status || 500);
    }

    return successResponse({ message: 'Message sent successfully.' });
  } catch (error: any) {
    console.error('[CONTACT_POST_ERROR]:', error);
    return errorResponse('Failed to process contact request.', 500, error.message);
  }
};
