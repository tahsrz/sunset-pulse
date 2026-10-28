import { expect, test } from '@playwright/test';

test('seller daily workspace and response scheduling fit phone, tablet, and desktop widths', async ({ page }) => {
  const leadId = '11111111-1111-4111-8111-111111111111';
  const writes: string[]=[];
  page.on('request',request=>{if(request.method()!=='GET' && new URL(request.url()).pathname.startsWith('/api/realtor/')) writes.push(request.url());});
  await page.route('**/api/realtor/preferences', (route) => route.fulfill({ json: { ok: true, result: {
    workspace_id: '22222222-2222-4222-8222-222222222222', time_zone: 'America/Chicago',
    reminders_enabled: true, gamification_enabled: false, celebrations_enabled: false,
    hide_amounts_on_today: false, records_start_date: null, revision: 1,
  } } }));
  await page.route('**/api/realtor/today', (route) => route.fulfill({ json: { ok: true, result: {
    agenda: { status: 'available', value: { overdue: [], upcoming: [], reminders: [] } },
    business: { status: 'available', value: { recordedNetCents: 0, receivedCents: 0, closingCount: 0, completedWeeklyReviews: 0 } },
    goals: { status: 'available', value: [] },
    priorities: {items:[],hasMore:false},
    seller: { status: 'available', value: {
      status: 'available', timeZone: 'America/Chicago', weekStartDate: '2026-10-05', weekEndDate: '2026-10-11',
      counts: { newRequests: 6, customerReplies: 0, confirmedConsultations: 0, recordedClosings: 0 },
      unscheduledRequests: Array.from({ length: 5 }, (_, index) => ({
        id: index === 0 ? leadId : `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
        name: `Seller Fixture ${index + 1}`, created_at: new Date(Date.parse('2026-10-06T12:00:00Z')+index*60000).toISOString(), revision: 1, timing: 'one-to-three-months',
      })),
      unscheduledHasMore: true,
      overdueHasMore: false, consultationsHasMore: false,
      overdueActions: [], consultations: [], firstContactTiming: { medianSeconds: null, sampleSize: 0, provenance: 'manual' }, campaigns: [],
    } },
  } } }));
  await page.route('**/api/workspaces', (route) => route.fulfill({ json: { ok: true, workspaces: [] } }));
  await page.route(/\/api\/realtor\/leads\/schedule\?/, route=>route.fulfill({json:{ok:true,result:null}}));

  await page.goto('/today', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Seller business' })).toBeVisible();

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const focus = page.locator('[data-daily-action="focus"]');
    await expect(focus).toHaveCount(1);
    await expect(focus.getByRole('link',{name:'Open request: Seller Fixture 1'})).toHaveAttribute('href',`/seller-inbox?leadId=${leadId}`);
    await expect(focus.locator('details')).not.toHaveAttribute('open');
    await expect(focus.getByRole('heading')).toHaveCSS('font-style','italic');
    expect(await focus.getByRole('heading').evaluate(element=>getComputedStyle(element).fontFamily)).not.toContain('Georgia');
    await expect(page.getByRole('link',{name:'Manage Consultation Hours'})).toHaveAttribute('href','/consultations');
    await page.screenshot({path:`test-results/seller-focus-${width}.png`,fullPage:true});
    const activity=page.locator('details').filter({has:page.getByText('All seller activity',{exact:true})}).first();
    if(!await activity.evaluate(element=>element.hasAttribute('open'))) await page.getByText('All seller activity',{exact:true}).click();
    await expect(page.getByRole('link', { name: 'View more seller requests →' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Schedule response' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Schedule response' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Schedule seller response' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button',{name:'Schedule response',exact:true})).toBeEnabled();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/seller-daily-${width}.png`, fullPage: true });
    await page.getByText('All seller activity',{exact:true}).click();
  }
  await page.emulateMedia({colorScheme:'dark'});
  await page.setViewportSize({width:390,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/seller-focus-dark-390.png',fullPage:true});
  expect(writes).toEqual([]);
});
