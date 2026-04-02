// @ts-check
const { test, expect } = require('@playwright/test');

// Visual regression tests — screenshot comparison against baselines
// Run `npx playwright test --update-snapshots` to regenerate baselines after intentional changes

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#picker-grid', { state: 'visible', timeout: 5000 });
});

test.describe('Picker Screen', () => {
  test('competition picker layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('picker.png', { maxDiffPixelRatio: 0.01 });
  });
});

test.describe('Competition View — Results', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });
    // Navigate to round 4 (results phase)
    await page.locator('#prev-round').click();
    await page.waitForTimeout(800);
  });

  test('results phase full page', async ({ page }) => {
    await expect(page).toHaveScreenshot('results-full.png', { maxDiffPixelRatio: 0.01 });
  });

  test('winner card', async ({ page }) => {
    const winner = page.locator('#winner-display');
    await expect(winner).toHaveScreenshot('winner-card.png', { maxDiffPixelRatio: 0.01 });
  });

  test('leaderboard sidebar', async ({ page }) => {
    const lb = page.locator('.leaderboard-section');
    await expect(lb).toHaveScreenshot('leaderboard.png', { maxDiffPixelRatio: 0.01 });
  });

  test('song card', async ({ page }) => {
    const card = page.locator('.song-card').first();
    await expect(card).toHaveScreenshot('song-card.png', { maxDiffPixelRatio: 0.01 });
  });
});

test.describe('Competition View — Submission Phase', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });
    // Round 5 is in submission phase
  });

  test('submission phase layout', async ({ page }) => {
    await expect(page).toHaveScreenshot('submission-phase.png', { maxDiffPixelRatio: 0.01 });
  });

  test('theme display', async ({ page }) => {
    const theme = page.locator('#theme-display');
    await expect(theme).toHaveScreenshot('theme-display.png', { maxDiffPixelRatio: 0.01 });
  });
});
