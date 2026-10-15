import { expect, test } from '@playwright/test';

test('seller daily workspace and response scheduling fit phone, tablet, and desktop widths', async ({ page }) => {
  const leadId = '11111111-1111-4111-8111-111111111111';
  await page.route('**/api/realtor/preferences', (route) => route.fulfill({ json: { ok: true, result: {
    workspace_id: '22222222-2222-4222-8222-222222222222', time_zone: 'America/Chicago',
    reminders_enabled: true, gamification_enabled: false, celebrations_enabled: false,
    hide_amounts_on_today: false, records_start_date: null, revision: 1,
  } } }));
  await page.route('**/api/realtor/today', (route) => route.fulfill({ json: { ok: true, result: {
    agenda: { status: 'available', value: { overdue: [], upcoming: [], reminders: [] } },
    business: { status: 'available', value: { recordedNetCents: 0, receivedCents: 0, closingCount: 0, completedWeeklyReviews: 0 } },
    goals: { status: 'available', value: [] },
    seller: { status: 'available', value: {
      status: 'available', timeZone: 'America/Chicago', weekStartDate: '2026-10-05', weekEndDate: '2026-10-11',
      counts: { newRequests: 6, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0 },
      unscheduledRequests: Array.from({ length: 5 }, (_, index) => ({
        id: index === 0 ? leadId : `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        name: `Seller Fixture ${index + 1}`, created_at: '2026-10-06T12:00:00Z', revision: 1, timing: 'one-to-three-months',
      })),
      unscheduledHasMore: true,
      overdueHasMore: false, consultationsHasMore: false,
      overdueActions: [], consultations: [], firstContactTiming: { medianSeconds: null, sampleSize: 0, provenance: 'manual' }, campaigns: [],
    } },
  } } }));
  await page.route('**/api/workspaces', (route) => route.fulfill({ json: { ok: true, workspaces: [] } }));

  await page.goto('/today', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Seller business' })).toBeVisible();

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('link', { name: 'View more seller requests →' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Schedule response' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Schedule response' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Schedule seller response' });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/seller-daily-${width}.png`, fullPage: true });
  }
});
