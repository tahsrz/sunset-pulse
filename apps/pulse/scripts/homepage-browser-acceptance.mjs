import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Render the real homepage against controlled public API states. No ingestion,
// provider request or production account is needed for these layout checks.
export async function homepageBrowserAcceptance(browser, origin, artifacts) {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth')) {
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Controlled local acceptance: data unavailable' }) });
    }
    return route.continue();
  });
  const evidence = { browser: browser.version(), mode: 'anonymous local-development operator boundary; controlled unavailable APIs; reduced motion', viewports: [], errors };
  try {
    await page.goto(origin + '/', { timeout: 120000, waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Order Food or Open The Explorer' })).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole('button', { name: 'Hide Interface', exact: true })).toBeVisible({ timeout: 60000 });
    for (const width of [1920, 1280, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('heading', { name: 'Technical Architecture', exact: true }).scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${artifacts}homepage-${width}.png`, fullPage: true, animations: 'disabled' });
      const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      assert(dimensions.document <= dimensions.viewport + 1, `Homepage overflows horizontally at ${width}px`);
      evidence.viewports.push({ width, height: 1000, ...dimensions });
    }
    const question = page.locator('button[aria-controls^="faq-"]').first();
    await question.focus();
    await page.keyboard.press('Enter');
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    const answer = page.locator('#' + await question.getAttribute('aria-controls'));
    await expect(answer).toHaveAttribute('aria-hidden', 'false');
    assert.equal(await answer.evaluate((element) => element.inert), false);
    await page.screenshot({ path: `${artifacts}homepage-faq-keyboard.png`, fullPage: true, animations: 'disabled' });
    await page.keyboard.press('Enter');
    await expect(question).toHaveAttribute('aria-expanded', 'false');
    assert.equal(await answer.evaluate((element) => element.inert), true);
    const hide = page.getByRole('button', { name: 'Hide Interface', exact: true });
    await hide.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Show Interface', exact: true })).toBeVisible();
    assert(await page.locator('[inert] a[href="/atlas"]').count() > 0, 'Hidden hero actions must be inert');
    assert.equal(await page.locator('[data-nextjs-dialog]').count(), 0);
    assert.deepEqual(errors, [], 'Homepage must not throw browser runtime errors');
    console.log('PASS: homepage renders at 1920/1280/768/390px without page overflow; keyboard FAQ and hidden hero inertness pass (controlled unavailable API state).');
  } catch (error) {
    await page.screenshot({ path: `${artifacts}homepage-failure.png`, fullPage: true, timeout: 5000 }).catch(() => {});
    throw error;
  } finally {
    await writeFile(`${artifacts}homepage-evidence.json`, JSON.stringify(evidence, null, 2));
    await context.close();
  }
}
