import { test, expect } from '@playwright/test';

/**
 * Phase 5 — Config editor E2E: light happy-path smoke against demo mode.
 *
 * Runs against `?demo=1` via the mock-server which now stubs all five
 * editor API endpoints (raw/validate/simulate-live/explain/save).
 *
 * Coverage:
 *   - "Edit config" button opens the workbench overlay
 *   - CodeMirror editor is visible (.cm-editor)
 *   - All three preview tabs are present (Impact / Explain / Diff)
 *   - Impact tab eventually shows the fire-rate text from simulateLiveSafe
 *
 * Intentionally light: no full save round-trip assertion (the mock save
 * returns ok:true but the post-save reload would race the debounced validate;
 * tab-visible + impact-text are the must-have assertions).
 */

test.describe('Config editor workbench', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?demo=1');
    // Dismiss onboarding tour so it does not obscure the Edit config button
    await page.evaluate(() => localStorage.setItem('cm-tour-seen-v1', '1'));
    await page.reload();
  });

  test('opens workbench with CodeMirror editor visible', async ({ page }) => {
    // Wait for the dashboard to settle (stat cards imply data loaded)
    await expect(page.getByText('Actions today').first()).toBeVisible();

    // Click the Edit config button in the ActionBar
    const editBtn = page.getByRole('button', { name: /edit config/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // The workbench overlay must be present
    await expect(page.locator('.cm-workbench')).toBeVisible();

    // CodeMirror must have rendered its editor container
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 10_000 });
  });

  test('workbench shows three preview tabs: Impact, Explain, Diff', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();

    await page.getByRole('button', { name: /edit config/i }).click();
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 10_000 });

    // All three tabs must be in the tab list
    const tabList = page.getByRole('tablist');
    await expect(tabList.getByRole('tab', { name: /impact/i })).toBeVisible();
    await expect(tabList.getByRole('tab', { name: /explain/i })).toBeVisible();
    await expect(tabList.getByRole('tab', { name: /diff/i })).toBeVisible();
  });

  test('Impact tab renders fire-rate text from mock simulate-live', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();

    await page.getByRole('button', { name: /edit config/i }).click();
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 10_000 });

    // Impact is the default tab; the debounce fires after 700 ms.
    // The mock returns firedCount:3, totalSamples:25 -> "Would fire on 3/25"
    await expect(page.getByText(/would fire on/i)).toBeVisible({ timeout: 5_000 });
  });

  test('Close editor button hides workbench', async ({ page }) => {
    await expect(page.getByText('Actions today').first()).toBeVisible();

    await page.getByRole('button', { name: /edit config/i }).click();
    await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /close editor/i }).click();
    await expect(page.locator('.cm-workbench')).not.toBeVisible();
  });
});
