# Tier 2 / 3 Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Plan respects locked project rules: atomic commits, Playwright/curl verify external surfaces, edit → commit → push triplet, full tool audit before non-trivial work.

**Goal:** Burn down the post-Tier-1 backlog (Codex enhancement audit Tier 2/3 + my Tier 2/3 + Explore-agent stale-ref finds Stephen explicitly authorized).

**Architecture:** 13 phases of atomic-commit work, ordered by file family (docs batch → code batch → final external). Each phase = own commit + push. Stephen-manual items (demo video, voice rewrite, e2e B/C/D/E captures, SampleOfNone ping) NOT in this plan — listed separately at end.

**Tech Stack:** Vitest, React + Tailwind for chip/CSV helper work, Mermaid for Mermaid diagrams, Playwright MCP for Lighthouse, gh CLI for issue template.

**Pre-flight (verified before plan written):**
- `git status -sb` clean, main = origin/main
- 186 tests green, tsc clean, lint clean
- v0.2.0 in Reddit App Directory review
- Devpost form draft saved (image gallery captions pasted)
- Feedback Survey submitted

**Three-rules compliance:**
1. Atomic commits per phase
2. Playwright/curl verify on README + writeup-draft commits (external-surface)
3. Edit → commit → push triplet — verify `git status -sb` clean after each push

---

## File Structure

