# Wave U — Code review hotfixes (3 BLOCKERs + 1 BUG + 6 WARNs)

> Source: parallel code review (5 background agents) on TODAY's Wave S + T commits. CR3 silent-failure-hunter surfaced 3 BLOCKER + 1 BUG + 6 WARN findings. CR2 AI-slop scan surfaced 1 WARN (dryRunActivity wording). CR1 codex / CR4 test-coverage / CR5 comment-analyzer still pending.

## Findings ranked by severity

### BLOCKERS (3)

1. **`src/core/simulateRule.ts:91-97`** — per-sample `catch` discards error + marks `triggered=false`. Mod sees "fired on 0/25" instead of "errored on 25/25". Pure-FALSE positive lie.

2. **`src/state/muteSet.ts:24-31` + `unmuteRule:33-40`** — Redis failure → console.warn + resolve void. Route returns `{ok:true}` to UI + writes "mute-rule" entry to mod activity log THAT NEVER HAPPENED.

3. **`src/routes/api.ts:30-36, 69-75, 98-103, 121-126`** — 4 endpoints return HTTP 200 + empty array on `getCurrentSubreddit` failure. Dashboard can't distinguish infra-down from no-data-yet. ModActivityFeed renders `null` so invisible failure.

### BUG (1)

4. **`src/client/components/OnboardingTour.tsx:20-27`** — `hasSeenTour` returns `true` (suppress) on localStorage exception. Safari/Firefox enhanced tracking + iframe-restricted storage = first-time mods NEVER see the tour. Fail-closed wrong direction.

### WARNs (6)

5. `src/core/explainRule.ts:57-58, 66-69` — OpenAI errors lose body context (rate-limit, auth, billing all collapse to status code)
6. `src/state/modActivity.ts:32-41` — ZSET write failures silent (audit log gap)
7. `src/routes/forms.ts:217-221` — `/simulate-rule-submit` collapses error class (parse vs reddit vs unexpected)
8. `src/client/components/ConfigDiffViewer.tsx:15-17` — fetch error mapping drops stack + URL
9. `src/client/components/ModActivityFeed.tsx:20-23, 42-43` — same stack drop + `null` render hides infra failures
10. `src/client/hooks/useKeyboardShortcuts.ts:21-25` — handler throw kills listener silently; React error boundaries don't catch in event handlers
11. (CR2) `src/core/dryRunActivity.ts:12-14` — "always elevates" AI-tone wording (internal comment, low priority)

---

## Phase U1 — simulateRule per-sample error surface (BLOCKER 1)

**Files:** Modify `src/core/simulateRule.ts` + `tests/core/simulate-rule.test.ts`

- [ ] Step 1: Add `errored: boolean` to `SimulationBreakdown` type
- [ ] Step 2: Add `erroredCount: number` + `firstError?: string` to `SimulationResult`
- [ ] Step 3: In per-sample try/catch: capture err.message, set `triggered=false errored=true`, increment erroredCount, save firstError if not set
- [ ] Step 4: Update `formatSimulationToast` to surface errors: "Rule fired on X/Y, Z samples errored: <firstError>"
- [ ] Step 5: 3 new tests: rule throws on every sample / mixed errors+fires / single-sample error reported in firstError

Atomic commit + push.

---

## Phase U2 — muteSet failure surfaces (BLOCKER 2)

**Files:** Modify `src/state/muteSet.ts` + `src/routes/api.ts` (mute/unmute endpoints) + `tests/state/mute-set.test.ts`

- [ ] Step 1: Change `muteRule` / `unmuteRule` from `Promise<void>` to `Promise<{ok: true} | {ok: false, error: string}>`. Catch path returns `{ok:false, error: msg}`. listMutedRules + isRuleMuted stay best-effort soft-fail (read-only, less critical).
- [ ] Step 2: `/api/mute-rule` + `/api/unmute-rule` in api.ts — check the result, return 500 + error on failure, only log mod-activity on success
- [ ] Step 3: 2 new tests for the Result-typed signature

Atomic commit + push.

---

## Phase U3 — API endpoints return 500 on infra failure (BLOCKER 3)

**Files:** Modify `src/routes/api.ts` (5 endpoints)

- [ ] Step 1: For each catch on `getCurrentSubreddit` (in /api/recent, /api/config-history, /api/mod-activity, /api/muted-rules): return `c.json({ error: 'subreddit context unavailable' }, 500)` instead of empty array + 200
- [ ] Step 2: Update client-side `fetchRecentSafe` / `fetchStatsSafe` / `fetchConfigHistory` / `fetchModActivity` to surface the error message (they already check res.ok — confirm the error path renders an error banner not "empty")
- [ ] Step 3: Verify existing api.test.ts 20 tests still pass (they mock fetch responses + assert ApiResult shape — should be intact)

Atomic commit + push.

---

## Phase U4 — OnboardingTour fail-open on localStorage error (BUG)

**Files:** Modify `src/client/components/OnboardingTour.tsx` + `tests/client/onboarding-tour.test.tsx`

- [ ] Step 1: Refactor `hasSeenTour`: separate the SSR check (return true to suppress; correct) from the localStorage check (return FALSE on exception; show tour on storage error — fail-open)
- [ ] Step 2: Add module-scope `inMemorySeen` boolean so within-session `markTourSeen` still suppresses re-show even when localStorage is broken
- [ ] Step 3: 2 new tests: localStorage.getItem throws → returns false / markTourSeen + hasSeenTour roundtrip works even when localStorage.setItem throws

Atomic commit + push.

---

## Phase U5 — WARN fixes batched (5+6+7+8+9+10+11)

**Files:** Modify in one commit (small targeted changes):

- [ ] explainRule.ts: await res.text() on non-ok, parse OpenAI error.code/.message, branch on err.name in catch (AbortError / TypeError / generic)
- [ ] modActivity.ts: keep soft-fail but log structured warn `{sub, kind, actor, err}` for ops visibility
- [ ] forms.ts /simulate-rule-submit: prefix toast w/ failure phase (parse / reddit / sim / fmt)
- [ ] ConfigDiffViewer.tsx fetchConfigHistory: console.error w/ URL + demo flag before mapping to user string
- [ ] ModActivityFeed.tsx: render caption "activity feed unavailable: <err>" on `!state.ok` instead of null
- [ ] useKeyboardShortcuts.ts: wrap `match.handler()` in try/catch + console.error w/ key
- [ ] dryRunActivity.ts:12-14: rewrite "always elevates" → "always forces dry-run mode on" (CR2 WARN)

Atomic commit + push.

---

## Phase U6 — verify all green + Playwright re-verify

- [ ] npm test (should still pass + new tests added)
- [ ] npm run lint
- [ ] npm run type-check
- [ ] Playwright sanity nav to dev:web ?demo=1
- [ ] git status -sb clean

---

## Self-review

**Coverage:** all 3 BLOCKERs + 1 BUG + 6 WARNs mapped 1:1 to phases.

**Risk:** U3 changes API contract from 200+empty to 500+error. Client code already handles 500 via ApiResult.ok=false branch (verified via api.ts:25 `if (!res.ok) return {ok:false}`). Safe.

**Sequencing:** BLOCKERs first (U1-U3). BUG next (U4). WARN batch last (U5). Verify (U6).

---

_Plan saved 2026-05-17 by Stephen via Claude Code, Wave U code-review hotfix wave._
