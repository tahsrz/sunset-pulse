import { expect, test } from '@playwright/test';

test('homepage seller offer carries attribution through pricing review and a saved retry', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/lead-magnets', async (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    if (requests.length === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'The save could not be confirmed. Try again.' }),
      });
      return;
    }
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  await page.goto('/?utm_source=homepage&utm_medium=organic&utm_campaign=fall-sellers&utm_content=hero', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Request My Free Seller Plan' }).click();
  await expect(page).toHaveURL(/\/seller-plan\?/);
  let currentUrl = new URL(page.url());
  expect(currentUrl.searchParams.get('utm_campaign')).toBe('fall-sellers');

  await page.getByRole('link', { name: 'Ask About Pricing' }).click();
  currentUrl = new URL(page.url());
  expect(currentUrl.searchParams.get('utm_source')).toBe('homepage');
  expect(currentUrl.searchParams.get('utm_campaign')).toBe('fall-sellers');
  expect(currentUrl.searchParams.get('requestKind')).toBe('pricing_review');
  const pricingReview = page.getByRole('radio', { name: /A pricing review/ });
  await expect(pricingReview).toBeChecked();

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'When are you thinking?' })).toBeFocused();
  const timing = page.getByRole('radio', { name: 'Within 30 days' });
  await timing.check();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(pricingReview).toBeChecked();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(timing).toBeChecked();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'How can we reach you?' })).toBeFocused();

  await page.getByLabel('Your name').fill('Jordan Seller');
  await page.getByLabel('Email').fill('jordan@example.test');
  await expect(page.getByLabel(/Send me occasional local real-estate updates/)).not.toBeChecked();
  await page.getByLabel('I agree to be contacted to respond to this request.').check();
  await page.getByRole('button', { name: 'Send Request' }).click();

  await expect(page.getByRole('alert')).toHaveText('The save could not be confirmed. Try again.');
  await expect(page.getByLabel('Your name')).toHaveValue('Jordan Seller');
  await expect(page.getByLabel('Email')).toHaveValue('jordan@example.test');
  await page.getByRole('button', { name: 'Send Request' }).click();

  await expect(page.getByRole('status')).toHaveText('Your request is saved. We will follow up about what you selected.');
  await expect(page.getByText('This sends a request for a conversation. It does not book an appointment.')).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({
    requestKind: 'pricing_review',
    timing: 'within-30-days',
    requestedContact: true,
    marketingOptIn: false,
    name: 'Jordan Seller',
    email: 'jordan@example.test',
    campaign: { source: 'homepage', medium: 'organic', campaign: 'fall-sellers', content: 'hero' },
  });
  expect(requests[1]).not.toHaveProperty('propertyAddress');
  expect(requests[1].submissionId).toBe(requests[0].submissionId);
});
