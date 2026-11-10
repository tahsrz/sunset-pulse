import { expect, test } from '@playwright/test';

test('Jamie consultation link saves a request without claiming a booking', async ({ page }) => {
  let requests = 0;
  let bookings = 0;
  await page.route('**/api/sites/leads', async route => {
    requests++;
    const body = route.request().postDataJSON();
    expect(body.consent).toBe(true);
    expect(body.message).toContain('Seller Consultation request.');
    expect(route.request().headers()['idempotency-key']).toMatch(/^consultation:/);
    await route.fulfill({ status: 201, json: { success: true, data: { accepted: true, id: '11111111-1111-4111-8111-111111111111', funnelId: '22222222-2222-4222-8222-222222222222', agentId: 'agent-one', site: 'agent-one' } } });
  });
  await page.route('**/api/scheduling/public', async route => { bookings++; await route.abort(); });
  await page.goto('/schedule?appointmentType=seller_consultation&site=agent-one');
  await expect(page.getByRole('heading', { name: 'Request a Consultation' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Seller One');
  await page.getByLabel('Email', { exact: true }).fill('seller@example.test');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send Request' }).click();
  await expect(page.getByRole('status')).toHaveText('Your consultation request was saved. A time has not been booked.');
  expect(requests).toBe(1);
  expect(bookings).toBe(0);
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
});
