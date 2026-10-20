import { describe, expect, it } from 'vitest';
import { orderSellerMessages, sellerConversationStatus } from '@/lib/realtor-workspace/sellerConversation';
import type { SellerCaseResult } from '@/lib/realtor-workspace/sellerServiceContract';

function message(id: string, occurred_at: string, status: SellerCaseResult['messages'][number]['status'] = 'recorded', direction: SellerCaseResult['messages'][number]['direction'] = 'outbound'): SellerCaseResult['messages'][number] {
  return { id, occurred_at, status, direction, subject: 'Subject', body: 'Message', provider_id: null };
}

describe('seller conversation helpers', () => {
  it('orders messages oldest first and keeps equal-time entries stable', () => {
    const values = [message('later', '2026-10-19T10:00:00Z'), message('first', '2026-10-19T09:00:00Z'), message('same', '2026-10-19T09:00:00Z')];
    expect(orderSellerMessages(values).map((row) => row.id)).toEqual(['first', 'same', 'later']);
  });

  it('uses clear delivery labels while preserving received replies as received', () => {
    expect(sellerConversationStatus(message('queued', '2026-10-19T09:00:00Z', 'queued'))).toBe('Waiting to send');
    expect(sellerConversationStatus(message('accepted', '2026-10-19T09:00:00Z', 'accepted'))).toBe('Accepted by provider');
    expect(sellerConversationStatus(message('delivered', '2026-10-19T09:00:00Z', 'delivered'))).toBe('Delivered');
    expect(sellerConversationStatus(message('reply', '2026-10-19T09:00:00Z', 'recorded', 'inbound'))).toBe('Received');
  });
});
