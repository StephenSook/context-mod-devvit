# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Day 3 evening (post-0.1.0 polish, ~89 commits)
- `DESIGN.md` — brand + visual source-of-truth (Stitch open-source DESIGN.md spec format).
- `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1 + CC BY 4.0 attribution) + `SECURITY.md` (GitHub PVR + 90-day disclosure).
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml` + `.github/PULL_REQUEST_TEMPLATE.md` with Phase 1-6 scope checklist.
- `src/client/lib/design-tokens.ts` — shared `SIGNAL` palette imported by both `tailwind.config.ts` + `EventRow.tsx` (single source of truth).
- 3 Devpost gallery candidates (`assets/gallery-{dashboard,modmenu,wiki}.png`, 1200×800 3:2 Banana-generated mockups).
- `docs/superpowers/2026-05-13-research-deltas.md` — last-30-days Devvit + OSS-polish + Devpost-galleries intel capture from 3 parallel research agents.
- `docs/superpowers/phase-3-ui-polish.md` — deferred frontend-design audit findings.
- `docs/superpowers/foxxmd-kanban-seed.md` — 42-card seed plan for FoxxMD's Projects v2 board (added via GraphQL bulk).
- `docs/submission/submission-day-runbook.md` — May 20 target / May 27 hard sequence Stephen executes top-to-bottom.
- Synthetic-data demo recording plan added to `docs/submission/demo-video-runbook.md` (full beat-by-beat fallback if Phase 1 slips).

### Phase scope (in flight)
- **Phase 1** backend (Vinh's lane, finishing Day 5-8): `handleActivity` entry, `runRun` flow control, `runCheck` AND/OR composition, `runRule` dispatcher, filter system, named-rule resolver, Mustache action templating, atomic config-store revision pointer.
- **Phase 2** (Day 5-8): 7 action handlers + 4 trigger routes.
- **Phase 3** (Day 9-11): wire `/api/recent` + `/api/stats` to real `events:recent` ZSET, dashboard live data, mod-menu dry-run.
- **Phase 4 stretch** (gated): `history` / `attribution` / `recentActivity` / `repost` rules + image-hash repost detection.
- **Phase 5** (May 17-22): demo recording + Devpost form fill.
- **Phase 6** (post-May 27): ship + open to FoxxMD's 15+ ContextMod operators.

### Changed — Day 3 evening
- Devvit dependency versions pinned exact (`@devvit/start`, `@devvit/web`, `devvit` all at `0.12.23`; no caret).
- `tailwind.config.ts` `signal` palette now imports from `src/client/lib/design-tokens.ts`.
- `StatsRow.tsx`: hardcoded hex `accent` prop refactored to typed `AccentToken` mapped to Tailwind utility classes; "Active rules" card wired to `pulse-dot` keyframe.
- `EventRow.tsx`: `KIND_COLOR` map now references `SIGNAL` constants instead of inline hex.
- README architecture redo: ASCII → Mermaid (`flowchart TB` + `sequenceDiagram` with `accTitle` + `accDescr` + 4-color WCAG-AA classDef palette).
- README v1.1: Phase-scope FAQ + Install troubleshooting section.
- Writeup-draft "What mods actually want" paragraph added — anti-AI-spam framing per r/modnews top-upvoted thread (94 upvotes u/Aeroncastle + 3 reinforcing voices total +70 upvotes).

### Fixed — Day 3 evening
- 6 Codex audit cycles caught + fixed: AI-tone scanner silent false-negative (`<<<"$out"` here-string in restricted-/tmp envs), README phase-framing contradictions, DESIGN.md 3 factual errors vs code (Lucide 1.5→1.6, Sparkline 1.5px→1.25px, EventRow row-height confusion), CHANGELOG hard date dropped for TBD, README `app.schema.json` path clarified as Phase-1 deliverable, CONTRIBUTING Redis primitives broadened (transactions + bitfield exist), PR template Phase-5+ split into P5 + P6, CODE_OF_CONDUCT CC BY 4.0 license reference explicit, bug_report dropdown `default: 0` for required-submission unblock.
- Devpost elevator pitch trimmed 205 → 198 chars (200 cap).
- WAU threshold disambiguated (Migration Bounty 1K vs hackathon 500 — separate programs).
- Outreach drafts: `gh auth refresh -s` (adds scopes) corrected to `--remove-scopes` (removes scopes).
- 4 absolute local paths in plan docs sanitized to `<upstream CM repo>` placeholders before public flip.

### Security — Day 3 evening
- `.gitignore` excludes `docs/submission/_video-source/` (raw demo recordings).
- Pre-flip secret audit: zero `.env`, API keys, GitHub PATs, AWS keys, or Devvit auth tokens in 100+-commit history.
- `gh` CLI scope downgrade documented: `gh auth refresh --remove-scopes project` after kanban-board seeding stabilizes.

### Docs — Day 3 evening
- 6 Codex audit cycles + 3 parallel research-agent dispatches + Firecrawl-verified Reddit citations + Playwright-verified rendered surfaces.
- Memory protocols locked: tool-inventory-audit-per-task + playwright-verification-protocol + commits-atomic-for-activity.

## [0.1.0] - TBD (target: May 20, 2026 / hard deadline: May 27, 2026)

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
- 1200×800 Devpost thumbnail + 3 image-gallery mockups (dashboard hero + mod menu + wiki config) at 3:2 ratio.
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
- Research-deltas doc (`docs/superpowers/2026-05-13-research-deltas.md`) capturing last-30-days Devvit ecosystem updates + strategic adjustments.

## Notes on Phase scope

The submission ships with the rule engine + scaffolding + Observatory dashboard + all idempotency primitives in place. Live trigger wiring (Phase 1+2) is Vinh's responsibility, finishing through Day 5-8. Dashboard wires to real `events:recent` data in Phase 3. Phase 4 image-hash repost + history/attribution/recentActivity rules are stretch work; `mhs` rule is cut due to Reddit's PR #96 (2026-05-08) AI-providers fetch policy locking allowed AI domains to OpenAI + Gemini only.

[Unreleased]: https://github.com/StephenSook/context-mod-devvit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/StephenSook/context-mod-devvit/releases/tag/v0.1.0
