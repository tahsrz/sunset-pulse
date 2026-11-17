import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('homepage defers the Atlas bundle and stays usable across viewport widths', async ({ page }) => {
  const scriptRequests = new Set<string>();
  page.on('request', (request) => {
    if (request.resourceType() !== 'script') return;
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/_next/static/')) scriptRequests.add(path);
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Move fast with a Pulse agent.' })).toHaveCSS('font-style', 'normal');
  await expect(page.getByRole('heading', { name: /a small north texas town with a long memory/i })).toHaveCSS('background-image', 'none');

  const widths = [320, 390, 768, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Move fast with a Pulse agent.' })).toBeVisible();
    await expect(page.getByText('We help you sell your home without the stress.')).toBeVisible();
    await expect(page.getByText('NTREIS recorded 116,736 closed sales and 194,470 new listings in 2025.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Your home address' })).toBeVisible();
    await expect(page.getByRole('figure', { name: 'Example Property Layout' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Request My Free Seller Plan' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Explore North Texas Your Way' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/homepage-${width}.png`, fullPage: true });
  }
  await expect(page.getByRole('link', { name: 'Sell', exact: true })).toHaveAttribute('href', '/seller-plan');
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');

  const launchButton = page.getByRole('button', { name: 'Open Atlas View' });
  const initialScripts = new Set(scriptRequests);
  await launchButton.click();
  await expect(page.getByRole('button', { name: 'Hide Interface' })).toBeVisible();
  const afterAtlasOpen = [...scriptRequests];
  const deferredScripts = afterAtlasOpen.filter((url) => !initialScripts.has(url));
  expect(deferredScripts.length).toBeGreaterThan(0);

  await writeFile('test-results/homepage-resource-waterfall.json', JSON.stringify({
    initialScriptRequests: [...initialScripts],
    scriptRequestsAfterAtlasOpen: afterAtlasOpen,
    deferredScriptRequests: deferredScripts,
  }, null, 2));

  const closeButton = page.getByRole('button', { name: 'Close Atlas experience' });
  await expect(closeButton).toBeVisible();
  await closeButton.click();
  await expect(launchButton).toBeFocused();

  await launchButton.click();
  await expect(page.getByRole('button', { name: 'Hide Interface' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Atlas experience' }).click();
  await expect(launchButton).toBeFocused();
});

test('homepage tabs update the title, subtitle and form before searching homes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const bothTab = page.getByRole('tab', { name: 'Buy & Sell' });
  const buyTab = page.getByRole('tab', { name: 'Buy a home' });
  const sellTab = page.getByRole('tab', { name: 'Sell a home' });
  const heading = page.locator('#seller-acquisition-title').filter({ visible: true });
  await expect(bothTab).toHaveAttribute('aria-selected', 'true');
  await expect(heading).toHaveText('Move fast with a Pulse agent.');
  await expect(page.getByText('We help you sell your home without the stress.', { exact: true })).toBeVisible();
  const marketReport = page.getByRole('link', { name: 'NTREIS 2025 market report' });
  await expect(marketReport).toHaveAttribute('href', 'https://texassecuretitle.com/wp-content/uploads/2026/01/NTREIS_MMI_2025-12-.pdf');
  await expect(page.getByRole('tabpanel', { name: 'Buy & Sell' })).toContainText('help you plan both moves');

  await bothTab.focus();
  await bothTab.press('ArrowRight');
  await expect(buyTab).toBeFocused();
  await expect(buyTab).toHaveAttribute('aria-selected', 'true');
  await expect(heading).toHaveText('Find a place that feels like home.');
  await expect(page.getByText('A local Pulse agent can guide you from your first tour through closing.', { exact: true })).toBeVisible();
  await expect(marketReport).toBeHidden();
  await expect(page.getByRole('tabpanel', { name: 'Buy a home' })).toContainText('Tell us where you’d like to buy');

  await buyTab.press('ArrowRight');
  await expect(sellTab).toBeFocused();
  await expect(sellTab).toHaveAttribute('aria-selected', 'true');
  await expect(heading).toHaveText('Sell your home on your timeline.');
  await expect(page.getByText('A Pulse agent can help you set a price, get your home ready, and plan what comes next.', { exact: true })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'Sell a home' }).getByRole('button', { name: 'Start selling' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await sellTab.press('ArrowRight');
  await expect(bothTab).toBeFocused();
  await expect(heading).toHaveText('Move fast with a Pulse agent.');
  await buyTab.click();
  const address = '418 Cedar Ridge Drive';
  await page.getByRole('textbox', { name: 'Address, city, or ZIP code' }).fill(address);
  await page.getByRole('button', { name: 'Search homes' }).click();
  await expect(page).toHaveURL(/\/properties\/search-results\?location=/);
  expect(new URL(page.url()).searchParams.get('location')).toBe(address);
});

test('homepage slideshow shows each listing price and can return to the first property', async ({ page }) => {
  test.setTimeout(45000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const slideshow = page.getByRole('region', { name: 'Featured properties' });
  const listings = [['11250 West Lake Road', '$175,000'], ['416 E Kennedale Parkway', '$1,050,000']];
  for (const [name, price] of listings) {
    await expect(slideshow.getByText(name, { exact: true })).toBeVisible({ timeout: 12000 });
    const photo = slideshow.getByRole('img', { name: `Photo of ${name}` });
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(slideshow).toContainText(price);
  }
  await expect(slideshow.getByRole('button', { name: 'Play slideshow' })).toBeDisabled();
  await expect(slideshow).toContainText('2 of 2');
  await slideshow.getByRole('button', { name: 'Previous property' }).click();
  await expect(slideshow.getByRole('link', { name: '11250 West Lake Road' })).toBeVisible();
  await expect(slideshow).toContainText('$175,000');
  await expect(slideshow).toContainText('1 of 2');
  await slideshow.getByRole('button', { name: 'Previous property' }).click();
  await expect(slideshow.getByRole('link', { name: '416 E Kennedale Parkway' })).toBeVisible();
  await slideshow.getByRole('button', { name: 'Next property' }).click();
  await expect(slideshow.getByRole('link', { name: '11250 West Lake Road' })).toBeVisible();
});

test('homepage slideshow skips a listing whose photo fails to load', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/images/properties/11250-west-lake-road.png', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');

  const slideshow = page.getByRole('region', { name: 'Featured properties' });
  await expect(slideshow.getByRole('link', { name: '416 E Kennedale Parkway' })).toBeVisible();
  await expect(slideshow.getByRole('link', { name: '11250 West Lake Road' })).toHaveCount(0);
  await expect(slideshow.getByRole('button', { name: 'Next property' })).toHaveCount(0);
});

test('featured commercial sale photos open their public listing details', async ({ page, request }) => {
  const listings = [
    { id: '21436749', name: '11250 West Lake Road', price: 175000 },
    { id: '21436841', name: '416 E Kennedale Parkway', price: 1050000 },
  ];
  for (const { id, name, price } of listings) {
    const response = await request.get(`/api/properties/${id}`);
    expect(response.ok()).toBe(true);
    expect((await response.json()).data).toMatchObject({
      mls_id: id, name, type: 'Commercial Sale', price, price_type: 'sale', listing_status: 'Active',
    });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const slideshow = page.getByRole('region', { name: 'Featured properties' });
  const listingLink = slideshow.getByRole('link', { name: listings[0].name });
  await expect(listingLink).toHaveAttribute('href', `/properties/${listings[0].id}`);
  const photo = slideshow.getByRole('img', { name: `Photo of ${listings[0].name}` });
  await photo.scrollIntoViewIfNeeded();
  const photoBounds = await photo.boundingBox();
  if (!photoBounds) throw new Error('The slideshow photo is not visible.');
  await page.mouse.click(photoBounds.x + photoBounds.width / 2, photoBounds.y + photoBounds.height / 2);
  await expect(page).toHaveURL(`/properties/${listings[0].id}`, { timeout: 20000 });
  await expect(page.getByRole('heading', { name: listings[0].name })).toBeVisible();
});

test('an operator can publish a priced listing to the homepage slideshow', async ({ page, request }) => {
  test.skip(process.env.PULSE_LISTING_EDITOR_E2E !== 'true', 'The editor test uses the development server and mock catalog.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin/listings');
  await page.getByLabel('MLS ID', { exact: true }).fill('21436577');
  await page.getByLabel('Street address').fill('817 Stoney Bridge Way');
  await page.getByLabel('City', { exact: true }).fill('Lavon');
  await page.getByLabel('ZIP code').fill('75166');
  await page.getByLabel('Listing price ($)').fill('572990');
  await page.getByLabel('Bedrooms').fill('4');
  await page.getByLabel('Bathrooms').fill('4');
  await page.getByLabel('Living area (sq ft)').fill('3403');
  await page.getByLabel('Photo URLs (one per line)').fill('/images/properties/817-stoney-bridge-way-preview.png\n/images/properties/817-stoney-bridge-way.png');
  await page.getByLabel('Publish to the public catalog').check();
  await page.getByRole('button', { name: 'Save listing' }).click();
  await expect(page.getByText('Listing saved.', { exact: true })).toBeVisible();

  const response = await request.get('/api/properties/21436577');
  expect(response.ok()).toBe(true);
  expect((await response.json()).data).toMatchObject({
    name: '817 Stoney Bridge Way', price: 572990, listing_status: 'Active', beds: 4, baths: 4, square_feet: 3403, is_featured: false,
  });
  await page.goto('/');
  const slideshow = page.getByRole('region', { name: 'Featured properties' });
  await expect(slideshow.getByRole('link', { name: '817 Stoney Bridge Way' })).toBeVisible();
  const photo = slideshow.getByRole('img', { name: 'Photo of 817 Stoney Bridge Way' });
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(photo).toHaveAttribute('src', /\/images\/properties\/817-stoney-bridge-way\.png$/);
  await expect(slideshow).toContainText('$572,990');
  await expect(slideshow).toContainText('1 of 3');
});

test('homepage offers a working route when the deferred Atlas script fails', async ({ page }) => {
  let atlasChunkBlocked = false;
  await page.route('**/_next/static/chunks/**', async (route) => {
    if (route.request().resourceType() !== 'script') return route.continue();
    const response = await route.fetch();
    // The Atlas-only control identifies its deferred chunk across build hashes.
    if (response.ok() && (await response.text()).includes('Hide Interface')) {
      atlasChunkBlocked = true;
      await route.abort();
      return;
    }
    await route.fulfill({ response });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open Atlas View' }).click();

  const fallback = page.getByRole('alert');
  await expect(fallback.getByText('The Atlas view could not open.')).toBeVisible();
  expect(atlasChunkBlocked).toBe(true);
  await expect(fallback.getByRole('link', { name: /Open Atlas/ })).toHaveAttribute('href', '/atlas');
  await expect(fallback.getByText('You can still browse listings and explore the map.')).toBeVisible();
});
