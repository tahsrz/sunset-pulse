export type OrderPaymentState =
  | 'paid_online'
  | 'paid_pos'
  | 'pending_pos'
  | 'unpaid_counter'
  | 'partial_issue'
  | 'refunded'
  | 'voided'
  | 'manual_review';

export type RestrictedCategory = 'tobacco' | 'alcohol' | 'lotto' | 'fuel' | 'none';

export type VerifiableOrderItem = {
  name: string;
  quantity: number;
  price?: number;
  ageRestricted?: boolean;
  minimumAge?: 18 | 21;
  restrictedCategory?: RestrictedCategory;
};

export type VerifiablePickupOrder = {
  id: string;
  pickupCode: string;
  customerName?: string;
  paymentState: OrderPaymentState;
  paymentReference?: string;
  totalAmount: number;
  items: VerifiableOrderItem[];
  releasedAt?: string;
  idVerifiedAt?: string;
};

export const orderRequiresVerification = (order: VerifiablePickupOrder) =>
  order.items.some((item) => item.ageRestricted || (item.minimumAge || 0) >= 18);

export const orderMinimumAge = (order: VerifiablePickupOrder) =>
  order.items.reduce((age, item) => Math.max(age, item.minimumAge || 0), 0);
