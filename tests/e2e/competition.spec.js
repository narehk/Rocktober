// @ts-check
const { test, expect } = require('@playwright/test');

// Uses existing test-2026 competition data (5 rounds, results on rounds 1-4)

test.beforeEach(async ({ page }) => {
  // Navigate first, THEN clear storage (avoids SecurityError on about:blank)
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#picker-grid', { state: 'visible', timeout: 5000 });
});

// ─── PICKER ──────────────────────────────────────────────────────────────────

test.describe('Competition Picker', () => {
  test('shows picker on fresh load', async ({ page }) => {
    await expect(page.locator('#picker-screen')).toBeVisible();
    await expect(page.locator('.picker-title')).toContainText('SELECT COMPETITION');
  });

  test('displays competitions from registry', async ({ page }) => {
    const cards = page.locator('.comp-card');
    await expect(cards).toHaveCount(2);
    await expect(page.locator('.comp-card:has-text("Test Competition 2026")')).toBeVisible();
    await expect(page.locator('.comp-card:has-text("Rocktober 2024")')).toBeVisible();
  });

  test('shows status badges', async ({ page }) => {
    await expect(page.locator('.comp-card:has-text("Test Competition 2026") .comp-card-status')).toBeVisible();
    await expect(page.locator('.comp-card:has-text("Rocktober 2024") .comp-card-status')).toBeVisible();
  });

  test('clicking competition navigates to it', async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#competition-screen', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#picker-screen')).toBeHidden();
    await expect(page.locator('#competition-screen')).toBeVisible();
  });

  test('back button returns to picker', async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#competition-screen', { state: 'visible', timeout: 5000 });
    await page.locator('#back-to-picker').click();
    await expect(page.locator('#picker-screen')).toBeVisible();
  });
});

// ─── COMPETITION VIEW ────────────────────────────────────────────────────────

test.describe('Competition View', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });
  });

  test('shows competition name in header', async ({ page }) => {
    await expect(page.locator('.tagline')).toContainText('Test Competition 2026');
  });

  test('shows leaderboard with member names', async ({ page }) => {
    const lb = page.locator('#leaderboard');
    await expect(lb).toBeVisible();
    for (const name of ['Kerry', 'Tanya']) {
      await expect(lb.locator(`text=${name}`)).toBeVisible();
    }
  });

  test('shows competition info', async ({ page }) => {
    const info = page.locator('#comp-info');
    await expect(info).toContainText('5 members');
  });

  test('shows round badge', async ({ page }) => {
    const badge = page.locator('#round-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/ROUND \d+/);
  });

  test('shows theme title', async ({ page }) => {
    const title = page.locator('#theme-title');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text.length).toBeGreaterThan(0);
  });

  test('shows phase badge', async ({ page }) => {
    const badge = page.locator('#phase-badge');
    await expect(badge).toBeVisible();
    const text = (await badge.textContent()).toUpperCase();
    expect(text).toMatch(/SUBMISSION|VOTING|RESULTS/);
  });

  test('shows auth bar', async ({ page }) => {
    // Either invite code input or logged-in display should be visible
    const authBar = page.locator('#auth-bar');
    const authUser = page.locator('#auth-user');
    const eitherVisible = await authBar.isVisible() || await authUser.isVisible();
    expect(eitherVisible).toBeTruthy();
  });
});

// ─── ROUND NAVIGATION ────────────────────────────────────────────────────────

test.describe('Round Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });
  });

  test('previous button navigates back', async ({ page }) => {
    const badge = page.locator('#round-badge');
    const initialText = await badge.textContent();

    await page.locator('#prev-round').click();
    await page.waitForTimeout(500);

    const newText = await badge.textContent();
    expect(newText).not.toBe(initialText);
  });

  test('next button navigates forward after going back', async ({ page }) => {
    await page.locator('#prev-round').click();
    await page.waitForTimeout(500);

    const badge = page.locator('#round-badge');
    const afterBack = await badge.textContent();

    await page.locator('#next-round').click();
    await page.waitForTimeout(500);

    const afterForward = await badge.textContent();
    expect(afterForward).not.toBe(afterBack);
  });

  test('completed rounds show RESULTS phase', async ({ page }) => {
    // Go back to round 4 which has results
    await page.locator('#prev-round').click();
    await page.waitForTimeout(500);

    const badge = page.locator('#phase-badge');
    await expect(badge).toContainText(/RESULTS/i);
  });

  test('round badge shows date for past rounds', async ({ page }) => {
    await page.locator('#prev-round').click();
    await page.waitForTimeout(500);

    const badge = page.locator('#round-badge');
    await expect(badge).toContainText(/2026/);
  });
});

