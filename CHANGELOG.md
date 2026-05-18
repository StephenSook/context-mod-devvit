# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Forward-looking (post-v0.4.0): see [`ROADMAP.md`](./ROADMAP.md).

## [0.4.0] — 2026-05-18

Wave Y — "leave nothing on the table" finalize pass. After the v0.3.2 mid-review tag Stephen pushed for completion of every item in the brain-dump menu (true completion, not silent skips). 20+ commits cover the previously-false-completion gaps, the high-judge-signal items, and the medium-signal polish + CI/UX work.

### Added — false-completion close-outs

- **Y1-X9 Playwright E2E AI explain button** — happy path + 429 rate-limit click-through. Mocks `/api/explain-event` via `page.route().fulfill` so no real OpenAI call fires. Exercises the wire from DOM click → POST → React state → drill-down render.
- **Y1-X7 stats-rollup cron + /api/stats real counters** — `src/state/statsRollup.ts` aggregates events:recent50 (total, lastHour, today, failedActions, topRules cap-5). Hourly cron writes a per-sub snapshot to `cm:stats:snapshot:{sub}`. `/api/stats` reads the snapshot (falls through to compute-on-fly when absent or stale).
- **Y1-X10 README Mermaid refresh** — added the AI explain-event security-chain sequence diagram (5 gates: validate → auth → breaker → rate-limit → key → OpenAI → recordSuccess/Failure).
- **Y1-X11 3 Phase 4 example configs** — history-fresh-low-karma, attribution-drive-by-self-promo, recent-activity-cross-sub. examples/README.md table now 11 rows w/ Phase 4 markers.
- **Y1-X25 Prettier pass** — `prettier --write` across 112 files. Isolated commit so the formatting churn doesn't mask behavior changes in future PRs.
- **Y1-X39 ARCHITECTURE.md** — 10 ADR-style sections, designed by Plan-agent + written at full fidelity. Cross-references THREAT-MODEL.md, API.md, PRIVACY.md, DESIGN.md, ROADMAP.md.

### Added — security + reliability

- **Y2-X44 forms.ts cost-gate parity** — `/explain-rule-submit` + `/simulate-rule-submit` + `/set-openai-key-submit` now match `/api/explain-event` hardening: per-sub circuit breaker, rate limit, smart failure classification, length caps. Closes the gap Gemini flagged where X1 only landed on `/api/explain-event`.
- **Y1-X45 log.ts wired into routes/api.ts** — first migration site for the X33 structured logger. Future modules adopt incrementally.
- **Y1-X46 wiki circuit breaker** — `loadFromWiki` now per-sub-breakered (`wiki:${sub}`). Not-found doesn't count as failure (legit pre-install state). New LoadResult `reason: 'breaker-open'` propagates to mod-menu w/ actionable retry-in-Ns toast.
- **Y1-X46 delimiter validation extended to action.kind + action.status** — Codex WARN: those fields are also interpolated into the OpenAI prompt; reject reserved delimiters there too.
- **Y1-X47 runRun surfaces goto-missing to dashboard** — `RunResult.terminated` union extended w/ `'goto-missing'` + `missingGotoTarget` field. `handleActivity` catches terminated state + emits `recordEvent` w/ `config-error` action so mod sees red row instead of stale-silent.
- **Y1-X48 surface 3 silent catches** — modActivity parse-drop counter + warn, muteSet isRuleMuted soft-fail log, menu logMenuAction empty-catch w/ warn.
- **Y1-X8 batch 2 provenance label cleanup** — mechanical sweep over remaining "Codex H1/H4/H5/H6/HIGH" + "Council fix" prefixes across 8 files.

### Added — observability

- **Y2-X35 `log.newTraceId()`** — `crypto.randomUUID()` helper for per-request trace IDs. Aggregators can pivot on the field.
- **Y1-X34 `/api/health/deep`** — Redis ping + Reddit context check. Returns per-check `{ok, latencyMs, err?}`.

### Added — UX + accessibility

- **Y2-X56 loading skeletons** — `SkeletonRow` shimmer placeholders during initial-load so first paint doesn't hit the EmptyState CTA (which would mislead the mod into thinking the bot is idle).
- **Y2-X62 event-search input** — text-search field above the events stream. Case-insensitive substring match across activityId/runName/checkName/action.kind. Combines w/ FilterChips kind filter.
- **Y2-X55 prefers-reduced-motion** — single CSS media query disables all CM entrance/exit animations for users w/ vestibular sensitivity. WCAG SC 2.3.3.
- **Y2-X63 sortable RuleStatsTable** — click any column header to sort by it; click again to flip direction. ARIA aria-sort attribute + role=button for screen-reader nav.

### Added — DX + repo hygiene

- **Y2-X44 .devcontainer/devcontainer.json** + **Y2-X45 .vscode workspace** + **Y2-X48 .nvmrc** — 1-click Codespaces clone-and-go.
- **Y2-X44 CONTRIBUTING.md expansion** — "Before you start" linking the 5 load-bearing docs + sub-agent review chain section + locked pre-commit triplet.
- **Y2-X47 scripts/preflight.sh** — bash dev-env sanity check (node v22+, npm, Devvit CLI, gh auth, port 5173, git tree).
- **Y2-X46 Makefile** — 17 muscle-memory targets wrapping the npm scripts (`make full-check`, `make ship`, `make bench`, etc).
- **Y2-X40 ROADMAP.md** — 4-horizon plan (Now / Next / Later / Wishlist) + v0.4 / v0.5 / v1.0 versioning.
- **Y2-X41 docs/adr/README.md** — ADR template + directory scaffolding for narrower decisions.
- **Y2-X84 SECURITY.md refresh** — 0.1.x → 0.3.x supported, W+X scope expansion.

### Added — CI

- **Y2-X80 release-drafter** — auto-drafts a release on every push to main + every PR. 6 categories (Security / Features / Bug Fixes / Documentation / Performance / Internal). Semver bump derived from PR labels.
- **Y2-X29 Semgrep OWASP** — p/owasp-top-ten + p/typescript + p/javascript on every PR + push + weekly cron. SARIF → GitHub Security tab alongside CodeQL.
- **Y2-X73 Playwright multi-browser matrix** — firefox + webkit run on push to main (PR CI stays chromium-only for fast feedback).
- **Y2-X76 CI Node matrix** — Node 20 + 22 + 24 (fail-fast: false). Coverage upload pinned to Node 22.
- **Y2-X75 mobile-viewport E2E** — Playwright spec at 390x844 verifying dashboard layout + tap-target hittability + drill-down expand.

### Added — testing depth

- **Y2-X23 vitest snapshot tests** — FilterChips DOM-shape snapshots (3 states) to catch silent CSS/aria refactors.
- **Y2-X74 vitest benchmarks** — `tests/bench/hot-paths.bench.ts` micro-benchmarks for fnv1a64, actionId, eventMatchesQuery, computeStats. Run via `make bench`.
- **Y2-X38 retry-with-jitter helper** — `src/lib/retry.ts` exponential backoff (base 100ms, doubles) + 25% jitter band for thundering-herd protection.