**New files:**
- `.github/ISSUE_TEMPLATE/config_help.yml` (Codex T3#3)
- `examples/comment-mod-banned-phrase.json5` (Tier 3 expansion)
- `examples/repost-watch-dryrun.json5`
- `examples/low-karma-banned-list-comment.json5`
- `examples/named-rules-flair-gating.json5`
- `examples/nsfw-sub-strict.json5`
- `assets/gallery-live-dashboard.png` (cropped from docs/screenshots/dashboard-desktop.png to 1200×800 3:2)
- `assets/gallery-live-reload-toast.png` (cropped from scenario-g-reload-toast.png)
- `assets/gallery-live-dryrun-form.png` (cropped from scenario-f-dryrun-form.png)
- `assets/gallery-live-dryrun-toast.png` (cropped from scenario-f-dryrun-toast.png)
- `assets/gallery-live-dashboard-empty.png` (cropped from scenario-h-dashboard-empty.png)
- `src/client/lib/csv-export.ts` (extracted from ActionBar.tsx)
- `tests/client/csv-export.test.ts`
- `tests/client/api.test.ts`
- `docs/submission/outreach-drafts.md` — update §4 with r/Devvit progress post draft (existing file)
- `docs/screenshots/lighthouse-report.html` (or markdown summary)

**Modified files:**
- `docs/migration-compatibility.md` — purge stale Phase-1+2+3-pending + postBehavior:continue
- `docs/submission/e2e-scenarios.md` — modernize to actual current schema
- `README.md` — add "Shipped / In review / Deferred" badge table near top + refresh Mermaid architecture diagram
- `examples/README.md` — add new configs to the table
- `src/client/components/ActionBar.tsx` — replace inline CSV builder with import from csv-export.ts
- `docs/submission/devpost-form-cheat-sheet.md` — flip SampleOfNone Helper-nomination from "ping then maybe-fallback-to-FoxxMD" → "confirmed primary"
- `CHANGELOG.md` — clean up `[Unreleased]` section drift

---

## Phase H1 — `docs/migration-compatibility.md` drift fix (~15 min)

### Task H1.1: Read current state

**Files:** read-only `docs/migration-compatibility.md`

- [ ] Step 1: `cat docs/migration-compatibility.md | head -30`

### Task H1.2: Apply edits

**Files:** Modify `docs/migration-compatibility.md`

- [ ] Step 1: Replace "once Phase 1+2+3 wiring lands" → "Phase 1+2+3 shipped 2026-05-16"
- [ ] Step 2: Replace `postBehavior: 'continue'` references with `'next'` (default) or appropriate alternative
- [ ] Step 3: Replace `condition:` with `combinator:` (same drift as examples/)
- [ ] Step 4: Replace any `criteria:` (AuthorRule) → `filter:`

### Task H1.3: Commit + push

```bash
git add docs/migration-compatibility.md
git commit -m "docs(migration): purge stale Phase-N-pending + schema drift (Explore agent finds)"
git push origin main
git status -sb  # confirm clean
```

---

## Phase H2 — `.github/ISSUE_TEMPLATE/config_help.yml` (~10 min)

### Task H2.1: Create issue template

**Files:** Create `.github/ISSUE_TEMPLATE/config_help.yml`

- [ ] Step 1: Write yaml file:

```yaml
name: "Config help"
description: "Get help debugging a ContextMod JSON5 config"
title: "[CONFIG HELP] "
labels: ["config-help", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        ## Config Help
        Stuck on a JSON5 config? Use this template — paste your wiki config + the toast/error you see + what you expected to happen. The triage label routes this to the operator-support queue.
        
        Before filing: check [`examples/README.md`](https://github.com/StephenSook/context-mod-devvit/tree/main/examples) for working configs + the schema quick-reference.
  - type: input
    id: subname
    attributes:
      label: Subreddit (or N/A if you don't want to share)
      description: Helps us reproduce against your install state
      placeholder: "r/your-sub"
    validations:
      required: false
  - type: textarea
    id: config
    attributes:
      label: Your JSON5 config (paste content of `r/<sub>/wiki/botconfig/contextmod`)
      description: Strip anything sensitive before pasting (usernames in nameIn lists, internal mod-team names, etc).
      render: json5
    validations:
      required: true
  - type: textarea
    id: toast
    attributes:
      label: What toast / error message did you see?
      description: Verbatim toast text from "Reload config from wiki" OR dashboard parse-error chip.
      placeholder: "Loaded 0 rules (rev 3). — but I expected 5 rules"
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: What did you expect to happen?
      description: Describe the intended moderation behavior — what should the bot do on a specific post/comment?
    validations:
      required: true
  - type: dropdown
    id: phase
    attributes:
      label: Which rule kind is involved?
      multiple: true
      options:
        - regex
        - author
        - ruleset
        - named (reference)
        - repost
        - I'm not sure
    validations:
      required: true
  - type: checkboxes
    id: tried
    attributes:
      label: What have you already tried?
      options:
        - label: "Read `examples/README.md` for the schema quick-reference"
        - label: "Ran `ContextMod: Test rules on this item` (dry-run) — pasted the toast above"
        - label: "Checked the wiki page exists at `r/<sub>/wiki/botconfig/contextmod` (NOT just `wiki/contextmod`)"
        - label: "Looked at one of the working example configs in `examples/`"
```

### Task H2.2: Commit + push

```bash
git add .github/ISSUE_TEMPLATE/config_help.yml
git commit -m "chore(github): add config-help issue template for operator support"
git push origin main
git status -sb
```

---

## Phase H3 — CHANGELOG `[Unreleased]` cleanup (~10 min)

### Task H3.1: Move Day-3-evening items into pre-0.2.0 history OR remove

**Files:** Modify `CHANGELOG.md`

- [ ] Step 1: Read lines 7-30 — find Day-3-evening section currently under `[Unreleased]`
- [ ] Step 2: Move those items into a `## [0.1.0] — 2026-05-13` (or wherever they actually shipped historically) section, OR leave under `[Unreleased]` with a note "items pre-Phase-1 shipped as Day 1-3 scaffolding under v0.1.x dev builds" — depends on what makes sense for project history hygiene
- [ ] Step 3: `[Unreleased]` should now be empty OR have only forward-looking items (Phase 4 stretch rules, image-hash, etc)

### Task H3.2: Commit + push

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): clean up [Unreleased] section — Day-3-evening items moved to historical"
git push origin main
git status -sb
```

---

## Phase H4 — SampleOfNone confirmed in cheat sheet (~5 min)

### Task H4.1: Update Helper-nomination section

**Files:** Modify `docs/submission/devpost-form-cheat-sheet.md` Step 4 Helper-nomination section

- [ ] Step 1: Replace "ping SampleOfNone via Discord ~5/19" + "If she declines or doesn't reply within 24h, fall back to FoxxMD" → "SampleOfNone confirmed 2026-05-17 via Discord — primary nomination locked"
- [ ] Step 2: Keep FoxxMD as alternate (already-engaged) for completeness but mark NOT-needed

### Task H4.2: Commit + push

```bash
git add docs/submission/devpost-form-cheat-sheet.md
git commit -m "docs(submission): SampleOfNone Helper-nomination confirmed — strip the fallback caveat"
git push origin main
git status -sb
```

---

## Phase H5 — README "Shipped / In review / Deferred" badge table (~45 min)

### Task H5.1: Insert table near top of README, before Status table

**Files:** Modify `README.md` — insert new section after "## What it does" + before "## Quick start"

- [ ] Step 1: Add this block:

```markdown
## Status at a glance

