import { expect, test } from '@playwright/test';

const pastedListing = [
  'MLS # 20654321',
  'Status: Active',
  'List Price: $485,000',
  '1234 Cedar Springs Dr, Dallas, TX 75204',
  'Single Family Residential',
  '4 beds 3 baths 2,418 sqft',
  'Year Built: 1998',
  'Lot Size: 0.21 acres',
  'Public Remarks: Updated home with open kitchen, mature trees, covered patio, flexible office, and quick access to nearby shops and commute routes.',
  'Features: hardwood floors, quartz counters, two-car garage, fenced backyard, recent roof, energy-efficient windows',
].join('\n');

test.describe('Command Center pasted listing flow', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/tensorzero/feedback', (route) => route.fulfill({ status: 204 }));
  });

  test('extracts pasted listing facts, streams progress, supervises, and supports helper rerun', async ({ page }) => {
    await page.goto('/command-center', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Ask. Get The Answer.' })).toBeVisible();

    await page.getByRole('textbox', { name: 'Command' }).fill(pastedListing);
    await expect.poll(async () => page.getByRole('combobox', { name: 'Helper' }).evaluate((element) => {
      const select = element as HTMLSelectElement;
      return select.selectedOptions[0]?.textContent || '';
    }), {
      timeout: 15000,
    }).toContain('Listing Summary');
    await page.getByRole('button', { name: 'Run command' }).click();

    const answer = page.getByTestId('command-answer');
    await expect(answer).toBeVisible({ timeout: 90000 });
    await expect(answer.getByTestId('command-answer-worker')).toContainText('Listing Summary');

    const answerProgress = answer.getByTestId('command-progress-rail');
    await expect(answerProgress).toContainText('Classified');
    await expect(answerProgress).toContainText('Listing extracted');
    await expect(answerProgress).toContainText('Context budgeted');
    await expect(answerProgress).toContainText('Post checks');

    const extractedListing = page.getByTestId('extracted-listing');
    await expect(extractedListing).toContainText('$485,000');
    await expect(extractedListing).toContainText('1234 Cedar Springs Dr');
    await expect(extractedListing).toContainText('4 beds');
    await expect(extractedListing).toContainText('3 baths');
    await expect(extractedListing).toContainText('2,418 sqft');

    await page.getByText('Command Post', { exact: true }).click();
    await expect.poll(async () => page.getByTestId('dev-metric-supervisor').innerText(), {
      timeout: 30000,
    }).toMatch(/passed|warnings/i);
    await expect(page.getByTestId('dev-metric-findings')).toBeVisible();

    const correction = page.getByTestId('routing-correction');
    await correction.getByLabel('Rerun with helper').selectOption('follow-up-writer');
    await correction.getByRole('button', { name: 'Rerun command with selected helper' }).click();

    await expect(page.getByTestId('command-answer')).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId('command-answer-worker')).toContainText('Follow-Up Writer');
    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);
  });
});