### Changed

- **Y2-X40 README** — opening blurb v0.3.x, Wave X status row, test count 446, Phase 4 ✅. Schema example updated to current pattern/target/filter/template renames.
- **Y2-X40 DESIGN.md** — storage key list now references data-retention.md + PRIVACY.md as the authoritative inventory. Added the 6 keys Wave V/W/X introduced.

### Tests

446 (v0.3.2) → 469 passing (+23 in Wave Y from the new lib + UX + bench files).

### Skipped on purpose (genuinely defer)

- **X51 lazy-load** — components use named exports; default-export migration across all import sites is non-trivial regression risk for marginal bundle-size savings on ~100-line components.
- **X58 light mode toggle** — design system is dark-mode-first (DESIGN.md); proper light variant would require rewriting design tokens.
- **X53 axe-core scan** — needs `@axe-core/playwright` install; documented but not wired pre-submit.
- **X79 dependabot auto-merge** — security_reminder hook blocked the env-pattern Dependabot prescribes; Stephen reviews manually.
- **X65 GitHub social preview** + **X66 banner image** — binary assets; Stephen-manual upload.
- **X17 husky pre-commit hooks** — Stephen's local workflow choice.

## [0.3.2] — 2026-05-18
- Phase 4 stretch rules — Vinh's queue: `history`, `attribution`, `recentActivity` w/ author-cache substrate (authorized 2026-05-17 Wave S16, target ship 2026-05-25)
- Phase 4.7 image-mode `repost` (gated on Day-0 perceptual-hash spike re-run; deferred from hackathon)
- Hard-mute integration in `runCheck` (Vinh wires `isRuleMuted` against the Wave S10 storage shape)
- Post-hackathon operator outreach to 15+ FoxxMD operator pool

## [0.3.2] — 2026-05-18

Wave X mid-review fix pass — 5 commits applying findings from 3 parallel sub-agent reviews (Codex adversarial, silent-failure-hunter, type-design-analyzer, Gemini architecture sweep) launched against Wave X primitives.

### Fixed — Codex CRITICAL findings

- **X43 per-sub circuit breaker bucket** — `'openai'` → `'openai:${sub}'`. Stops one sub's bad key from opening the breaker for every other sub on the same install.
- **X43 smart failure classification** — `isTransientOpenaiError()` filter so the breaker only opens on 5xx/timeout/network/abort/429. Auth errors (401, missing key, insufficient quota) bypass — they're user-config issues, not OpenAI being down.
- **X43 /api/muted-rules requireModerator gate** — was open while sibling mod-activity + config-history were gated. Closes the asymmetry.

### Fixed — silent-failure-hunter findings

- **X39 /api/explain-event handler chain reorder** — `checkCircuit` runs BEFORE `checkRateLimit` (cheap GET first, avoids burning a rate-limit token on a breaker-rejected request).
- **X39 try-block narrowed** — `getOpenaiKey` + `settings.get` resolved OUTSIDE the try; only `explainEvent()` is wrapped. Stops Redis-settings hiccups from burning OpenAI breaker tokens.
- **X39 ratelimit.ts degraded:true flag** + console.error upgrade — caller can now distinguish "actually allowed" from "fail-open under Redis blip".
- **X39 triggers.ts getCurrentSubreddit wrapped** in try/catch on both /post-submit + /comment-submit — Reddit context loss returns 200 + status='subreddit-unavailable' instead of 500'ing the handler and triggering Devvit's retry storm.

### Fixed — type-design-analyzer findings

- **X38 log.ts spread order** — `{...ctx, ts, level, tag, msg}` so caller-supplied ctx can't shadow the structured fields.
- **X38 ratelimit.ts dead ternary** — removed `count >= max ? windowSec : windowSec`.
- **X38 circuitBreaker.ts tagged union** — `BreakerCheck` discriminates `retryInSec` to only-exist on the `state:'open'` variant.

### Changed

