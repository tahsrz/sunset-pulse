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

    await expect(page.locator('[data-nextjs-dialog]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Ask. Get The Answer.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run command' })).toBeEnabled();

    await page.getByRole('textbox', { name: 'Command' }).fill(pastedListing);
    await page.getByRole('combobox', { name: 'Helper' }).selectOption('listing-summary');
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
    await expect(extractedListing).toContainText(/confidence/i);
    await expect(extractedListing).toContainText(/fields/i);
    await expect(extractedListing).toContainText('Status');
    await expect(extractedListing).toContainText('Active');
    await expect(extractedListing).toContainText('Year built');
    await expect(extractedListing).toContainText('1998');
    await expect(extractedListing.getByTestId('listing-hooks')).toContainText('Updated interior and finish story');
    await expect(extractedListing.getByTestId('listing-hooks')).toContainText('Outdoor living angle');
    await expect(extractedListing.getByTestId('listing-hooks')).toContainText('Location and convenience story');
    await expect(extractedListing.getByTestId('listing-validation')).toHaveCount(0);

    const listingPackage = extractedListing.getByTestId('listing-copy-package');
    await expect(listingPackage).toBeVisible();
    await expect(listingPackage.getByLabel('MLS summary draft')).toHaveValue(/1234 Cedar Springs Dr/);
    await expect(listingPackage.getByRole('button', { name: 'Save Intake' })).toBeVisible();
    await expect(listingPackage.getByRole('button', { name: 'Mark Ready' })).toBeEnabled();
    await listingPackage.getByRole('tab', { name: 'Social Caption' }).click();
    await expect(listingPackage.getByLabel('Social caption draft')).toHaveValue(/Property spotlight: 1234 Cedar Springs Dr/);

    await listingPackage.getByRole('button', { name: 'Save Intake' }).click();
    await expect(listingPackage).toContainText(/Saved intake v1 \/ review/i);
    await listingPackage.getByRole('button', { name: 'Mark Ready' }).click();
    await expect(listingPackage).toContainText(/Saved intake v2 \/ ready/i);

    const canonicalHandoff = page.getByTestId('canonical-listing-handoff');
    await canonicalHandoff.getByLabel('Canonical listing ID or MLS number').fill('MOCK-FTW-418');
    await canonicalHandoff.getByRole('button', { name: 'Compare' }).click();
    await expect(canonicalHandoff.getByLabel('Apply List price')).toBeVisible();
    await expect(canonicalHandoff).toContainText('Canonical: 499000');

    for (const label of [
      'Apply Street address',
      'Apply City',
      'Apply ZIP code',
      'Apply Bedrooms',
      'Apply Bathrooms',
      'Apply Square feet',
      'Apply Property type',
      'Apply Listing status',
      'Apply Public remarks',
      'Apply Features',
    ]) {
      const checkbox = canonicalHandoff.getByLabel(label);
      if (await checkbox.count()) {
        await checkbox.uncheck();
      }
    }

    await expect(canonicalHandoff.getByLabel('Apply List price')).toBeChecked();
    await canonicalHandoff.getByRole('button', { name: 'Apply Selected (1)' }).click();
    await expect(canonicalHandoff).toContainText('Selected fields applied to the canonical listing');
    await expect(listingPackage).toContainText(/Saved intake v3 \/ ready/i);
    await canonicalHandoff.getByRole('button', { name: 'Compare' }).click();
    await expect(canonicalHandoff.getByLabel('Apply List price')).toHaveCount(0);
    await expect(canonicalHandoff).not.toContainText('Canonical: 499000');

    await extractedListing.getByRole('button', { name: 'Edit facts' }).click();
    const reviewForm = extractedListing.getByTestId('listing-review-form');
    await expect(reviewForm).toBeVisible();
    await reviewForm.getByLabel('Approved Price').fill('$499,000');
    await reviewForm.getByRole('button', { name: 'Apply facts and rerun' }).click();

    await expect(page.getByTestId('command-answer')).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId('extracted-listing')).toContainText('$499,000');

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
