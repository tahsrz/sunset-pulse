import { expect, test } from '@playwright/test';
import { kellerHicksListingId } from '../config/keller_hicks';

test('mobile land inquiry includes the property and keeps the question on retry', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(`**/api/properties/${kellerHicksListingId}`, route => route.fulfill({
    json: { success: true, data: {
      id: kellerHicksListingId, _id: kellerHicksListingId, name: '3565 Keller Hicks Road',
      type: 'Land', price: 1500000, listing_status: 'Active', rates: {}, images: [],
      location: { street: '3565 Keller Hicks Road', city: 'Fort Worth', state: 'TX' },
    } },
  }));
  const requests: unknown[] = [];
  await page.route('**/api/sites/leads', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(requests.length === 1
      ? { status: 503, json: { message: 'Please try again.' } }
      : { status: 201, json: { success: true, data: { accepted: true } } });
  });

  await page.goto(`/properties/${kellerHicksListingId}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByText(/survey shows 4.866 acres/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('link', { name: /city zoning packet/ })).toBeVisible();
  await expect(page.getByText('Nightly', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Ask about this property' }).click();
  await expect(page).toHaveURL(/#property-inquiry$/);
  const form = page.locator('#property-inquiry');
  await form.getByLabel('Full name', { exact: true }).fill('Test Buyer');
  await form.getByLabel('Email', { exact: true }).fill('buyer@example.com');
  await form.getByLabel('Your question').fill('Is the concept plan available?');
  await form.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(form.getByRole('alert')).toHaveText('Please try again.');
  await expect(form.getByLabel('Your question')).toHaveValue('Is the concept plan available?');
  await form.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(form.getByRole('status')).toContainText('Inquiry received');
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({
    source: 'pulse_listing_inquiry',
    listing: { id: kellerHicksListingId },
    message: 'Is the concept plan available?',
  });
});
