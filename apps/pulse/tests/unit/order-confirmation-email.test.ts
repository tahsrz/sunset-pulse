import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildOrderConfirmationEmail, loadConfirmationAttachments } from '@/lib/grill/orderConfirmationEmail';

describe('order confirmation email', () => {
  it('builds the Sunset Pulse order confirmation copy', () => {
    const email = buildOrderConfirmationEmail({
      order: {
        _id: '664f33fae73a38dfbf9df193',
        items: [
          { name: 'Cheeseburger Basket', quantity: 2, price: 9.99 },
        ],
        totalAmount: 19.98,
        estimatedWaitMinutes: 15,
        coupon: {
          code: 'FREEDRINK',
          type: 'free_item',
          freeItemName: 'Fountain drink',
        },
      },
    });

    expect(email.subject).toContain('#9DF193');
    expect(email.text).toContain('Thank you for your order with Sunset Pulse.');
    expect(email.text).toContain('2x Cheeseburger Basket - $19.98');
    expect(email.text).toContain('Launch reward: Fountain drink at pickup.');
    expect(email.text).toContain('Tahsin (Taz) Reza');
    expect(email.text).toContain('We Are Proud To Serve Your Community!');
  });

  it('loads an optional RTR attachment from env', async () => {
    const fixtureDir = path.resolve(process.cwd(), 'tests/.tmp');
    const fixturePath = path.join(fixtureDir, 'rtr-test.pdf');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(fixturePath, 'fake-pdf-bytes');

    process.env.ORDER_CONFIRMATION_RTR_ATTACHMENT_PATH = fixturePath;
    process.env.ORDER_CONFIRMATION_RTR_ATTACHMENT_NAME = 'RTR.pdf';

    const attachments = await loadConfirmationAttachments();

    expect(attachments).toEqual([{
      filename: 'RTR.pdf',
      content: Buffer.from('fake-pdf-bytes').toString('base64'),
    }]);

    delete process.env.ORDER_CONFIRMATION_RTR_ATTACHMENT_PATH;
    delete process.env.ORDER_CONFIRMATION_RTR_ATTACHMENT_NAME;
  });
});
