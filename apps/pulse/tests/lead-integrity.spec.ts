import { expect, test } from '@playwright/test';

const address = '11250 West Lake Road';

test.beforeEach(async ({ page }) => {
  await page.goto('/properties/21436749', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: address, exact: true })).toBeVisible({ timeout: 20000 });
});

test('listing details show the asking price and analysis without empty panels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const layout = page.getByRole('main').filter({ has: page.getByRole('heading', { name: address }) });
  await expect(layout.getByText('$175,000', { exact: true }).first()).toBeVisible();
  await expect(layout.getByRole('heading', { name: 'About this property' })).toBeVisible();
  await expect(layout.getByText('1,600 sq ft', { exact: true })).toBeVisible();
  const analysis = layout.getByRole('region', { name: 'Property analysis' });
  await expect(analysis.getByText('$109.38', { exact: true })).toBeVisible();
  await expect(analysis.getByText('21436749', { exact: true })).toBeVisible();
  await analysis.getByText('How this is calculated', { exact: true }).click();
  await expect(analysis.getByText('Asking price divided by the square footage reported in the listing.')).toBeVisible();
  await expect(analysis.getByRole('link', { name: 'View on Google Maps' })).toHaveAttribute('href', /11250\+West\+Lake\+Road/);
  await expect(layout.getByText(/^(Nightly|Weekly|Monthly)$/i)).toHaveCount(0);
  await expect(layout.getByText(/Sunset Render Engine|Interactive Property Analysis/)).toHaveCount(0);
  await expect(layout.getByRole('heading', { name: /amenities/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('listing inquiries keep the question on errors and submit the correct listing context', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/sites/leads', async (route) => {
    attempts += 1;
    expect(route.request().postDataJSON()).toMatchObject({
      source: 'pulse_listing_inquiry',
      requestKind: 'inquiry',
      listing: { id: '21436749' },
      name: 'Example Visitor',
      email: 'example@example.com',
      message: 'Is this still available?',
    });
    return attempts === 1
      ? route.fulfill({ status: 503, json: { message: 'Please try again.' } })
      : route.fulfill({ status: 201, json: { data: { accepted: true } } });
  });

  const form = page.getByRole('region', { name: 'Request information' });
  await form.getByLabel('Full name').fill('Example Visitor');
  await form.getByLabel('Email').fill('example@example.com');
  await form.getByLabel('Your question').fill('Is this still available?');
  await form.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(form.getByRole('alert')).toHaveText('Please try again.');
  await expect(form.getByLabel('Your question')).toHaveValue('Is this still available?');
  await form.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(form.getByRole('status')).toContainText('Inquiry received');
  expect(attempts).toBe(2);
});

test('a visitor can request a showing for a catalog listing', async ({ page }) => {
  await page.route('**/api/sites/leads', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      source: 'pulse_listing_inquiry',
      requestKind: 'showing',
      listing: { id: '21436749' },
    });
    return route.fulfill({ status: 201, json: { data: { accepted: true } } });
  });
  const form = page.getByRole('region', { name: 'Request information' });
  await form.getByRole('button', { name: 'Request a showing' }).click();
  await form.getByLabel('Full name').fill('Example Visitor');
  await form.getByLabel('Email').fill('example@example.com');
  await form.getByRole('button', { name: 'Send showing request' }).click();
  await expect(form.getByRole('status')).toContainText('Showing request sent');
});
