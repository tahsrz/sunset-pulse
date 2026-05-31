export type VerifoneTenderType = 'CASH' | 'CREDIT_DEBIT' | 'STORE_ACCOUNT' | 'APP_LENDER';

export type VerifoneEventType =
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_DECLINED'
  | 'VOIDED'
  | 'REFUNDED'
  | 'REVERSAL'
  | 'OFFLINE_MARKED_PAID'
  | 'MANUAL_REVIEW';

export type VerifoneWebhookPayload = {
  eventId: string;
  type: VerifoneEventType;
  orderId?: string;
  pickupCode?: string;
  posTransactionId?: string;
  terminalId?: string;
  tenderType?: VerifoneTenderType;
  authCode?: string;
  amount?: number;
  idVerifiedByCashier?: boolean;
  failureReason?: string;
};

const EVENT_TYPES: VerifoneEventType[] = [
  'PAYMENT_APPROVED',
  'PAYMENT_DECLINED',
  'VOIDED',
  'REFUNDED',
  'REVERSAL',
  'OFFLINE_MARKED_PAID',
  'MANUAL_REVIEW',
];

const TENDER_TYPES: VerifoneTenderType[] = ['CASH', 'CREDIT_DEBIT', 'STORE_ACCOUNT', 'APP_LENDER'];

export const normalizeVerifoneEvent = (payload: any): VerifoneWebhookPayload => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Webhook payload must be a JSON object.');
  }

  if (!payload.eventId || typeof payload.eventId !== 'string') {
    throw new Error('eventId is required.');
  }

  if (!EVENT_TYPES.includes(payload.type)) {
    throw new Error('Unsupported Verifone event type.');
  }

  if (!payload.orderId && !payload.pickupCode) {
    throw new Error('orderId or pickupCode is required.');
  }

  if (payload.tenderType && !TENDER_TYPES.includes(payload.tenderType)) {
    throw new Error('Unsupported tenderType.');
  }

  const amount = payload.amount === undefined ? undefined : Number(payload.amount);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
    throw new Error('amount must be a positive number.');
  }

  return {
    eventId: payload.eventId.trim(),
    type: payload.type,
    orderId: payload.orderId?.trim(),
    pickupCode: payload.pickupCode?.trim(),
    posTransactionId: payload.posTransactionId?.trim(),
    terminalId: payload.terminalId?.trim(),
    tenderType: payload.tenderType,
    authCode: payload.authCode?.trim(),
    amount,
    idVerifiedByCashier: Boolean(payload.idVerifiedByCashier),
    failureReason: payload.failureReason?.trim(),
  };
};
