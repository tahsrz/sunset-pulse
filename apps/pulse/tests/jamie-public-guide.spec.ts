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

  test('completes a consented agent handoff with bounded guide context', async ({ page }) => {
    const trackedEvents: string[] = [];
    let leadPayload: Record<string, any> | null = null;

    await page.route('**/api/jamie/guide', async (route) => {
      const textId = 'jamie-handoff-e2e-text';
      const body = [
        { type: 'text-start', id: textId },
        {
          type: 'text-delta',
          id: textId,
          delta: 'I can help refine that Frisco search and send a compact brief to your agent.',
        },
        { type: 'text-end', id: textId },
        {
          type: 'data-actions',
          id: 'jamie-handoff-e2e-actions',
          data: {
            items: [{
              id: 'contact_agent',
              description: 'Send a private, consented inquiry to the verified test agent.',
              kind: 'handoff',
              label: 'Contact Jamie E2E Agent',
            }],
          },
        },
        {
          type: 'data-sources',
          id: 'jamie-handoff-e2e-sources',
          data: { items: [{ label: 'Jamie public guide', detail: 'Approved public guide context.' }] },
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
    await page.route('**/api/jamie/guide/events', async (route) => {
      const payload = route.request().postDataJSON();
      trackedEvents.push(payload.event);
      await route.fulfill({ status: 204 });
    });
    await page.route('**/api/sites/leads', async (route) => {
      leadPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, id: 'lead-e2e' }),
      });
    });

    await page.goto(`${jamieOrigin}/?site=jamie-e2e-agent`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Jamie E2E Agent', { exact: false })).toBeVisible();

    await page.getByRole('textbox', { name: 'Question for Jamie' }).fill(
      'Find a three bedroom home in Frisco under $750,000.',
    );
    await page.getByRole('button', { name: 'Send question' }).click();
    await page.getByRole('button', { name: 'Contact Jamie E2E Agent' }).click();

    await expect(page.getByRole('heading', { name: 'Send Jamie E2E Agent an inquiry' })).toBeVisible();
    await page.getByLabel('Name', { exact: true }).fill('Jamie Browser QA');
    await page.getByLabel('Email', { exact: true }).fill('jamie-browser-qa@example.com');
    await page.locator('select[name="nextStep"]').selectOption('schedule_tour');
    await page.locator('textarea[name="message"]').fill('Please follow up about this search.');
    await page.locator('input[name="consent"]').check();
    await page.getByRole('button', { name: 'Send private inquiry' }).click();

    await expect(page.getByText('Inquiry sent.', { exact: true })).toBeVisible();
    expect(leadPayload).toMatchObject({
      agentId: 'jamie-e2e-agent-id',
      site: 'jamie-e2e-agent',
      source: 'jamie_public_guide',
      name: 'Jamie Browser QA',
      email: 'jamie-browser-qa@example.com',
      consent: true,
      guide: {
        conversation: [
          { role: 'user', text: 'Find a three bedroom home in Frisco under $750,000.' },
          { role: 'assistant', text: 'I can help refine that Frisco search and send a compact brief to your agent.' },
        ],
        discussedListingIds: [],
        nextStep: 'schedule_tour',
      },
    });
    expect(leadPayload).not.toHaveProperty('pagePath');
    expect(leadPayload?.guide.sessionId).toEqual(expect.any(String));
    expect(leadPayload?.guide.conversation).toHaveLength(2);
    await expect.poll(() => trackedEvents).toEqual(expect.arrayContaining([
      'guide_opened',
      'handoff_open',
      'handoff_submit',
    ]));
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
