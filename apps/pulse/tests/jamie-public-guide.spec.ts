import { expect, test } from '@playwright/test';

const jamieOrigin = process.env.PLAYWRIGHT_JAMIE_ORIGIN || 'http://jamie.localhost:3000';

test.describe('Jamie public guide', () => {
  test('renders the first-party guide and keeps model-authored links inert', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.route('**/api/jamie/guide', async (route) => {
      const textId = 'jamie-e2e-text';
      const body = [
        { type: 'text-start', id: textId },
        {
          type: 'text-delta',
          id: textId,
          delta: 'Here is a [private link](https://untrusted.example/path) that must remain plain text.',
        },
        { type: 'text-end', id: textId },
        {
          type: 'data-actions',
          id: 'jamie-e2e-actions',
          data: {
            items: [{
              id: 'browse_homes',
              description: 'Open the full verified property search.',
              kind: 'link',
              label: 'Browse homes',
              href: 'http://localhost:3000/properties/search-results',
            }],
          },
        },
        {
          type: 'data-sources',
          id: 'jamie-e2e-sources',
          data: { items: [{ label: 'Jamie public guide', detail: 'Approved public product context.' }] },
        },
      ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n';

      await route.fulfill({
        status: 200,
        headers: {
          'cache-control': 'no-store',
          'content-type': 'text/event-stream',
          'x-vercel-ai-ui-message-stream': 'v1',
        },
        body,
      });
    });

    await page.route('**/api/jamie/guide/events', (route) => route.fulfill({ status: 204 }));
    await page.goto(jamieOrigin, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/Jamie \| Guide to Sunset Pulse/);
    await expect(page.getByRole('heading', { name: 'Jamie', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Question for Jamie' })).toBeVisible();
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);

    await page.getByRole('textbox', { name: 'Question for Jamie' }).fill('Give me the safe next step.');
    await page.getByRole('button', { name: 'Send question' }).click();

    await expect(page.getByText('private link', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'private link' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Browse homes/ })).toHaveAttribute(
      'href',
      'http://localhost:3000/properties/search-results',
    );
    expect(consoleErrors).toEqual([]);
  });

  test('does not expose the guide API on an agent tenant host', async ({ request }) => {
    const response = await request.post('http://127.0.0.1:3000/api/jamie/guide', {
      headers: { host: 'taz.localhost:3000' },
      data: {
        messages: [{
          id: 'message-e2e',
          role: 'user',
          parts: [{ type: 'text', text: 'What is Sunset Pulse?' }],
        }],
      },
    });

    expect(response.status()).toBe(404);
  });
});
