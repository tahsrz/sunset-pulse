import { describe, expect, it } from 'vitest';
import {
  calculateCartPricing,
  calculateCartSubtotal,
  getDealByCode,
  normalizeCouponCode,
} from '@/lib/grill/deals';

describe('grill cart deals and coupons', () => {
  const items = [
    { id: 'burger', name: 'Cheeseburger Basket', price: 9.99, quantity: 2 },
    { id: 'delivery-fee', name: 'Mailbox Delivery Fee', price: 10, quantity: 1, discountEligible: false },
  ];

  it('normalizes coupon codes and resolves active deals', () => {
    expect(normalizeCouponCode(' free drink! ')).toBe('FREEDRINK');
    expect(getDealByCode('sunset1')?.code).toBe('SUNSET1');
    expect(getDealByCode('missing')).toBeNull();
  });

  it('calculates subtotal from cart lines', () => {
    expect(calculateCartSubtotal(items)).toBe(29.98);
  });

  it('applies one fixed amount discount without discounting ineligible delivery fees', () => {
    const pricing = calculateCartPricing(items, 'SUNSET1');

    expect(pricing.subtotalAmount).toBe(29.98);
    expect(pricing.discountAmount).toBe(1);
    expect(pricing.totalAmount).toBe(28.98);
    expect(pricing.appliedDeal?.code).toBe('SUNSET1');
  });

  it('applies percent discounts against eligible items only', () => {
    const pricing = calculateCartPricing(items, 'BASKET10');

    expect(pricing.discountAmount).toBe(2);
    expect(pricing.totalAmount).toBe(27.98);
  });

  it('supports reward-only coupons without changing the charge total', () => {
    const pricing = calculateCartPricing(items, 'FREEDRINK');

    expect(pricing.discountAmount).toBe(0);
    expect(pricing.totalAmount).toBe(29.98);
    expect(pricing.appliedDeal?.freeItemName).toBe('Fountain drink');
  });
});