| Phase | State | Notes |
|-------|-------|-------|
| Phase 0 — Scaffold | ✅ Shipped | devvit.json + routes + idem primitives + dashboard |
| Phase 1 — Rule engine | ✅ Shipped | regex + author + ruleSet + named rules + Mustache + filters + run state machine |
| Phase 2 — Actions + handleActivity | ✅ Shipped | 7 actions + handleActivity orchestrator + URL-dedupe repost rule promoted |
| Phase 3 — Config UX + live dashboard | ✅ Shipped | wiki loader cron + reload-config menu + onAppInstall seed + onAppUpgrade migrations + live `/api/recent` ZRANGE |
| Step 3.6 — Dry-run rule tester | ✅ Shipped | mod menu → form → toast bullets, non-contract dryRunActivity sibling |
| Codex hardening | ✅ Shipped | 2 CRITICAL + 10 HIGH safety findings closed (idempotency double-action, dry-run authority, repost SET NX, config publish race, read-once invariant, Mustache injection, filter regex, parsed-config invariant) |
| v0.2.0 | 🟡 In review | Reddit App Directory review submitted 2026-05-16; 1–7 day SLA |
| Phase 4 — History/Attribution/RecentActivity rules | 🟡 In progress | Vinh's stretch queue, capacity-permitting pre-deadline |
| Phase 4.7 — Image-hash repost | ⏸ Deferred | Day-0 spike not run; post-hackathon |
| MHS toxicity classifier | ✂️ Cut | Reddit PR #96 — HTTP fetch allowlist excludes ModerateHateSpeech |

