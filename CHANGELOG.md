# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

(Items here have not yet shipped to Reddit App Directory. Promote to a versioned section on publish.)

Forward-looking (post-v0.2.0, Phase 4+):
- Phase 4 stretch rules: `history`, `attribution`, `recentActivity` (cache-backed; Vinh queue, capacity-permitting pre-deadline)
- Phase 4.7 image-mode `repost` (gated on Day-0 perceptual-hash spike re-run; deferred from hackathon)
- Tier 2/3 backlog (in-flight 2026-05-17): client API regression tests, CSV export pure-helper, README status-at-a-glance table, Mermaid refresh, examples expansion, Lighthouse audit
- Operator outreach: r/Devvit progress post, 15+ third-party CM operator notifications post-App-Directory-approval

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