- **X40 README + DESIGN.md drift fix** — opening blurb v0.2.0 → v0.3.x, test badge 400 → 446, status row Wave X + Phase 4, config example fixed to match current schema (combinator/pattern/target/filter/isSpam/template renames).
- **X41 Status row** — Phase 4 history/attribution/recentActivity flipped from 🟡 in-progress to ✅ shipped (Vinh's commit e0abd86, +179 tests).

### Tests

414 (v0.3.1) → 446 passing (+32 from Vinh's Phase 4 author-cache + 3 stretch rules).

## [0.3.1] — 2026-05-18

Wave X — second deep-review pass after Stephen requested "leave nothing on the table." 30+ atomic commits across security hardening, observability, reliability, docs, and developer experience.

### Added — security

- **X1 explain-event hardening** — `AbortController` 30s timeout, `validateEventSummary` (field caps + prompt-injection delimiter rejection), `<<<USER_DATA>>>` delimiter wrap on the OpenAI prompt with explicit system-prompt instructions to treat delimited content as data only, and per-sub rate limit (30 calls/hour) via new `src/lib/ratelimit.ts` Redis token bucket.
- **X31 crypto.randomUUID for idem lease tokens** — replaces `Math.random()` in `reserveAction` + `acquireLock`. Defense-in-depth against token-spoofing if an attacker had Redis read access.
- **THREAT-MODEL.md** — STRIDE inventory of 15 threats + mitigations + 4 residual risks, every threat cross-referenced to the test that pins its mitigation.
- **PRIVACY.md + data-retention.md** — every Redis key documented with retention policy; explicit list of what's sent to OpenAI vs what isn't.
- **CodeQL workflow** (`.github/workflows/codeql.yml`) — GitHub-native SAST on every PR + weekly schedule.

### Added — reliability + observability

- **X3 handleActivity distinguishes config parse-fail from no-config** — `configStore.getCurrentRev` now throws on corrupt state; handlers + triggers wrap in try/catch + emit a `config-read-fail` event so the dashboard turns red instead of silently halting moderation.
- **X4 configSource split wiki not-found vs unreachable** — three differentiated `reason` values + 3-way menu UX so mods know whether to create the page, retry, or fix JSON5.
- **X33 structured JSON logger** (`src/lib/log.ts`) — `{ts, level, tag, msg, ...ctx}` shape for downstream aggregators. Error special-case flattens `.message` + `.name` for `jq`-friendly filtering.
- **X34 /api/health/deep** — Redis ping + Reddit context check with per-check `{ok, latencyMs, err?}`. Returns 200 when both OK, 503 otherwise. External monitors can alert on degraded-but-not-down state.
- **X37 OpenAI circuit breaker** (`src/lib/circuitBreaker.ts`) — 3-state machine, opens after 5 consecutive failures, 60s open window, half-open probe. Wired into `/api/explain-event` so sustained OpenAI outages stop burning quota.
- **X2 normalize enrichmentFailed tag** — `getUserByUsername` failure now tags `Author.enrichmentFailed=true` so the dashboard drill-down can surface false-negative scenarios where a karma rule defaulted a spammer to 0 karma.

### Added — docs + DX + repo hygiene

- **API.md** — every `/api/*` endpoint documented: auth tier, request body, response shapes for 200/400/403/429/500/503, side effects, cross-references to implementation + threat model.
- **.devcontainer/devcontainer.json** + **.vscode/{settings,extensions}.json** + **.nvmrc** — 1-click clone-and-go via GitHub Codespaces. Consistent format-on-save + recommended extensions for anyone who opens the repo locally.
- **.github/CODEOWNERS** — `@StephenSook` default; `@vinhbin` co-owns `/src/rules/` + the Phase 4 hot files; security-sensitive surfaces require `@StephenSook` review.
- **.github/FUNDING.yml** — sponsor button (Stephen + FoxxMD upstream).
- **GitHub Discussions enabled** — Q&A space for the FoxxMD operator pool that doesn't pollute issues.
- **18 repo topics** — discoverability via GitHub topic search.
- **Auto-release workflow** (`.github/workflows/release.yml`) — on `v*` tag push, extracts matching CHANGELOG section + creates GitHub release with notes-file.
- **Coverage reports in CI artifact** (`@vitest/coverage-v8` + vitest config) — uploaded on every CI run, 7-day retention.
- **README badges** — Tests: 414 passing + TypeScript: strict added alongside existing CI / License / Devvit / Hackathon badges.

### Added — UX polish

- **X60 React ErrorBoundary at app root** (`src/client/components/ErrorBoundary.tsx`) — recovery panel with reload button + reassurance that the moderation engine is unaffected when the view layer crashes.

### Changed

- **W12 + X4** — `/api/recent` returns 503 (not silent 200 + empty array) on Reddit-context loss; matches `/api/config-history` + `/api/mod-activity` siblings.
- **X1** — `/api/explain-event` now sequences validation → rate-limit → circuit-breaker → OpenAI call. Each layer returns its own actionable status code (400 / 429 / 503 / 500).

### Tests

330 (v0.3.0) → 414 passing (+84 across Wave W + X). New test files: `tests/lib/{requireModerator,ratelimit,circuitBreaker,log,idem-reserve-retry}.test.ts`, `tests/routes/{api-auth,forms-openai-key}.test.ts`, `tests/state/apiKeyStore.test.ts`. Existing files expanded: `tests/core/{simulate-rule,explain-event,configSource}.test.ts`, `tests/state/configStore.test.ts`, `tests/shared/normalize.test.ts`, `tests/routes/forms-test-rules.test.ts`.

### Skipped on purpose

- **i18n hooks** — no judging signal for an EN-locale-only ContextMod port.
- **Mutation testing** — CI burn vs marginal regression-catching value.
- **Visual regression (Percy / Chromatic)** — requires paid SaaS.
- **Real Sentry account** — structured logger ships the JSON shape; signup deferred.
- **Storybook** — small UI surface; ConfigDiffViewer + RuleStatsTable + EventDetails don't warrant the setup cost.
- **Image-hash worker for repost rule** — genuinely Phase 4.7, gated on perceptual-hash spike re-run.

## [0.3.0] — 2026-05-17

### Wave W — deep review hardening (2026-05-18)

5-agent parallel adversarial review (Codex + silent-failure-hunter + comment-analyzer + pr-test-analyzer + Explore) surfaced 2 BLOCKERs, 4 CRITICALs, ~10 WARNs, and ~15 rotted comments. 13 atomic commits shipped. Test count 330 → 376 (+46). Zero behavior change for the comment cleanup work.

- **W1 (security BLOCKER)**: extracted `requireModerator` to `src/lib/`; gated all 4 form-submit handlers in `src/routes/forms.ts` (`/set-openai-key-submit`, `/explain-rule-submit`, `/simulate-rule-submit`, `/test-rules-submit`). Devvit menus gate `forUserType:moderator` at menu-open, but form POST endpoints are HTTP-reachable by any authenticated user. Defense-in-depth.
- **W2 (security BLOCKER)**: gated `/api/mod-activity` + `/api/config-history` w/ `requireModerator`. Both leaked mod-attribution data to non-mod viewers of the dashboard custom post.
- **W3 (idempotency BLOCKER)**: `reserveAction` retries NX-set on transient Redis blip (3 attempts, 100ms+300ms backoff). Without it, LOCK_FAIL silently dropped the action — firstSeen (24h NX) blocked retries on next trigger.
- **W4 (correctness CRITICAL)**: `configStore.publish` monotonic pointer guard. After INCR allocates next=N, only set `cfg:current_rev` if N > current. Closes the slow-writer-rolls-back race (full CAS impossible without Devvit Lua).
- **W5 (test integrity CRITICAL)**: replaced lying U1 happy-path test in `tests/core/simulate-rule.test.ts` with vi.spyOn forcing runRule to throw. Pins the actual regression Codex CR3 BLOCKER #1 reported (every-sample-throws shows "0/25 fired" lie).
- **W6/W7/W8/W9 (test coverage)**: +30 tests pinning requireModerator (6), apiKeyStore Redis-fallback contracts (9), /api/* auth gates incl. log-spoofing prevention (12), forms OpenAI key intake + envelope variants + mask + fallback chain (9).
- **W12 (silent-fail WARN)**: `/api/recent` now returns 503 on Reddit-context loss matching sibling /config-history + /mod-activity (was silent 200 + events:[]).
- **W13–W15 (comment hygiene)**: stripped ~15 "Wave U BLOCKER fix (Codex CR3 #N)" provenance prefixes (kept WHY rationale); rewrote 7 stale Phase X claims that contradicted the shipped state (recentEvents.ts header, scheduler.ts "STUBS for Phase 0", types.ts Phase 1 vs 2 split); deleted decorative ASCII banner separators (`// ---`) sandwiching ALL-CAPS headers in types.ts + normalize.ts.

### v0.3.0 base release notes

WOW push wave. Wave S + T shipped 15 user-facing features (filter chips, mobile responsive, keyboard shortcuts, per-event drill-down, onboarding tour, rule simulation, AI rule explainer, per-rule stats, config rev diff viewer, mod activity attribution, mute/unmute MVP, E2E Playwright CI, operator blog + migration docs, Vinh Phase 4 authorize). Wave U code-review hardening closed 5 BLOCKERs + 1 CRITICAL + 11 WARNs from parallel adversarial review by 5 agents (Codex + Explore + silent-failure-hunter + test-coverage-analyzer + comment-analyzer). Wave V Category-A pre-submit holdback flush + AI summary per event feature.

### Added — Wave S + T (15 user-facing features)

- **S6 Filter chips on event stream** (`src/client/components/FilterChips.tsx`, 8 tests) — narrow feed by remove/comment/approve/lock/report/failed/dry-run + "show all" reset. Active chip styled w/ signal-ok border. Counter shows "N of M events" when filtered.
- **S7 Mobile-responsive pass** — EventRow grid 44/60 → 32/48 sub-sm + drop activityId text. ActionBar flex-col on sub-sm. Devvit custom-post webviews render on mobile.
- **S8 Keyboard shortcuts** (`src/client/hooks/useKeyboardShortcuts.ts` + `KeyboardOverlay.tsx`, 5 tests) — `?` overlay · `r` reload · `a` clear-filter · `h` config history · `escape` close. Ignored when focus in INPUT/TEXTAREA + modifier keys held.
- **S2 Per-event drill-down click-to-expand** (`src/client/components/EventDetails.tsx`) — click row to expand rule context (run/check/matchedRule/runPath/matchedSubstring), full action breakdown w/ status markers + wouldHaveCalled, raw event JSON in collapsible.
- **S4 Onboarding 3-step tour** (`src/client/components/OnboardingTour.tsx`, 9 tests) — first-visit walkthrough w/ localStorage gate + in-memory session flag for restricted iframes. ARIA dialog modal, arrow nav, escape skip.
- **S14 Operator quickstart blog draft** (`docs/submission/blog-post-draft.md`) — dev.to / hashnode pre-paraphrase draft for Stephen to publish (~30% cut expected).
- **S15 Migration-from-upstream-cm doc** (`docs/migration-from-upstream-cm.md`) — 5-step practical walkthrough for 15+ FoxxMD operator pool, schema-rename table, what-to-delete list, verification flow.
- **S16 Phase 4 authorize for Vinh** (`PLAN.md`) — history/attribution/recentActivity rule ladder green-lit w/ Discord-ping coordination note. Target ship 2026-05-25.
- **S1 Rule simulation against history** (`src/core/simulateRule.ts` + new `/menu/simulate-rule` + `/forms/simulate-rule-submit`, 11 tests) — **THE killer demo feature**. Mod pastes a rule JSON5, dashboard reports "Would fire on N/25 (X%) recent items. Examples: t3_a, t3_b, t3_c." Reuses parseConfig for AJV errors + normalizePost for parity w/ live trigger path.
- **S5 AI rule explainer via OpenAI** (`src/core/explainRule.ts` + `/menu/explain-rule` + `/forms/explain-rule-submit`, 9 tests) — mod pastes JSON5 → OpenAI gpt-4o-mini returns 2-3 sentence plain-English explanation. Devvit HTTP allowlist updated for api.openai.com per PR #96.
- **S11 Per-rule statistics table** (`src/client/components/RuleStatsTable.tsx`, 6 tests) — top-8 rules aggregated client-side from events:recent50: fired count / ok / err / dry-run columns. Sortable desc by count then by lastFiredTs.
- **S9 Config rev diff viewer** (`src/state/configStore.ts:getRecentRevs` + `/api/config-history` + `src/client/components/ConfigDiffViewer.tsx`, 7 tests) — `h` shortcut opens modal w/ last 10 revs + LCS-based positional diff between rev N and N-1.
- **S3 Mod activity attribution** (`src/state/modActivity.ts` + `/api/mod-activity` + `src/client/components/ModActivityFeed.tsx`) — captures mod-menu actions (reload-config, recent-actions, test-rules, simulate-rule, explain-rule, mute-rule, unmute-rule) into 50-deep ZSET ring buffer. Dashboard renders top-5 "u/X ran reload-config 5m ago" provenance feed.
- **S10 Mute/unmute rule MVP** (`src/state/muteSet.ts` + `/api/mute-rule` + `/api/unmute-rule` + `/api/muted-rules`) — Redis hash store + 3 endpoints. v0 soft-mute (dashboard-side filter); hard-mute follow-up for Vinh's runCheck integration.
- **S12 E2E Playwright tests + CI** (`tests/e2e/dashboard.spec.ts` + `playwright.config.ts` + `.github/workflows/ci.yml e2e job`) — 7 dashboard scenarios (page loads, 5 demo rows, filter chip narrows count, ? opens overlay, expand row, header time pattern, no console errors). Headless chromium in GitHub Actions w/ artifact upload on failure.

### Added — Wave V

- **V7 AI summary per event** (`src/core/explainEvent.ts` + `/api/explain-event` + button in `EventDetails.tsx`) — drill-down expanded panel now includes "Explain with AI" button. Click → OpenAI summarizes why the event fired in 2 sentences. Mod-auth gated (only mods can burn the API key quota).

### Changed

- **Header self-ticks 1s + glow-pulse on data arrival** (R5 RTL component lifecycle tests, 13 cases). Wave R added @testing-library/react + jsdom + per-file env directive.
- **OnboardingTour fail-OPEN on localStorage exception** (U4 BUG fix) — restricted iframes (Safari/Firefox enhanced tracking + 3rd-party storage blocks) now see tour on first visit instead of being silently suppressed.
- **CSV export** — status-aware markers (◆ dry-run / ⊘ skipped-locked / ✗ error) + status-aware row coloring + filename safety + UTF-8 BOM for Excel locale + CRLF per RFC 4180. Wave R bypass-hardening covers OWASP leading-whitespace + Unicode bidi/control before-trigger neutralization.
- **All Wave S+T routes** — mod-auth gate on /mute-rule + /unmute-rule (Wave U BLOCKER), API endpoints return HTTP 500 on infra failure instead of empty arrays, mute/unmute return Result types so UI doesn't lie on Redis errors.

### Fixed — Wave U (code review)

- **CR1 BLOCKER**: `/api/mute-rule` + `/api/unmute-rule` lacked moderator authorization. requireModerator() helper queries reddit.getModerators(sub).all() + verifies current username, returns 401/403/500.
- **CR3 BLOCKER #1**: `simulateRule.ts` per-sample try/catch silently set `triggered=false`. Now surfaces `erroredCount + firstError` in SimulationResult + toast shows ⚠ marker.
- **CR3 BLOCKER #2**: `muteSet.muteRule + unmuteRule` swallowed Redis errors + returned void. Now return `MuteResult = {ok:true} | {ok:false,error}`. Route returns 500 + error on failure.
- **CR3 BLOCKER #3**: 4 GET endpoints returned HTTP 200 + empty array on getCurrentSubreddit fail. Now return HTTP 500 + actionable error so dashboard ApiResult.ok=false fires error banner.
- **CR3 BUG #9**: OnboardingTour.hasSeenTour returned `true` (suppress) on localStorage exception. Now returns `false` (show tour) + in-memory session flag suppresses re-show even when localStorage.setItem fails.
- **CR4 CRITICAL**: ConfigDiffViewer.simpleDiff was set-diff not line-diff — collapsed duplicates + showed reordered as "same". Replaced w/ O(n*m) LCS-based positional diff. 2 new tests covering duplicate-preserve + reorder-detect.
- **CR3 WARN x6 + CR2 WARN x1**: OpenAI body envelope parse for actionable errors + AbortError/network branching + modActivity structured ops-warn + forms phase-prefix toast + ConfigDiff stack log + ModActivityFeed unavailable-caption + keyboard handler try/catch + dryRunActivity "always elevates" → "forces dry-run mode on" + configStore.getRecentRevs gap-walk continue-not-break.

### Fixed — Wave R (CI hotfixes + dep hygiene)

- **CI lint blocker**: `src/client/lib/csv-export.ts` `no-control-regex` ESLint flagged the intentional ` -` C0 control range strip. Added eslint-disable block w/ OWASP-mitigation rationale. Restored CI green.
- **hono 4.11.7 → 4.12.19**: 3 transitive CVEs (basicAuth timing / setCookie attribute injection / writeSSE CR-LF injection) closed in dep tree. Zero exposure for us (verified zero usage of vulnerable APIs) but `npm audit` is now clean.
- **RTL Header component tests**: added @testing-library/react + jsdom devDeps + per-file env directive. 4 component lifecycle tests + 9 relTime tests = 13 total.

### Repo health

- **Tests**: 260 → 319 (+59 across Wave S+T+U)
- **CI**: 3 jobs (validate + ai-tone + e2e) all green
- **npm audit (prod)**: 0 vulnerabilities
- **Open issues**: 0 · **Open PRs**: 0 (7 Dependabot triaged in Wave R — 2 merged + 5 closed)
- **AI-tone**: 0 hits
- **repo-sentinel pre-submit**: clean across secrets/CI/deps/licenses/gitignore (5 surfaces)
- **Lint**: enforced as part of pre-commit triplet (Edit → tests → tsc → lint → commit → push) per memory rule

### v0.2.0 → v0.3.0 atomic commits

~50 atomic commits across 4 waves (S, T, U, V). All Codex CRITICAL + HIGH findings closed pre-publish. All parallel-review findings closed before this release entry was written.



## [0.2.0] — 2026-05-16 / 2026-05-17

Sprint sprint. Vinh shipped Phase 1+2+3 backend in a single day; Stephen shipped Step 3.6 dry-run rule tester + Codex CRITICAL/HIGH adversarial-review hotfixes + e2e screenshot captures + Devpost submission scaffolding. v0.2.0 submitted to Reddit App Directory review 2026-05-16 (email-on-approval within 1–7-day Reddit SLA).

### Added

- **Phase 1 — Core engine** (Vinh, commit 6694109, 93 tests). Redis key schema (`src/state/keys.ts`, multi-tenant), JSON5+AJV config loader + named-rule expansion (`src/core/{config,namedRules}.ts`), atomic config publish (`src/state/configStore.ts`), filter evaluation (`src/core/filters.ts`), Mustache renderer (`src/core/template.ts`), rule dispatcher + 3 MVP rule kinds — regex / author / ruleSet (`src/core/runRule.ts`, `src/rules/*`), check evaluation w/ short-circuit (`src/core/runCheck.ts`), run state machine w/ postBehavior + 100-iter safety (`src/core/runRun.ts`).
- **Phase 2 — Actions + handleActivity** (Vinh, commit 9532cf4, 137 tests total). Action dispatcher w/ per-action idempotency wrap (`src/core/runAction.ts`), 7 MVP actions — remove / approve / lock / comment / report / ban / userFlair (`src/actions/*.ts`), handleActivity orchestrator (`src/core/handleActivity.ts`), onPostSubmit + onCommentSubmit trigger wire-up (`src/routes/triggers.ts`), URL-dedupe Repost rule promoted from Phase 4 to Phase 2.5.1 (`src/rules/repost.ts`), dry-run config flag (Phase 2.5.2), Mustache markdown-injection sanitizer (Phase 2.5.3).
- **Phase 3 — Config UX + live dashboard data** (Vinh, commit 983c949, 147 tests). onAppInstall default-config seed (`src/routes/triggers.ts`, `src/config/default-config.ts`), wiki config loader + refresh-config cron (`src/core/configSource.ts`, `src/routes/scheduler.ts`), reload-config mod menu action, recent events ZSET + `/api/recent` read path w/ migrate() forward-compat shape (`src/state/recentEvents.ts`, `src/routes/api.ts`), onAppUpgrade migrations (`src/state/migrations.ts`).
- **Step 3.6 — Dry-run rule tester** (Stephen). Non-contract sibling `src/core/dryRunActivity.ts` that mirrors handleActivity's eval pipeline but forces dryRun on every action + returns structured `DryRunResult` instead of writing to ZSET. Wired through `src/routes/menu.ts` `/test-rules` (showForm) + `src/routes/forms.ts` `/test-rules-submit` (toast bullets). 8 new tests across dryRunActivity + menu + form routes.
- **Live e2e scenario captures** (`docs/screenshots/scenario-{g-reload-toast,f-dryrun-form,f-dryrun-toast,h-dashboard-empty}.png`) — Scenarios G + F + H captured against playtest v0.2.0.8 running on `r/cm_devvit_test`. Stephen used Cmd-Shift-4 during the live trigger sequence; live captures preferred over banana mockups for image gallery.
- **`docs/screenshots/CAPTURE-CHECKLIST.md`** — 8 scenario-by-scenario OBS + Cmd-Shift-4 capture plan tied to e2e-scenarios.md, with the "Playwright MCP can't reach mod-auth views" honest caveat.
- **Devpost submission cheat sheet** (`docs/submission/devpost-form-cheat-sheet.md`) refreshed for v0.2.0 reality. Paste-ready Project name + Elevator pitch + About-the-project Markdown + Tool overview + Project Impact + Port Completion + Helper nomination drafts + 5 image gallery captions + "Try locally in 3 commands" judge-friction block.
- **Vinh external identifiers memory** — GitHub `vinhbin`, Reddit `u/Outside-Research-772` (confirmed 2026-05-17).
- **Status-aware ActionResult propagation** — `RecentEvent.actions[]` carries `status: 'ok' | 'dry-run' | 'error' | 'skipped-locked'` + optional `wouldHaveCalled`. Dashboard renders status-aware chip variants (green/blue/red/gray).
- **`docs/superpowers/codex-reviews/`** audit-trail directory — Vinh Phase 1+2 review, full-session retrospective, 2026-05-17 enhancement audit. Stored for post-hackathon reference.

### Changed

- **Mustache.escape now defaults to escapeMarkdown** (`src/core/template.ts`, Codex H4 hardening). Raw `{{item.title}}` no longer re-enables u/-ping or `[click](evil)` injection. Triple-stash `{{{...}}}` bypass for explicitly-raw moderator-authored fields. Action templates updated to treat Safe field aliases as identical to raw.
- **Global config.dryRun is authoritative** (`src/core/runAction.ts`, Codex H1 hardening). Per-action `dryRun: false` can no longer demote a globally-safe config to live; only ELEVATE to dry-run.
- **configStore.publish allocates rev via atomic INCR** (`src/state/configStore.ts` + new `src/state/keys.ts:cfgRevCounter`, Codex H2 hardening). Closes the read-modify-write race that let concurrent publishers silently overwrite each other's rev.
- **handleActivity accepts optional `ConfigSnapshot` param** (`src/core/handleActivity.ts`, Codex H3 hardening). Triggers pass the pre-read snapshot through so a publish between trigger normalization and rule execution cannot split a single event across revs.
- **forms `/test-rules-submit` routes via normalizePost/normalizeComment** (`src/routes/forms.ts`, Codex session HIGH-1). Was hand-building Author with all defaults, which silently disagreed with live moderation for author-aware rules.
- **RecentEvent.actions carries full ActionResult shape** (`src/state/recentEvents.ts` + `src/core/handleActivity.ts` + `src/client/lib/types.ts`, Codex session HIGH-2). `status` + optional `wouldHaveCalled` propagate; `ok: boolean` retained for back-compat.
- **filter regex try/catch** (`src/core/filters.ts`, Codex H5 partial). Bad pattern → false instead of throw (mirrors rule regex behavior). Parse-time catastrophic-backtracking validator deferred post-hackathon.
- **parseConfig wraps expandNamedRules** (`src/core/config.ts`, Codex H6). ParseResult invariant holds even when a named-rule ref is unresolved — returns `{ok:false, errors}` not 500.
- **repost rule uses atomic SET NX** (`src/rules/repost.ts`, Codex H7). Race-eliminated concurrent same-URL dedupe; fail-OPEN on Redis outage preserved.
- **App slug renamed back to `cm-devvit`** for public Devpost submission (Vinh's dev sub keeps `contextmod_vinh_dev` unchanged).
- **Devpost cheat sheet refreshed** for Phase 1+2+3 shipped + Codex-hardened + v0.2.0 review reality (commit 3aec7ab + 1df1d3b).
- **`package.json` version `0.0.2` → `0.2.0`** — synced with Devvit-published version.
- **PLAN.md 3.5 + 3.6 flipped ✅** with Wave A–F + dryRunActivity citations.
- **README Status table refreshed** to 13 Production rows (was 6) — Phase 1+2+3 + Codex hotfixes baked in.
- **README stale "Phase N pending" prose** purged across 11 references (commit a40dbe0).

### Fixed

- **commitAction retries done-write 3× w/ backoff + refuses to release pending on failure** (`src/lib/idem.ts`, Codex CRITICAL #1). Prevents double-action when Redis hiccups: if the side-effect succeeds but the done-marker write fails, the pending lease is NOT released (would re-open the gate). 5-min TTL on pending caps the worst-case wait.
- **Pending lease carries owner token** (`src/lib/idem.ts`, Codex CRITICAL #2). Compare-and-delete so a slow worker can't accidentally delete a successor's valid lease (third-execution race on slow-worker timeout).
- **Devvit form submit envelope is FLAT** (`src/routes/forms.ts`, live-playtest catch 2026-05-16). Was assuming `{values: {thingId}}` nested shape per doc convention; actual envelope is `{thingId}` flat. Defensive multi-shape parse now covers both.
- **`disabled: true` on form thingId field dropped from submission** (`src/routes/menu.ts`, live-playtest catch). Disabled fields don't submit per Devvit/HTML spec.
- **examples/ schema drift** — wiki path (`wiki/contextmod` → `wiki/botconfig/contextmod`), schema path (`src/server/schema/...` → `src/schema/...`), field names (`condition`→`combinator`, `criteria`→`filter`, `testOn`→`target`, `patterns`→`pattern`, `named_rules`→`namedRules`, `body`→`template`, `spam`→`isSpam`), `postBehavior` valid values, `{kind:'named'}` ref shape, `schema_version` removal (not a valid AJV key). All 3 example configs now AJV-validate cleanly (Codex enhancement-audit 2026-05-17 catch, commit 9fabd46).

### Shipped to Reddit App Directory

- **v0.2.0 submitted for review** 2026-05-16. Track at https://developers.reddit.com/apps/cm-devvit/app-versions. Review SLA 1–7 days; email-on-approval. Codex CRITICAL+HIGH hotfixes baked in before submission.

### Tests

- **173 passing** (up from 9 pre-Phase-1, 162 pre-Codex-H2-status-field). 22 test files. `tsc --build` clean. Vitest config isolated from `@devvit/start` plugin via `vitest.config.ts`.

### Repo activity

- **45 atomic commits in df05b37..v0.2.0** range, 17,210 line additions.
- Vinh: 6 commits (Phase 1 + 2 + 3 + plan flips + chore-rename).
- Stephen: 39 commits (Codex hotfixes, Step 3.6, schema drift fix, docs/submission, cheat sheet refresh, status-aware chips, version sync, screenshot captures, plan files).

### Notes

- Codex adversarial review ran THREE times this session: once on Vinh's Phase 1+2 ship (`docs/superpowers/codex-reviews/2026-05-16-vinh-phase-1-2.md`), once on the full-session retrospective (`docs/superpowers/codex-reviews/2026-05-16-session-full-review.md`), once as a 2026-05-17 enhancement audit (`docs/superpowers/codex-reviews/2026-05-17-enhancement-audit.md`). All CRITICAL + HIGH closed within the session.
- "Best Ported App $10K" Devpost target. Form filled out as of 2026-05-17.
- SampleOfNone Helper-nomination Discord ping scheduled 5/19 (T-8). FoxxMD fallback documented if she declines.

## [0.1.5] — 2026-05-13 (pre-Phase-1 public-repo polish, ~89 commits)

Day-3-evening dev polish work prior to Vinh's Phase 1 backend ship. Repo went public-flip-ready: docs + design tokens + governance files + Devpost gallery + Codex audit cycles + memory protocols locked. Phase 1+2+3 backend work landed afterwards as [0.2.0].

### Added
- `DESIGN.md` — brand + visual source-of-truth (Stitch open-source DESIGN.md spec format).
- `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1 + CC BY 4.0 attribution) + `SECURITY.md` (GitHub PVR + 90-day disclosure).
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml` + `.github/PULL_REQUEST_TEMPLATE.md` with Phase 1-6 scope checklist.
- `src/client/lib/design-tokens.ts` — shared `SIGNAL` palette imported by both `tailwind.config.ts` + `EventRow.tsx` (single source of truth).
- 5 Devpost gallery mockups (`assets/gallery-{dashboard,modmenu,wiki,install,trigger}.png`, 1200×800 3:2 Banana-generated). Superseded by live captures in [0.2.0].
- `docs/superpowers/2026-05-13-research-deltas.md` — last-30-days Devvit + OSS-polish + Devpost-galleries intel capture from 3 parallel research agents.
- `docs/superpowers/phase-3-ui-polish.md` — deferred frontend-design audit findings.
- `docs/superpowers/foxxmd-kanban-seed.md` — 42-card seed plan for FoxxMD's Projects v2 board (added via GraphQL bulk).
- `docs/submission/submission-day-runbook.md` — May 20 target / May 27 hard sequence Stephen executes top-to-bottom.
- Synthetic-data demo recording plan added to `docs/submission/demo-video-runbook.md` (full beat-by-beat fallback if Phase 1 slips).

### Changed
- Devvit dependency versions pinned exact (`@devvit/start`, `@devvit/web`, `devvit` all at `0.12.23`; no caret).
- `tailwind.config.ts` `signal` palette now imports from `src/client/lib/design-tokens.ts`.
- `StatsRow.tsx`: hardcoded hex `accent` prop refactored to typed `AccentToken` mapped to Tailwind utility classes; "Active rules" card wired to `pulse-dot` keyframe.
- `EventRow.tsx`: `KIND_COLOR` map now references `SIGNAL` constants instead of inline hex.
- README architecture redo: ASCII → Mermaid (`flowchart TB` + `sequenceDiagram` with `accTitle` + `accDescr` + 4-color WCAG-AA classDef palette).
- README v1.1: Phase-scope FAQ + Install troubleshooting section.
- Writeup-draft "What mods actually want" paragraph added — anti-AI-spam framing per r/modnews top-upvoted thread (94 upvotes u/Aeroncastle + 3 reinforcing voices total +70 upvotes).

### Fixed
- 6 Codex audit cycles caught + fixed: AI-tone scanner silent false-negative (`<<<"$out"` here-string in restricted-/tmp envs), README phase-framing contradictions, DESIGN.md 3 factual errors vs code (Lucide 1.5→1.6, Sparkline 1.5px→1.25px, EventRow row-height confusion), CHANGELOG hard date dropped for TBD, README `app.schema.json` path clarified as Phase-1 deliverable, CONTRIBUTING Redis primitives broadened (transactions + bitfield exist), PR template Phase-5+ split into P5 + P6, CODE_OF_CONDUCT CC BY 4.0 license reference explicit, bug_report dropdown `default: 0` for required-submission unblock.
- Devpost elevator pitch trimmed 205 → 198 chars (200 cap).
- WAU threshold disambiguated (Migration Bounty 1K vs hackathon 500 — separate programs).
- Outreach drafts: `gh auth refresh -s` (adds scopes) corrected to `--remove-scopes` (removes scopes).
- 4 absolute local paths in plan docs sanitized to `<upstream CM repo>` placeholders before public flip.

### Security
- `.gitignore` excludes `docs/submission/_video-source/` (raw demo recordings).
- Pre-flip secret audit: zero `.env`, API keys, GitHub PATs, AWS keys, or Devvit auth tokens in 100+-commit history.
- `gh` CLI scope downgrade documented: `gh auth refresh --remove-scopes project` after kanban-board seeding stabilizes.

### Docs
- 6 Codex audit cycles + 3 parallel research-agent dispatches + Firecrawl-verified Reddit citations + Playwright-verified rendered surfaces.
- Memory protocols locked: tool-inventory-audit-per-task + playwright-verification-protocol + commits-atomic-for-activity.

## [0.1.0] — 2026-05-13 (initial Devvit Web port, scaffold)

Initial Devvit Web port of FoxxMD's PRAW-era ContextMod moderation bot, submitted to the Reddit Mod Tools and Migrated Apps Hackathon. Port permission granted via [FoxxMD/context-mod#152](https://github.com/FoxxMD/context-mod/issues/152).

### Added

**Rule engine + concept model**
- Run / Check / Rule / Action concept model ported faithfully from upstream.
- `postBehavior` flow control: `next` / `nextRun` / `stop` / `goto:<run>.<check>`.
- 3 MVP rule kinds: `regex` (multi-field `testOn` + threshold), `author` (age / karma / flair / isMod / isContributor / verified / shadowBanned), `ruleSet` (AND/OR composition).
- 7 MVP actions with Mustache templating over `{{item, author, manager, rules, actions}}` context.
- Filter system: `authorIs` / `itemIs` with the canonical criteria set (name, age, karma, flair, isMod, isContributor, verified, shadowBanned, removed, approved, locked, score, age, title, isSelf, over18, depth, op).
- Named-rule composition by string reference.

**Storage primitives** (Devvit Redis, strings + hashes + sorted sets only)
- `cm:proc:{thingId}` 24h NX SETNX trigger-level idempotency (handles at-least-once + the May 12 trigger-duplicate regression).
- `cm:action:pending:{hash}` 5m NX + `cm:action:done:{hash}` 7d per-action idempotency (no double-applies on retry).
- `cm:lock:{task}` 60s NX with ownership token for cron single-flight (`acquireLock` in `src/lib/idem.ts`).
- `cfg:rev:{n}` immutable JSON snapshots + `cfg:current_rev` pointer for atomic config publish. `handleActivity` reads the pointer once at event start so the whole pipeline runs against a consistent config snapshot — no mid-event tear under concurrent reload.
- `events:recent` ZSET (50-deep ring buffer, score=ts member=event-json) for the Observatory dashboard.

**Hash function**
- FNV-1a 64-bit via BigInt for action-hash dedup. Canonical test vectors (`''`, `'a'`, `'foobar'`) verified.

**Observatory dashboard** (`src/client/`)
- React + Vite + Tailwind custom-post webview. Geist + Geist Mono + Instrument Serif italic typography.
- Stat cards: Actions today / Mod time saved / Active rules (with `pulse-dot` live indicator) / Top rule.
- 24h hourly sparkline rendered via SVG, `signal.ok` line at 1.25px stroke.
- Event stream: last 50 mod actions with color-coded chips per action kind (`signal.err` remove/ban, `signal.ok` approve, `signal.warn` lock/report, `signal.info` comment, `signal.author` userFlair).
- `?demo=1` synthetic-data mode for screenshots / demo recording.
- `ApiResult<T>` discriminated union — error UX preserves last-good state on backend hiccups.
- `ErrorBanner` component for API-outage surfacing.

**Mod menu items**
- "ContextMod: Reload config from wiki" — manual config refresh.
- "ContextMod: View recent actions" — submits Observatory custom post.
- "ContextMod: Test rules on this item" — dry-run rule tester on any post/comment.

**Wiki-based config**
- JSON5 stored at `r/<sub>/wiki/contextmod`.
- AJV schema validation with strict-subset adherence to upstream CM schema.
- 5-min auto-refresh cron + manual reload mod-menu action.

**Submission documentation**
- Devpost cheat sheet (`docs/submission/devpost-form-cheat-sheet.md`) with paste-ready copy for all 5 form steps.
- Sookra Pillar 5 numbers dossier (`docs/submission/pillar-5-numbers.md`) — 14 sections, every claim citation-traceable. Pillar 4 + 5 deepened with verbatim Reddit-source quotes + computed TAM math + realistic 12-month cash envelope.
- 60-second demo video script (`docs/submission/demo-video-script.md`) + OBS+Audacity+ffmpeg production runbook (`docs/submission/demo-video-runbook.md`).
- Devvit Developer Portal field cheat sheet (`docs/submission/devvit-app-settings.md`) — rewritten against `reddit/devvit-docs:launch-guide.md` after the initial draft fabricated 8 of 13 fields.
- HTTP fetch domain approval runbook (`docs/submission/domain-approval-runbook.md`) with MHS rejection decision tree.
- Outreach drafts (`docs/submission/outreach-drafts.md`) for FoxxMD + SampleOfNone + r/Devvit progress check + submission-day announcement.

**Visual assets**
- 256×256 app icon (`assets/icon.png`) — concentric rings + green telemetry dot.
- 1280×640 social preview (`assets/social-preview.png`) — GitHub OG card.
- 1200×800 Devpost thumbnail + 5 image-gallery mockups (dashboard / modmenu / wiki / install / trigger) at 3:2 ratio.
- All generated via Gemini 3.1 Flash Image (Nano Banana 2), re-encoded via PIL to true PNG.

**CI + tooling**
- GitHub Actions CI workflow: type-check + lint + test + build on push/PR.
- `scripts/check-ai-tone.sh` — bash blocklist scanner with `AITONE_IGNORE` HTML-comment escape, BSD/GNU word-boundary portability, `set -eo pipefail`, rc-branching against silent false-negatives.
- AI-tone scan wired into CI as a soft-check job.
- GitHub Pages workflow publishing `policies/privacy.md` + `policies/terms.md`.

**Repo metadata**
- GitHub Topics: `devvit`, `reddit-bot`, `reddit-moderation`, `moderation-tools`, `mod-tools-hackathon-2026`, `rule-engine`, `praw-port`, `typescript`, `hono`, `vite`.
- About description + homepage URL pointing at `developers.reddit.com/apps/cm-devvit`.
- 42 Phase-1-through-6 cards seeded on FoxxMD's GitHub Projects v2 board via GraphQL bulk-add.

**Public-repo polish**
- `DESIGN.md` — brand + visual source-of-truth, format inspired by Stitch's open-source DESIGN.md spec.
- `NOTICES.md` — third-party attribution for Reddit BSD-3 template + FoxxMD MIT (verbatim upstream text) + Reddit trademark nominative-use statement.
- Privacy Policy + Terms of Service at `stephensook.github.io/context-mod-devvit/{privacy,terms}/`.

### Changed

- Devvit dependency versions pinned exact (no carets) for CI/judging reproducibility: `@devvit/start`, `@devvit/web`, `devvit` all at `0.12.23`.
- `submitCustomPost` migrated from deprecated `splash` parameter to `entry` + `textFallback` per Devvit 0.12.23.
- README architecture section rewritten from ASCII to Mermaid `flowchart TB` + `sequenceDiagram` with accessibility `accTitle` + `accDescr`, semantic shape conventions, 4-color WCAG-AA classDef palette.
- README "What's ported" reframed with explicit ✅ / Phase-N annotations to match the actual ship state (types + scaffolds ship, live wiring lands Phase 1-3).
- `tailwind.config.ts`: promoted `#A78BFA` userFlair color to `signal.author` token.
- `StatsRow.tsx`: hardcoded hex `accent` prop refactored to typed `AccentToken` mapped to Tailwind utility classes; "Active rules" card wired to the `pulse-dot` keyframe.

### Fixed

- FNV-1a was initially 32-bit and failed canonical test vectors. Rewritten with BigInt for 64-bit precision. (Codex Day 1)
- `submitCustomPost` deprecated `splash` parameter — migrated to `entry` + `textFallback`.
- `Math.max(...data)` in Sparkline overflowed call-stack on large arrays. Replaced with `reduce()`.
- Framer Motion ripped because of CSP runtime-code-string-evaluation block. Replaced with hand-rolled CSS keyframes (`cmFadeUp`, `cmFadeLeft`, `cmFadeIn`, `cmDrawLine`).
- `firstSeen` initially threw on Redis error, defeating the idempotency guarantee. Made fail-closed (return false on Redis err).
- Devvit `0.12.23` schema changes: app name max 16 chars, `permissions.redis` is boolean.
- Vite base `'./'` required for Devvit webview iframe relative asset paths.
- App icon was JPEG bytes inside a `.png` filename (Devvit upload validation fails on magic-byte check). Re-encoded via PIL with LANCZOS resample. (Codex Day 2)
- Developer Portal cheat sheet first draft fabricated 8 of 13 form fields. Rewritten against `reddit/devvit-docs:launch-guide.md` + `faq.mdx` + `http-fetch-policy.md`.
- `check-ai-tone.sh` silent false-negative in sandboxed environments (here-string needed writable `/tmp`). Replaced with process substitution. (Codex Day 3+)
- Multiple Codex review cycles caught: phase-framing contradictions, 12-month cash-envelope misleading framing, 60×-threshold ambiguity, WAU 1K-vs-500 conflation, demo-script "real-time" overclaim, NOTICES.md MIT copyright year (was 2019, upstream is 2021), `gh auth refresh -s` vs `--remove-scopes` flag confusion.

### Security

- Pre-public-flip secret audit: zero `.env`, API keys, GitHub PATs, AWS keys, or Devvit auth tokens in git history.
- 3 absolute local paths in plan docs sanitized to `<upstream CM repo>` placeholders.
- `docs/submission/_video-source/` added to `.gitignore` — raw demo recordings won't accidentally commit.
- `gh` CLI scope downgrade documented in outreach drafts (`gh auth refresh --remove-scopes project` after kanban-board seeding stabilizes).

### Docs

- README polished across 8 atomic commits: hero with badges, Quick Start mod walkthrough, Architecture (Mermaid), Config schema, Fetch Domains table, Migration guide, FAQ, Changelog.
- Day-by-day implementation plans in `docs/superpowers/plans/` with tool-inventory audit tables.
- Phase-3 UI polish list capturing deferred frontend-design audit findings.
- Research-deltas doc (`docs/superpowers/2026-05-13-research-deltas.md`) capturing last-30-days Devvit policy/release updates + strategic adjustments.

## Notes on Phase scope

The submission ships with the rule engine + scaffolding + Observatory dashboard + all idempotency primitives in place. Live trigger wiring (Phase 1+2) is Vinh's responsibility, finishing through Day 5-8. Dashboard wires to real `events:recent` data in Phase 3. Phase 4 image-hash repost + history/attribution/recentActivity rules are stretch work; `mhs` rule is cut due to Reddit's PR #96 (2026-05-08) AI-providers fetch policy locking allowed AI domains to OpenAI + Gemini only.

[Unreleased]: https://github.com/StephenSook/context-mod-devvit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/StephenSook/context-mod-devvit/releases/tag/v0.1.0
