export type DealType = 'fixed_amount' | 'percent' | 'free_item';

export type CartPricingItem = {
  id?: string;
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  discountEligible?: boolean;
};

export type DealDefinition = {
  code: string;
  label: string;
  description: string;
  type: DealType;
  amountOff?: number;
  percentOff?: number;
  freeItemName?: string;
  minimumSubtotal?: number;
  maxDiscount?: number;
};

export type AppliedDeal = {
  code: string;
  label: string;
  description: string;
  type: DealType;
  discountAmount: number;
  freeItemName?: string;
};

export type CartPricingSummary = {
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  appliedDeal: AppliedDeal | null;
};

export const DEALS: DealDefinition[] = [
  {
    code: 'FREEDRINK',
    label: 'Free drink at pickup',
    description: 'Launch offer: get a free drink when you pick up your online order.',
    type: 'free_item',
    freeItemName: 'Fountain drink',
  },
  {
    code: 'SUNSET1',
    label: '$1 off online order',
    description: 'Take $1 off today\'s Sunset Grill online order.',
    type: 'fixed_amount',
    amountOff: 1,
  },
  {
    code: 'BASKET10',
    label: '10% off online order',
    description: 'Take 10% off one Sunset Grill online order.',
    type: 'percent',
    percentOff: 10,
    maxDiscount: 5,
  },
];

export function normalizeCouponCode(code?: string | null) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

export function getDealByCode(code?: string | null) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  return DEALS.find((deal) => deal.code === normalized) || null;
}

export function calculateCartSubtotal(items: CartPricingItem[] = []) {
  return roundCurrency(items.reduce((sum, item) => {
    const price = Math.max(0, Number(item.price) || 0);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    return sum + price * quantity;
  }, 0));
}

export function calculateCartPricing(items: CartPricingItem[] = [], couponCode?: string | null): CartPricingSummary {
  const subtotalAmount = calculateCartSubtotal(items);
  const eligibleSubtotalAmount = calculateCartSubtotal(items.filter((item) => item.discountEligible !== false));
  const deal = getDealByCode(couponCode);

  if (!deal) {
    return {
      subtotalAmount,
      discountAmount: 0,
      totalAmount: subtotalAmount,
      appliedDeal: null,
    };
  }

  if (deal.minimumSubtotal && eligibleSubtotalAmount < deal.minimumSubtotal) {
    throw new Error(`${deal.code} requires a minimum subtotal of $${deal.minimumSubtotal.toFixed(2)}.`);
  }

  const discountAmount = calculateDiscountAmount(eligibleSubtotalAmount, deal);

  return {
    subtotalAmount,
    discountAmount,
    totalAmount: roundCurrency(Math.max(0, subtotalAmount - discountAmount)),
    appliedDeal: {
      code: deal.code,
      label: deal.label,
      description: deal.description,
      type: deal.type,
      discountAmount,
      freeItemName: deal.freeItemName,
    },
  };
}

function calculateDiscountAmount(subtotalAmount: number, deal: DealDefinition) {
  if (deal.type === 'free_item') return 0;

  if (deal.type === 'fixed_amount') {
    return roundCurrency(Math.min(subtotalAmount, Math.max(0, deal.amountOff || 0)));
  }

  const percentDiscount = subtotalAmount * Math.max(0, deal.percentOff || 0) / 100;
  const cappedDiscount = deal.maxDiscount
    ? Math.min(percentDiscount, deal.maxDiscount)
    : percentDiscount;

  return roundCurrency(Math.min(subtotalAmount, cappedDiscount));
}

function roundCurrency(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