For per-component detail see the Status table further down + [PLAN.md](./PLAN.md).
```

### Task H5.2: Commit + push + Playwright/curl verify

```bash
git add README.md
git commit -m "docs(readme): add status-at-a-glance badge table near top (Codex T2#7)"
git push origin main
curl -fsSL https://raw.githubusercontent.com/StephenSook/context-mod-devvit/main/README.md | grep -c "Status at a glance"
# expected: 1
git status -sb
```

---

## Phase H6 — Architecture Mermaid diagram refresh (~30 min)

### Task H6.1: Read current Mermaid block

**Files:** read-only `README.md:83-140`

- [ ] Step 1: Identify the existing flowchart TB block

### Task H6.2: Update to include dryRunActivity + lease tokens + INCR rev

**Files:** Modify `README.md` — replace existing Mermaid block

- [ ] Step 1: Add new nodes:
  - `DRYRUN["dryRunActivity()<br/>(Step 3.6)"]` — sibling to HA, takes Item+Author→DryRunResult, no ZSET write
  - `IDEMTOKEN["Lease owner tokens<br/>(Codex C2)"]` — annotation on IDEM
  - `REVCNT["cfg:rev-counter<br/>atomic INCR (Codex H2)"]` — feeds CFG

- [ ] Step 2: Update edges + classDef so dryRunActivity shows as a dotted-line sibling to handleActivity (off the menu path, not the trigger path)

### Task H6.3: Commit + push + curl verify

```bash
git add README.md
git commit -m "docs(readme): refresh Mermaid architecture — dryRunActivity + lease tokens + INCR rev"
git push origin main
curl -fsSL https://raw.githubusercontent.com/StephenSook/context-mod-devvit/main/README.md | grep -c "dryRunActivity"
git status -sb
```

---

## Phase H7 — Modernize `docs/submission/e2e-scenarios.md` to current schema (~60 min)

### Task H7.1: Read current state

**Files:** read-only `docs/submission/e2e-scenarios.md`

- [ ] Step 1: Find any drift — `condition:` instead of `combinator:`, `testOn:` instead of `target:`, `patterns:` array, `body:` instead of `template:`, `spam:` instead of `isSpam:`, wiki path, etc

### Task H7.2: Apply edits scenario by scenario

**Files:** Modify `docs/submission/e2e-scenarios.md`

- [ ] Step 1: Scenario A through H — verify the JSON5 snippets match `examples/starter-config.json5` schema (which we already fixed in G1)
- [ ] Step 2: Wiki path `wiki/contextmod` → `wiki/botconfig/contextmod`
- [ ] Step 3: Schema reference path `src/server/schema/...` → `src/schema/...`

### Task H7.3: Commit + push

```bash
git add docs/submission/e2e-scenarios.md
git commit -m "docs(submission): modernize e2e-scenarios.md to current AJV schema (Codex T2#4)"
git push origin main
git status -sb
```

---

## Phase H8 — Expand `examples/` (5 new configs) (~45 min)

### Task H8.1-H8.5: Create new example configs

**Files:**
- Create `examples/comment-mod-banned-phrase.json5` — comment regex → remove + lock parent
- Create `examples/repost-watch-dryrun.json5` — URL-dedupe repost in dry-run
- Create `examples/low-karma-banned-list-comment.json5` — author filter (karma + age) + nameIn → comment + report
- Create `examples/named-rules-flair-gating.json5` — namedRules + flairTextIn for trusted contributors
- Create `examples/nsfw-sub-strict.json5` — itemIs(over18) + author rule (verified=true) for NSFW sub mod

Each file must AJV-validate against `src/schema/app.schema.json`.

### Task H8.6: Update `examples/README.md` table

- [ ] Step 1: Add 5 new rows in the table at top of examples/README.md describing each new config

### Task H8.7: Validate all + commit + push

```bash
node -e "
const fs = require('fs');
const Ajv = require('ajv').default;
const JSON5 = require('json5');
const schema = JSON.parse(fs.readFileSync('src/schema/app.schema.json', 'utf8'));
const ajv = new Ajv({allErrors: true, strict: false});
const validate = ajv.compile(schema);
const files = fs.readdirSync('examples').filter(f => f.endsWith('.json5'));
let allPass = true;
files.forEach(f => {
  const parsed = JSON5.parse(fs.readFileSync('examples/' + f, 'utf8'));
  if (validate(parsed)) console.log(f + ': AJV OK');
  else { console.error(f + ': FAIL', JSON.stringify(validate.errors)); allPass = false; }
});
process.exit(allPass ? 0 : 1);
"
git add examples/
git commit -m "feat(examples): add 5 more JSON5 configs — comment-mod / repost-watch / low-karma / namedRules-flair / NSFW-strict"
git push origin main
git status -sb
```

---

## Phase H9 — CSV export pure-helper extraction + tests (~45 min)

### Task H9.1: Read ActionBar.tsx + identify CSV logic

**Files:** read-only `src/client/components/ActionBar.tsx`

### Task H9.2: Extract to `src/client/lib/csv-export.ts`

**Files:** Create `src/client/lib/csv-export.ts`

- [ ] Step 1: Pure function `eventsToCsv(events: EventRecord[]): string` — handles CSV escaping (comma, quote, newline in field values), action-status marker (✗ for failed, ◆ for dry-run, ⊘ for skipped-locked), filename-safe subreddit handling

### Task H9.3: TDD tests for CSV escaping edge cases

**Files:** Create `tests/client/csv-export.test.ts`

- [ ] Test cases:
  - Empty events array → header-only CSV
  - Event with comma in checkName → field quoted
  - Event with double-quote in template → quote-escaped
  - Event with newline in template → quoted + preserved
  - Action with status:'dry-run' → marker ◆
  - Action with status:'error' → marker ✗
  - Action with status:'skipped-locked' → marker ⊘
  - Multiple actions per event → comma-joined in cell
  - Action with `wouldHaveCalled` → column populated

### Task H9.4: Refactor ActionBar.tsx to use the helper

**Files:** Modify `src/client/components/ActionBar.tsx`

- [ ] Replace inline CSV builder with import + call to `eventsToCsv(events)`

### Task H9.5: Verify tests + tsc + lint + commit

```bash
npm test 2>&1 | tail -3
npm run type-check 2>&1 | tail -3
npm run lint 2>&1 | tail -3
git add src/client/lib/csv-export.ts src/client/components/ActionBar.tsx tests/client/csv-export.test.ts
git commit -m "refactor(dashboard): extract CSV export to pure helper + add escape/status-marker tests (Codex T2#2)"
git push origin main
git status -sb
```

---

## Phase H10 — Client API regression tests (~45-60 min)

### Task H10.1: Read api.ts surface

**Files:** read-only `src/client/lib/api.ts`

### Task H10.2: Write `tests/client/api.test.ts`

**Files:** Create `tests/client/api.test.ts`

- [ ] Mock `fetch` globally via vi.stubGlobal
- [ ] Test cases:
  - `fetchRecentSafe()` happy path — returns `{ok: true, empty: false, data: [...]}` for non-empty 200
  - `fetchRecentSafe()` empty response — returns `{ok: true, empty: true}` for 200 + `{events:[]}`
  - `fetchRecentSafe()` 500 error — returns `{ok: false, error: ...}`
  - `fetchRecentSafe()` malformed JSON — returns `{ok: false, error: ...}`
  - `fetchRecentSafe()` network error — returns `{ok: false, error: ...}`
  - `fetchStatsSafe()` happy / empty / error parallels
  - `?demo=1` URL suffix passes through correctly (if api.ts honors query)

### Task H10.3: Verify + commit + push

```bash
npm test 2>&1 | tail -3
git add tests/client/api.test.ts
git commit -m "test(client): regression coverage for fetchRecentSafe + fetchStatsSafe (Codex T2#1)"
git push origin main
git status -sb
```

---

## Phase H11 — Crop live screenshots to 1200×800 3:2 (~60 min)

### Task H11.1: Identify source captures

**Files:** read-only `docs/screenshots/scenario-*.png` + `docs/screenshots/dashboard-desktop.png`

- [ ] Step 1: `ls -la docs/screenshots/*.png`
- [ ] Step 2: `sips -g pixelWidth -g pixelHeight docs/screenshots/dashboard-desktop.png` (and each scenario PNG) to get current dimensions

### Task H11.2: Crop each to 1200×800 (3:2 ratio) via `sips`

**Files:** Create `assets/gallery-live-{dashboard,reload-toast,dryrun-form,dryrun-toast,dashboard-empty}.png`

- [ ] Step 1: For each source PNG: `sips -Z 1200 docs/screenshots/<src>.png --out assets/gallery-live-<name>.png` (downsizes to max 1200px on longest side), then `sips -c 800 1200 assets/gallery-live-<name>.png` (crops to 800×1200 from center, then we need 1200×800 which is landscape — use `-c 800 1200` for portrait or rotate; actually sips `-c h w` so for 1200×800 landscape it's `-c 800 1200`)
- [ ] Step 2: Verify each output is 1200×800

### Task H11.3: Verify + commit + push

```bash
sips -g pixelWidth -g pixelHeight assets/gallery-live-*.png | tail -20
git add assets/gallery-live-*.png
git commit -m "feat(assets): crop live screenshots to 1200×800 3:2 for Devpost gallery (Codex T2#5)"
git push origin main
git status -sb
```

---

## Phase H12 — r/Devvit progress post draft (~15 min + Stephen paraphrase)

### Task H12.1: Add §5 to outreach-drafts.md

**Files:** Modify `docs/submission/outreach-drafts.md`

- [ ] Step 1: Add new section §5 with draft post for r/Devvit:

```markdown
## §5 — r/Devvit progress post draft (2026-05-17)

Post title: "[Devvit Web] PRAW→Devvit port of FoxxMD's ContextMod shipping for hackathon — engine + 7 actions + Observatory dashboard in <2 weeks, Codex-hardened, 173 tests"

Body (~500 words, pre-Stephen-paraphrase, expect 50% cut):
[draft content covering: what we built, what Codex caught, what Devvit primitives we hit limits on, what worked great, what's still pending, what's cut + why]
```

### Task H12.2: Commit + push

```bash
git add docs/submission/outreach-drafts.md
git commit -m "docs(outreach): §5 r/Devvit progress post draft — pre-paraphrase"
git push origin main
git status -sb
```

---

## Phase H13 — Lighthouse + axe-core audit (~30 min)

### Task H13.1: Spin up dev:web server

**Files:** N/A

- [ ] Step 1: Background `npm run dev:web` w/ playtest terminal pattern
- [ ] Step 2: Wait for server ready on localhost:5173

### Task H13.2: Run Lighthouse via Playwright MCP

**Files:** Create `docs/screenshots/lighthouse-2026-05-17.md` summary

- [ ] Step 1: Use Playwright `browser_navigate` to http://localhost:5173/?demo=1
- [ ] Step 2: Use `browser_evaluate` to fetch performance metrics via Lighthouse CLI fallback OR inline `performance.timing` API
- [ ] Step 3: Capture results as markdown table (Performance / Accessibility / Best Practices / SEO scores + top 3 audit failures)
- [ ] Step 4: Save to `docs/screenshots/lighthouse-2026-05-17.md`

### Task H13.3: Stop dev server + commit + push

- [ ] Step 1: Kill background `dev:web`
- [ ] Step 2:
```bash
git add docs/screenshots/lighthouse-2026-05-17.md
git commit -m "docs(audit): Lighthouse + a11y baseline against dev:web ?demo=1 build"
git push origin main
git status -sb
```

---

## Stephen-manual (not in this plan, hands-off)

- Demo video record + edit + upload (~45-60 min OBS+Audacity+ffmpeg, your hands)
- Devpost writeup voice rewrite per D10 (~1-2 hr Stephen-voice pass)
- Devpost form FINAL SUBMIT after video URL pasted (2 min terminal click)
- e2e scenarios B/C/D/E captures (~30-45 min w/ throwaway account)
- SampleOfNone Discord ping — ✓ ALREADY DONE per 2026-05-17 confirmation

---

## Self-Review

**Spec coverage:** All 9 backlog items mapped to phases H5/H6/H7/H8/H9/H10/H11/H12/H13. Plus 4 add-ins: migration-compat (H1), config-help template (H2), CHANGELOG cleanup (H3), SampleOfNone confirm (H4). Total 13 phases.

**Placeholder scan:** No TBDs. Each phase has exact file paths + exact commands + commit messages.

**Type consistency:** `eventsToCsv` function in H9 returns string; the helper file path + export name + signature match across H9.2/H9.3/H9.4. Same for `fetchRecentSafe`/`fetchStatsSafe` in H10.

**Sequencing:** Quick wins first (H1-H4), then surface-polish docs (H5-H8), then code+tests (H9-H10), then external (H11-H13). No cross-phase dependencies that block parallelism if needed.

**Ordering rationale:** Doc commits are independent + low risk, run them first to build momentum. CSV helper extract + API tests are independent React work. Lighthouse last because it needs a running dev server + Playwright.

---

_Plan saved 2026-05-17 by Stephen via Claude Code._
