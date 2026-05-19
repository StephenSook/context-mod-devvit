/**
 * Z3-X53 — axe-core a11y scan. Catches WCAG-level violations (color
 * contrast, ARIA misuse, missing labels, focus order) on every E2E run.
 *
 * Runs against the live dashboard at /?demo=1 so we exercise the real
 * rendered output. Critical + serious violations FAIL the test;
 * moderate + minor get logged for follow-up.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Observatory dashboard a11y (Z3-X53)', () => {
  test('dashboard has no critical or serious axe violations', async ({ page }) => {
    await page.goto('/?demo=1');
    await page.evaluate(() => localStorage.setItem('cm-tour-seen-v1', '1'));
    await page.reload();
    await expect(page.getByText('Actions today').first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (blocking.length > 0) {
      console.log('axe violations:', JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });

  test('expanded event row drill-down keeps a11y clean', async ({ page }) => {
    await page.goto('/?demo=1');
    await page.evaluate(() => localStorage.setItem('cm-tour-seen-v1', '1'));
    await page.reload();
    await page.locator('button[aria-expanded]').first().click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(blocking).toEqual([]);
  });

  test('AE Polish #15 — AI explainer loading + error states scan clean', async ({ page }) => {
    // Agent D #7: the drill-down expanded row test scans the static layout
    // but never the AI panel's loading skeleton or error states — exactly
    // the hero demo surface for judges. Click Explain w/ AI, scan during
    // the loading state (skeleton + aria-live), then scan after the
    // mocked error response renders. Network requests intercepted so we
    // don't hit OpenAI in CI.
    await page.route('**/api/explain-event', async (route) => {
      // Delay response so the loading state stays mounted long enough to scan.
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'mod auth required for /api/explain-event' }),
      });
    });
    await page.goto('/?demo=1');
    await page.evaluate(() => localStorage.setItem('cm-tour-seen-v1', '1'));
    await page.reload();
    await page.locator('button[aria-expanded]').first().click();
    const explainBtn = page.getByRole('button', { name: /Explain with AI/i });
    await explainBtn.click();
    // Loading state: pulse-dot skeleton, aria-busy, aria-live polite
    const loadingResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const loadingBlocking = loadingResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (loadingBlocking.length > 0) {
      console.log('AI loading axe violations:', JSON.stringify(loadingBlocking, null, 2));
    }
    expect(loadingBlocking).toEqual([]);
    // Wait for the 401 to land + friendly-error render
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
    const errResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const errBlocking = errResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(errBlocking).toEqual([]);
  });

  test('AC — light-mode toggle preserves WCAG AA contrast (no new violations)', async ({
    page,
  }) => {
    await page.goto('/?demo=1');
    await page.evaluate(() => localStorage.setItem('cm-tour-seen-v1', '1'));
    await page.reload();
    await expect(page.getByText('Actions today').first()).toBeVisible();

    // Toggle to light mode + verify data-theme attribute flips
    await page.getByRole('button', { name: /Switch to light mode/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Re-scan after the contrast/background invert — color-contrast is the
    // exact axe-checkable surface a light-mode regression would break.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (blocking.length > 0) {
      console.log('light-mode axe violations:', JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });
});
