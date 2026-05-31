import type { VerifoneWebhookPayload } from './events';

export type PulsePaymentState =
  | 'UNPAID'
  | 'PENDING_POS_TENDER'
  | 'PAID_STRIPE'
  | 'PAID_POS'
  | 'PAYMENT_FAILED'
  | 'REFUNDED'
  | 'VOIDED'
  | 'MANUAL_REVIEW';

export const deriveLegacyIsPaid = (paymentState?: PulsePaymentState, isPaid?: boolean) =>
  paymentState === 'PAID_POS' || paymentState === 'PAID_STRIPE' || Boolean(isPaid);

export const applyVerifoneEventToOrder = (event: VerifoneWebhookPayload, rawDigest: string) => {
  const updates: Record<string, any> = {
    'posProperties.lastSyncedAt': new Date(),
  };

  if (event.posTransactionId) updates['posProperties.posTransactionId'] = event.posTransactionId;
  if (event.terminalId) updates['posProperties.terminalId'] = event.terminalId;
  if (event.tenderType) updates['posProperties.tenderType'] = event.tenderType;
  if (event.authCode) updates['posProperties.authCode'] = event.authCode;
  if (event.idVerifiedByCashier) updates['posProperties.idVerifiedByCashier'] = true;
  if (event.failureReason) updates['posProperties.failureReason'] = event.failureReason;

  if (event.type === 'PAYMENT_APPROVED' || event.type === 'OFFLINE_MARKED_PAID') {
    updates.paymentState = 'PAID_POS';
    updates.isPaid = true;
    updates['posProperties.posSyncStatus'] = 'SYNCED';
    updates.paymentReference = event.authCode
      ? `Verifone ${event.authCode}`
      : event.posTransactionId
        ? `Verifone ${event.posTransactionId.slice(-8)}`
        : 'Verifone POS';
  }

  if (event.type === 'PAYMENT_DECLINED') {
    updates.paymentState = 'PAYMENT_FAILED';
    updates.isPaid = false;
    updates['posProperties.posSyncStatus'] = 'FAILED';
  }

  if (event.type === 'VOIDED') {
    updates.paymentState = 'VOIDED';
    updates.isPaid = false;
    updates['posProperties.posSyncStatus'] = 'REVERSED';
  }

  if (event.type === 'REFUNDED' || event.type === 'REVERSAL') {
    updates.paymentState = 'REFUNDED';
    updates.isPaid = false;
    updates['posProperties.posSyncStatus'] = 'REVERSED';
  }

  if (event.type === 'MANUAL_REVIEW') {
    updates.paymentState = 'MANUAL_REVIEW';
    updates['posProperties.posSyncStatus'] = 'FAILED';
  }

  const posEvent = {
    eventId: event.eventId,
    type: event.type,
    posTransactionId: event.posTransactionId,
    amount: event.amount,
    tenderType: event.tenderType,
    authCode: event.authCode,
    terminalId: event.terminalId,
    receivedAt: new Date(),
    rawDigest,
  };

  return { updates, posEvent };
};
