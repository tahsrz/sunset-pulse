import { test, expect } from '@playwright/test';

/**
 * Sunset Grill E2E Premium Hospitality Flow
 * Covers menu exploration, category tabs, detailed customization modal,
 * order tray hook updates, checkout pipeline, and live tracker syncing.
 */
test.describe('Sunset Grill Premium Menu & Hospitality Flow', () => {
  test.setTimeout(60000); // Allow sufficient time for Next.js mock-mode DB setup

  test.beforeEach(async ({ page }) => {
    // Navigate to the Grill hub page
    await page.goto('/grill');
    await page.waitForLoadState('networkidle');
  });

  test('should render grill header, category tabs, and food item cards', async ({ page }) => {
    // Ensure the main brand title is visible and matches styling configurations
    const headerTitle = page.locator('h1.font-extrabold');
    await expect(headerTitle).toBeVisible();

    // Ensure the address or location is active
    const address = page.locator('text=/Est. 2026|Local Quality/i');
    await expect(address.first()).toBeVisible();

    // Ensure the dynamic category tabs are displayed
    const tabs = page.locator('[id^="grill-tab-"]');
    await expect(tabs.first()).toBeVisible();

    // Ensure food item cards populate the grid
    const itemCards = page.locator('article');
    await expect(itemCards.first()).toBeVisible({ timeout: 20000 });
  });

  test('should support dynamic category tab switching', async ({ page }) => {
    // Assert the default "All" tab is active (has the sunset gradient styling class)
    const allTab = page.locator('button#grill-tab-all');
    await expect(allTab).toBeVisible();
    await expect(allTab).toHaveClass(/bg-gradient-to-r/);

    // Switch to another category (e.g. Burgers) if available in database/mock response
    const burgerTab = page.locator('button#grill-tab-burgers');
    if (await burgerTab.isVisible()) {
      await burgerTab.click();
      await expect(burgerTab).toHaveClass(/bg-gradient-to-r/);
      await expect(allTab).not.toHaveClass(/bg-gradient-to-r/);
    }
  });

  test('should open detailed modal, customize item, add to tray, and complete order checkout', async ({ page }) => {
    // Click the first card in the grid to open the Customization Modal
    const firstCard = page.locator('article').first();
    await expect(firstCard).toBeVisible();
    const firstCardName = await firstCard.locator('h2').innerText();
    await firstCard.click();

    // Verify modal overlay opens and has correct details
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toContainText(firstCardName);

    // Verify special instructions field and fill it in
    const instructionsInput = modal.locator('textarea#grill-special-instructions');
    await expect(instructionsInput).toBeVisible();
    const testInstructions = 'No pickles, extra heavy sauce, toasted bun';
    await instructionsInput.fill(testInstructions);

    // Verify quantity counter default
    const quantityCount = modal.locator('span.font-mono');
    await expect(quantityCount).toHaveText('1');

    // Click the plus button (the third button in the modal hierarchy: close is 0, minus is 1, plus is 2)
    const plusBtn = modal.locator('button').nth(2);
    await plusBtn.click();
    await expect(quantityCount).toHaveText('2');

    // Add customized items to Tray
    const modalAddButton = modal.locator('button#grill-modal-add-button');
    await expect(modalAddButton).toBeVisible();
    await modalAddButton.click();

    // Verify floating order tray hook review button pops up and becomes visible
    const reviewTrayBtn = page.locator('#grill-floating-tray-review');
    await expect(reviewTrayBtn).toBeVisible({ timeout: 10000 });

    // Verify tray count reflects the added quantity of 2
    const cartCounter = page.locator('span.bg-rose-600');
    await expect(cartCounter).toHaveText('2');

    // Click Review Tray to navigate to Checkout
    await reviewTrayBtn.click();

    // Validate cart routing
    await page.waitForURL('**/cart');
    await page.waitForLoadState('networkidle');

    // Confirm item is present inside cart item lists
    const cartItemTitle = page.locator('h2.text-lg.font-bold').first();
    await expect(cartItemTitle).toBeVisible();
    await expect(cartItemTitle).toContainText(firstCardName);

    // Click Pay at Counter to complete checkout
    const payAtCounterBtn = page.locator('button:has-text("Pay at Counter")');
    await expect(payAtCounterBtn).toBeVisible();
    await payAtCounterBtn.click();

    // Expect redirection to the live Pizza Tracker
    await page.waitForURL('**/grill/tracker/**');
    await page.waitForLoadState('networkidle');

    // Confirm live tracker title is active
    const trackerHeader = page.locator('span:has-text("Order Tracker")');
    await expect(trackerHeader).toBeVisible({ timeout: 15000 });
  });
});