// ─── RESULTS PHASE ───────────────────────────────────────────────────────────

test.describe('Results Phase', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });

    // Navigate back to a round with results (round 4 = 1 click back from round 5)
    await page.locator('#prev-round').click();
    await page.waitForTimeout(800);
  });

  test('shows WINNER heading', async ({ page }) => {
    await expect(page.locator('#winner-display')).toBeVisible();
    await expect(page.locator('#winner-display .pixel-text')).toContainText('WINNER');
  });

  test('shows winner card with song details', async ({ page }) => {
    const card = page.locator('#winner-card');
    await expect(card).toBeVisible();
    const text = await card.textContent();
    expect(text.length).toBeGreaterThan(5);
  });

  test('shows submissions', async ({ page }) => {
    const grid = page.locator('#submissions-grid');
    await expect(grid).toBeVisible();
    const cards = grid.locator('.song-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('submission cards have song title', async ({ page }) => {
    const firstCard = page.locator('.song-card').first();
    const title = firstCard.locator('.song-title');
    await expect(title).toBeVisible();
  });

  test('submission cards have artist name', async ({ page }) => {
    const firstCard = page.locator('.song-card').first();
    const artist = firstCard.locator('.song-artist');
    await expect(artist).toBeVisible();
  });

  test('submission cards have service links', async ({ page }) => {
    const links = page.locator('.open-link, .service-link').first();
    await expect(links).toBeVisible();
  });

  test('shows playlist export buttons', async ({ page }) => {
    await expect(page.locator('#export-playlist')).toBeVisible();
    await expect(page.locator('#export-spotify')).toBeVisible();
  });

  test('shows reaction buttons on cards', async ({ page }) => {
    const reactions = page.locator('.reactions-bar').first();
    await expect(reactions).toBeVisible();
  });
});

// ─── AUTHENTICATION ──────────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });
  });

  test('shows invite code input when not authenticated', async ({ page }) => {
    // Auth modal opens via SIGN IN button
    await page.locator('#auth-show-modal').click();
    await expect(page.locator('#invite-code')).toBeVisible();
  });

  test('shows JOIN button', async ({ page }) => {
    await page.locator('#auth-show-modal').click();
    await expect(page.locator('#auth-submit')).toBeVisible();
    await expect(page.locator('#auth-submit')).toContainText('JOIN');
  });
});

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });
  });

  test('shows all members', async ({ page }) => {
    const lb = page.locator('#leaderboard');
    for (const name of ['Kerry', 'Tanya', 'Aaliyah', 'Devon', 'Marcus']) {
      await expect(lb.locator(`text=${name}`)).toBeVisible();
    }
  });

  test('shows win counts', async ({ page }) => {
    const lb = page.locator('#leaderboard');
    // Kerry has 2 wins
    await expect(lb.locator('text=2W').first()).toBeVisible();
  });

  test('leader is listed first', async ({ page }) => {
    const firstEntry = page.locator('#leaderboard .lb-row, #leaderboard .lb-entry').first();
    await expect(firstEntry).toContainText('Kerry');
  });
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────

test.describe('Comments', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('.comp-card:has-text("Test Competition 2026")').click();
    await page.waitForSelector('#theme-display', { state: 'visible', timeout: 10000 });
  });

  test('shows comments section', async ({ page }) => {
    await expect(page.locator('#comments-section')).toBeVisible();
    await expect(page.locator('.comments-heading')).toContainText('COMMENTS');
  });
});

// ─── ERROR HANDLING ──────────────────────────────────────────────────────────

test.describe('Error Handling', () => {
  test('invalid slug shows error or falls back to picker', async ({ page }) => {
    await page.goto('/#competition=nonexistent-slug-xyz');
    await page.waitForTimeout(3000);

    // Should show error state or picker
    const errorVisible = await page.locator('#error').isVisible();
    const pickerVisible = await page.locator('#picker-screen').isVisible();
    expect(errorVisible || pickerVisible).toBeTruthy();
  });
});

// ─── URL ROUTING ─────────────────────────────────────────────────────────────

test.describe('URL Routing', () => {
  test('hash URL loads competition directly', async ({ page }) => {
    await page.goto('/#competition=test-2026');
    await page.waitForSelector('#competition-screen', { state: 'visible', timeout: 10000 });
    await expect(page.locator('#competition-screen')).toBeVisible();
  });
});
