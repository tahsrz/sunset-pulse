import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/core/getSessionUser';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import { validateAndFetchCoupon } from '@/lib/grill/coupons';

export const dynamic = 'force-dynamic';

/**
 * POST /api/coupons/validate
 * Validates a coupon code for the current user.
 */
export const POST = async (request: NextRequest) => {
  try {
    const { code } = await request.json();
    if (!code) {
      return errorResponse('Coupon code is required.', 400);
    }

    const sessionUser = await getSessionUser();
    const deal = await validateAndFetchCoupon(code, sessionUser?.userId);

    if (!deal) {
      return errorResponse('Invalid or expired coupon code.', 404);
    }

    return successResponse(deal);
  } catch (error: any) {
    console.error('[COUPON_VALIDATION_FAILURE]:', error);
    return errorResponse('Failed to validate coupon.', 500, error.message);
  }
};
