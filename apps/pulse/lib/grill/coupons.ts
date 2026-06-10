import connectDB from '@/lib/core/database';
import Coupon from '@/models/Coupon';
import Order from '@/models/Order';
import { normalizeCouponCode, type DealDefinition } from './deals';

/**
 * Validates a coupon code against the database.
 * Checks for: existence, isActive, expiresAt, usageLimit, and firstOrderOnly.
 */
export async function validateAndFetchCoupon(code: string, userId?: string): Promise<DealDefinition | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  await connectDB();
  const coupon = await Coupon.findOne({ code: normalized, isActive: true });

  if (!coupon) return null;

  // Check expiration
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    console.warn(`[COUPON_VALIDATION] Code ${normalized} expired at ${coupon.expiresAt}`);
    return null;
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    console.warn(`[COUPON_VALIDATION] Code ${normalized} reached usage limit of ${coupon.usageLimit}`);
    return null;
  }

  // Check first order only
  if (coupon.firstOrderOnly) {
    if (!userId) {
      console.warn(`[COUPON_VALIDATION] Code ${normalized} is first-order only, but no userId provided.`);
      return null;
    }
    const previousOrders = await Order.countDocuments({ 
      user: userId, 
      isPaid: true 
    });
    if (previousOrders > 0) {
      console.warn(`[COUPON_VALIDATION] Code ${normalized} rejected for user ${userId} (already has ${previousOrders} paid orders).`);
      return null;
    }
  }

  return {
    code: coupon.code,
    label: coupon.label,
    description: coupon.description,
    type: coupon.type,
    amountOff: coupon.amountOff,
    percentOff: coupon.percentOff,
    freeItemName: coupon.freeItemName,
    minimumSubtotal: coupon.minimumSubtotal,
    maxDiscount: coupon.maxDiscount,
  };
}

/**
 * Automatically identifies and returns a first-order discount if applicable.
 */
export async function getAutoFirstOrderDiscount(userId: string): Promise<DealDefinition | null> {
  if (!userId) return null;
  
  await connectDB();
  const previousOrders = await Order.countDocuments({ user: userId, isPaid: true });
  
  if (previousOrders === 0) {
    // Look for a designated first-order coupon (e.g., code: 'FIRST10')
    const firstOrderCoupon = await Coupon.findOne({ code: 'FIRST10', isActive: true });
    if (firstOrderCoupon) {
      return {
        code: firstOrderCoupon.code,
        label: firstOrderCoupon.label,
        description: firstOrderCoupon.description,
        type: firstOrderCoupon.type,
        amountOff: firstOrderCoupon.amountOff,
        percentOff: firstOrderCoupon.percentOff,
        freeItemName: firstOrderCoupon.freeItemName,
        minimumSubtotal: firstOrderCoupon.minimumSubtotal,
        maxDiscount: firstOrderCoupon.maxDiscount,
      };
    }
  }
  
  return null;
}
