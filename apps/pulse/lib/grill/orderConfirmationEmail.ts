import path from 'node:path';
import { readFile } from 'node:fs/promises';

type OrderConfirmationResult =
  | { success: true; id: string | null }
  | { success: false; reason: string; status?: number };

type OrderConfirmationInput = {
  to: string;
  order: {
    _id: unknown;
    items?: Array<{ name: string; quantity: number; price: number }>;
    totalAmount?: number;
    estimatedWaitMinutes?: number;
    estimatedReadyAt?: string | Date;
    coupon?: {
      code?: string;
      type?: string;
      freeItemName?: string;
    };
  };
};

type ResendAttachment = {
  filename: string;
  content: string;
};

export function buildOrderConfirmationEmail({ order }: Pick<OrderConfirmationInput, 'order'>) {
  const shortOrderId = String(order._id).slice(-6).toUpperCase();
  const items = (order.items || [])
    .map((item) => `${item.quantity}x ${item.name} - $${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}`)
    .join('\n');

  const readyLine = order.estimatedReadyAt
    ? `Estimated ready time: ${new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : `Estimated wait: ${order.estimatedWaitMinutes || 15} minutes`;

  const rewardLine = order.coupon?.type === 'free_item'
    ? `\nLaunch reward: ${order.coupon.freeItemName || 'Reward item'} at pickup.\n`
    : '';

  const subject = `Sunset Pulse order confirmation #${shortOrderId}`;
  const text = [
    'Thank you for your order with Sunset Pulse.',
    '',
    `Order #${shortOrderId}`,
    readyLine,
    '',
    'Items:',
    items || 'No item details available.',
    '',
    `Total: $${Number(order.totalAmount || 0).toFixed(2)}`,
    rewardLine.trim(),
    '',
    'Please note that any reply to this email inquiring about real estate creates a fiduciary relationship with Tahsin (Taz) Reza.',
    'Trust us to buy or sell your land!',
    'Ali and Sons Incorporated has closed on over 15 Commercial and Residential properties in the last 25 years.',
    '',
    'We Are Proud To Serve Your Community!',
  ].filter((line) => line !== undefined).join('\n');

  return { subject, text };
}

export async function sendOrderConfirmationEmail({ to, order }: OrderConfirmationInput): Promise<OrderConfirmationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, reason: 'Missing RESEND_API_KEY.', status: 503 };
  }

  const from = process.env.ORDER_CONFIRMATION_FROM
    || process.env.RESEND_FROM_EMAIL
    || 'Sunset Pulse <no-reply@sunsetpulse.ai>';
  const replyTo = process.env.ORDER_CONFIRMATION_REPLY_TO || undefined;
  const { subject, text } = buildOrderConfirmationEmail({ order });
  const attachments = await loadConfirmationAttachments();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      reply_to: replyTo,
      ...(attachments.length ? { attachments } : {}),
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      success: false,
      reason: payload?.message || 'Failed to send order confirmation email.',
      status: response.status,
    };
  }

  return { success: true, id: payload?.id || null };
}

export async function loadConfirmationAttachments(): Promise<ResendAttachment[]> {
  const rtrPath = process.env.ORDER_CONFIRMATION_RTR_ATTACHMENT_PATH;
  if (!rtrPath) return [];

  const absolutePath = path.isAbsolute(rtrPath)
    ? rtrPath
    : path.resolve(process.cwd(), rtrPath);
  const bytes = await readFile(absolutePath);

  return [{
    filename: process.env.ORDER_CONFIRMATION_RTR_ATTACHMENT_NAME || path.basename(absolutePath),
    content: bytes.toString('base64'),
  }];
}
