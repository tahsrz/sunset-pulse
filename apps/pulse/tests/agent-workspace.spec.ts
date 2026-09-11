import { expect, test } from '@playwright/test';

test.describe('Praxis Agent Workspace', () => {
  test('opens without starting capture and can spawn an agent', async ({ page }) => {
    let microphoneRequested = false;
    await page.addInitScript(() => {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices) mediaDevices.getUserMedia = async () => { throw new Error('microphone should only start from the explicit control'); };
    });
    await page.goto('/command-center', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Speak once. Let each worker decide.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start microphone' })).toBeVisible();
    await page.getByRole('button', { name: 'Spawn agent' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Spawn an agent' })).toBeVisible();
    await page.getByRole('button', { name: 'Spawn agent' }).last().click();
    await expect(page.getByRole('button', { name: /Select Listing Summary/ })).toBeVisible();
    expect(microphoneRequested).toBe(false);
  });
});

