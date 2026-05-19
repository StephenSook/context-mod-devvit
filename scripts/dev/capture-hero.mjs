#!/usr/bin/env node
/**
 * AE Polish #51 — refresh README hero image.
 *
 * Captures the dashboard at /?demo=1 against the running dev:web server.
 * Usage: PORT=5174 node scripts/dev/capture-hero.mjs
 *
 * Suppresses the OnboardingTour via localStorage flag + disables animations
 * so the capture is deterministic.
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const PORT = Number(process.env.PORT) || 5173;
const URL = `http://127.0.0.1:${PORT}/?demo=1`;
const OUT = 'docs/screenshots/dashboard-desktop.png';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 680 } });
const page = await ctx.newPage();

// Pre-seed localStorage to suppress the onboarding tour (which would
// overlay the dashboard chrome). Storage gets cleared on navigation if
// origin changes, so set it via addInitScript at context level.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('cm-tour-seen-v1', '1');
  } catch {
    /* ignore */
  }
});

await page.goto(URL, { waitUntil: 'networkidle' });
// Disable animations so the page settles immediately for the capture.
await page.addStyleTag({
  content: `*, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
  }`,
});
// Wait for fade-up animations to have settled + at least one poll cycle.
await page.waitForTimeout(1500);

mkdirSync(dirname(OUT), { recursive: true });
const buf = await page.screenshot({ fullPage: false, animations: 'disabled' });
writeFileSync(OUT, buf);

console.log(`[capture-hero] ${OUT} (${buf.length} bytes)`);

await browser.close();
