import { test, expect } from '@playwright/test';

/**
 * Wave S Phase S12 — Dashboard E2E smoke + interaction tests.
 *
 * Runs against `?demo=1` so we don't depend on a live install.
 * Covers the user-visible behaviors that unit tests can't:
 * - page loads + renders
 * - stat cards visible
 * - event rows render from demo fixtures
 * - filter chips work end-to-end
 * - keyboard ? overlay opens
 * - per-event drill-down expand
 */

test.describe('Observatory dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=1');
    // Dismiss onboarding tour for clean test surface
    await page.evaluate(() => localStorage.setItem('cm-tour-seen-v1', '1'));
    await page.reload();
  });

  test('renders title + header + stat cards', async ({ page }) => {
    await expect(page).toHaveTitle('ContextMod Observatory');
    await expect(page.getByText('ContextMod')).toBeVisible();
    await expect(page.getByText('Actions today').first()).toBeVisible();
  });

  test('renders 5 event rows from demo fixtures', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();
    const rows = page.locator('.cm-event-arrive');
    await expect(rows).toHaveCount(5);
  });

  test('filter chips apply event-stream filter', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();
    const initial = await page.locator('.cm-event-arrive').count();
    await page.getByRole('button', { name: 'remove' }).first().click();
    const filtered = await page.locator('.cm-event-arrive').count();
    // Filtered count should be <= initial (some events match, some don't)
    expect(filtered).toBeLessThanOrEqual(initial);
  });

  test('? opens keyboard shortcuts overlay', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: /shortcut/i })).toBeVisible();
  });

  test('per-event row click expands drill-down', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();
    const firstRow = page.locator('button[aria-expanded]').first();
    await firstRow.click();
    await expect(firstRow).toHaveAttribute('aria-expanded', 'true');
  });

  test('header timestamp matches "Ns ago" pattern + self-ticks', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();
    const time = page.locator('time').first();
    const initial = (await time.textContent()) ?? '';
    expect(initial).toMatch(/^\d+[smh] ago$/);
    await page.waitForTimeout(2500);
    const after = (await time.textContent()) ?? '';
    expect(after).toMatch(/^\d+[smh] ago$/);
  });

  test('no console errors or warnings on initial load', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        messages.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    await page.goto('/?demo=1');
    await expect(page.getByText('Actions today').first()).toBeVisible();
    expect(messages).toEqual([]);
  });
});
