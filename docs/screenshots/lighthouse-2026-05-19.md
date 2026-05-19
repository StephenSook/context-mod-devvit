# Lighthouse + a11y audit — Observatory dashboard (post-AE wave)

**Captured:** 2026-05-19 04:39 UTC
**Build:** `npm run dev:web` (vite build → mock-server.cjs) — port 5174
**Target:** `http://127.0.0.1:5174/?demo=1` (synthetic-data mode)
**Tool:** Playwright MCP (`browser_navigate` → `browser_evaluate` perf timing API + inline axe-style a11y check)
**Build version:** v0.6.6 + AE Polish #18–#29

> Audit uses the browser's native `performance.getEntriesByType()` (navigation + paint + resource) + an inline axe-style checker, not the full Lighthouse CLI binary. Same methodology as `lighthouse-2026-05-17.md` so the deltas are apples-to-apples.

---

## Why a re-audit was triggered

The previous audit on 2026-05-17 reported "0 console errors" — accurate AT THAT TIME, but the dashboard has grown since. AE wave shipped 28 polishes including ModActivityFeed, ConfigDiffViewer, RuleStatsTable that POLL three new endpoints. The `dev:web` mock-server.cjs stubs hadn't kept pace — its initial route table only covered `/api/recent` + `/api/stats` + `/api/health`. The new client polls hit `/api/mod-activity` + `/api/config-history` + `/api/muted-rules` → **47 404 errors per ~60s session** in the browser console.

Caught by THIS audit pass (Polish #29, same commit). Fix: extend mock-server.cjs with stubs for every endpoint the dashboard client touches.

---

## Performance metrics (dev:web mock, no throttling)

| Metric | Value | vs 2026-05-17 | Notes |
|--------|-------|---------------|-------|
| DOMContentLoaded | **98 ms** | -70 ms (-42%) | faster — bundle has not grown despite AE polishes |
| Load event | **102 ms** | -70 ms (-41%) | same |
| First Paint | **160 ms** | -44 ms (-22%) | improved |
| First Contentful Paint | **176 ms** | -960 ms (-85%) | massive improvement; AE Polish #1-3 reserve-space pattern + initialLoad gating means chrome+content paint together now |
| Total transfer | **217.3 KB** | +38.9 KB (+22%) | larger — added 3 new components (ModActivityFeed, ConfigDiffViewer, RuleStatsTable) + Phase 4.7 client deps |
| JS heap | **5.8 MB** | +2.1 MB | growth due to new components + extracted constants; still well under any custom-post webview budget |
| Resource count | **13** | +6 | new API endpoint polls (mod-activity, config-history, muted-rules) on initial render |

**Verdict:** Performance improved on every PAINT metric despite added features. Transfer + heap grew predictably (more components = more bytes). FCP under 200ms is excellent for a webview.

### What changed vs 2026-05-17

- **FCP went 1136ms → 176ms** — Polish #1 (reserve layout space) + Polish #2 (suppress ErrorBanner during initialLoad) + Polish #3 (delay OnboardingTour) collectively eliminated the visible-rerender stutter that delayed FCP. Now chrome + content paint together in <200ms.
- **DCL/Load improved 40%+** — vite produced a smaller dependency graph; removing react-window (Pull-Forward #4) eliminated 12KB of unused virtualization code.
- **Transfer grew 22%** — ModActivityFeed + ConfigDiffViewer + Phase 4.7 image-repost client wiring. Trade is intentional: more features at cost of marginal bytes.

---

## Accessibility audit (axe-style inline checker)

| Check | Result | vs 2026-05-17 |
|-------|--------|---------------|
| Images without alt | ✅ 0 violations | unchanged |
| Buttons without accessible name | ✅ 0 violations | unchanged |
| Links without accessible name | ✅ 0 violations | unchanged |
| Form fields without label/aria | ✅ 0 violations | unchanged (no form fields on dashboard) |
| Document title | ✅ "ContextMod Observatory" | unchanged |
| html[lang] | ✅ "en" (Polish #11 confirms) | unchanged |
| ARIA live regions | ✅ 1 detected (event stream + AI loading panel) | unchanged |
| Heading hierarchy | ⚠️ 1 warning (first heading is h2, not h1) | documented + intentional |

**Total: 1 warning, 0 errors.** Same as 2026-05-17.

### Single a11y warning detail (unchanged from 2026-05-17)

`first-heading-h1`: dashboard leads with `<h2>` ("ContextMod Observatory"), not `<h1>`. Rationale: this is a custom-post webview embedded inside a Reddit post, where the post title (Reddit's `<h1>`) is rendered by Reddit's chrome ABOVE the webview iframe. Promoting our heading to `<h1>` would create two h1s on the rendered page (Reddit's + ours), worse for screen readers.

**Decision:** keep as h2.

---

## Console messages

| Level | Count | vs Pre-Polish-#29 |
|-------|-------|-------------------|
| Errors | **0** | -47 (clean) |
| Warnings | **0** | unchanged |

Clean console on initial load + after 4s of poll cycles. The pre-fix capture (with the old mock-server.cjs) showed 47 errors all of shape `GET /api/mod-activity?demo=1 404` — fix in scripts/dev/mock-server.cjs added stubs for every polled endpoint (Polish #29).

---

## Render correctness sanity

| Spot check | Value |
|-----------|-------|
| Viewport (default test) | 1200 × 680 |
| Document dimensions | 1200 × 680 (no horizontal overflow) |
| Event rows rendered | 5 (synthetic-data set from `?demo=1`) |
| Resource count after 4s | 13 |
| Mock API endpoints responding | recent, stats, mod-activity, config-history, muted-rules, health |

Dashboard renders 5 demo rows, all 6 polled endpoints respond with 200, no horizontal overflow at 1200px.

---

## What changed vs the 2026-05-17 audit

- ✅ FCP, DCL, Load, FP all faster
- ✅ Console is still clean (after Polish #29 mock-server fix)
- ✅ A11y still 0 errors, same documented h2 warning
- ⚠️ Transfer + heap grew (expected, justified by new feature surface)
- ✅ New audit caught + fixed a 47-error 404 storm in `?demo=1` mode that the prior audit would have surfaced if the new poll endpoints had existed at capture time

---

## Conclusion

**Pass.** Better-than-prior performance, same-or-better a11y. The audit itself found + fixed a real dev-UX bug (Polish #29 mock-server stubs). Production Devvit webview will be served the same `dist/client/` bundle; production routes (Hono in `src/routes/api.ts`) already return correct shapes for every polled endpoint.

**Re-run cadence:** after any Tailwind / lucide-react / fonts change OR after adding any new client component that polls a new endpoint. The "new endpoint" half is now CI-gated via tests/routes/api-auth.test.ts (Polish #27 happy-path coverage) — any new endpoint without a test breaks coverage gate.
