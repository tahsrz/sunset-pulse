import type { SellerCaseResult } from './sellerServiceContract';

type SellerMessage = SellerCaseResult['messages'][number];

export function orderSellerMessages(messages: SellerMessage[]): SellerMessage[] {
  return messages
    .map((message, index) => ({ message, index, time: Date.parse(message.occurred_at) }))
    .sort((left, right) => {
      const leftTime = Number.isNaN(left.time) ? 0 : left.time;
      const rightTime = Number.isNaN(right.time) ? 0 : right.time;
      return leftTime - rightTime || left.index - right.index;
    })
    .map(({ message }) => message);
}

export function sellerConversationStatus(message: SellerMessage): string {
  if (message.direction === 'inbound') return 'Received';
  switch (message.status) {
    case 'recorded': return 'Contact recorded';
    case 'queued': return 'Waiting to send';
    case 'sending': return 'Sending';
    case 'accepted': return 'Accepted by provider';
    case 'delivered': return 'Delivered';
    case 'bounced': return 'Delivery failed';
    case 'failed': return 'Not sent';
    case 'unknown': return 'Status unknown';
    case 'cancelled': return 'Cancelled';
  }
}
