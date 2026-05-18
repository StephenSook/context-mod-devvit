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
