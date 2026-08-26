import { expect, test } from '@playwright/test';

test('Jamie consultation link reaches booking confirmation', async ({ page }) => {
  await page.route('**/api/sites/leads', async (route) => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: '11111111-1111-4111-8111-111111111111', funnelId: '22222222-2222-4222-8222-222222222222' } }) }));
  await page.route('**/api/scheduling/public', async (route) => {
    const body = route.request().postDataJSON();
    expect(body.appointmentType).toBe('seller_consultation');
    expect(body.funnelId).toBe('22222222-2222-4222-8222-222222222222');
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, bookingId: 'booking-1' }) });
  });

  await page.goto('/schedule?appointmentType=seller_consultation&site=agent-one');
  await expect(page.getByRole('heading', { name: 'Book a consultation' })).toBeVisible();
  await page.getByPlaceholder('Name').fill('Seller One');
  await page.getByPlaceholder('Email').fill('seller@example.com');
  await page.locator('input[type="date"]').fill('2026-09-01');
  await page.locator('input[type="time"]').fill('10:00');
  await page.getByRole('button', { name: 'Request time' }).click();
  await expect(page.getByText('Your consultation request is confirmed.')).toBeVisible();
});
