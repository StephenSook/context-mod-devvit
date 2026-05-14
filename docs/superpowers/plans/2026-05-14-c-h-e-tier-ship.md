# C+H+E Tier Ship Plan — 2026-05-14

> **STATUS: COMPLETE** — all 23 commits executed 2026-05-14; post-ship audit-2 layered 11 fix-wave commits on top (see `2026-05-14-c-h-e-audit.md`). See `git log --oneline 080dbd7..HEAD` for the commit sequence.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship all 23 findings from the 4-agent audit (Codex adversarial + Gemini architecture + feature-dev:code-reviewer + Explore orphaned-files). Critical = submit-blockers, High = credibility polish, Enhancement = judge-impact upside.

**Architecture:** 23 atomic commits per green-dot policy. Sequence: small/safe first → large/complex → generative content last. Each commit passes strict AI-tone scan before push. Lane discipline: stay out of Vinh's `src/core/`, `src/rules/`, `src/server/schema/`, `src/actions/`, `src/state/`, `src/routes/triggers.ts`, `src/routes/scheduler.ts` empty stubs. The one Vinh-adjacent file we'll touch is `src/routes/api.ts` (currently stub, low conflict risk — Vinh integrates around our `?demo=1` branch when his ZSET writes land).

**Tech Stack:** React/TypeScript / Vite / Hono / Bash / SRT / Mermaid / Markdown / Playwright MCP / Banana skill / PIL.

---

## Tool inventory audit (per `memory/tool-inventory-audit-per-task.md`)

| Tool | Used? | Why |
|------|-------|-----|
| writing-plans skill | ✅ | This plan |
| green-dot atomic policy | ✅ | 23 commits, one per finding |
| check-ai-tone.sh --strict | ✅ | Gate per commit |
| Playwright MCP | ✅ | E3 dashboard screenshots @ 375px + 1280px |
| banana skill | ✅ | E7 install-flow composite + E8 dry-run mockup |
| feature-dev:code-reviewer | ⛔ | Already ran; findings being actioned now |
| codex:codex-rescue | ⛔ | Already ran; findings being actioned now |
| Explore | ⛔ | Already ran |
| three-brain (Codex re-review) | ⏸️ | Defer to end-of-batch verification pass |
| Firecrawl / context7 | ⛔ | No external research needed |
| last30days | ⛔ | Audit already used most recent intel |

---

## Phase A — CRITICAL (6 commits, ~85 min)

Order: smallest/safest → largest/complex. Builds momentum.

- [ ] **A.1 (C2 — 10 min):** Scrub MHS from `policies/privacy.md:46-49` to match the 2026-05-13 cut. Verify `README:198` "No PII transmitted" is now consistent. Single commit.

- [ ] **A.2 (C6 — 5 min):** Add $10K hackathon prize line in `pillar-5-numbers.md §12` envelope math + cross-check `demo-video-script.md:85` voice line matches.

- [ ] **A.3 (C5 — 5 min):** Fix `scripts/demo/captions-synthetic-fallback.srt:27-35` — make timestamps strictly ascending. Truth caption either (a) ends before caption 5 starts (impossible since both at 36s), or (b) becomes its own sequenced cue at 50s-58s wedge, or (c) move to ffmpeg drawtext overlay (script change). Pick (c) — drawtext lets truth caption co-render with VO captions without timestamp conflict.

- [ ] **A.4 (C4 — 5 min):** `Sparkline.tsx:10` add `if (data.length < 2) return <degenerate-or-empty>;` guard before step computation.

- [ ] **A.5 (C1 — 30 min):** Rewrite `README.md:74-88` architecture diagram + `:102` config-publish claim + `:219` "Reload works" claim. Reframe from "this works" to "scaffolded for Phase 1-3 — see Status table." Add explicit "production-ready vs scaffolded" status table.

- [ ] **A.6 (C3 — 30 min):** Refactor `src/lib/idem.ts:55-58` `reserveAction` to atomic single-key pattern. Option A: rely solely on `cm:action:done:{id}` 7d TTL as dedup gate + NX on `pending` for in-flight reservation; the done-key check inside same Redis pipeline. Option B: Lua script. Choose A (simpler; Devvit's Redis primitive set is limited). Update `tests/lib/idem.test.ts` to cover the race scenario.

---

## Phase B — HIGH (9 commits, ~50 min)

- [ ] **B.1 (H8 — 5 min):** Add `> **STATUS: COMPLETE** — executed YYYY-MM-DD, see git log` header to `docs/superpowers/plans/2026-05-12-day1-codex-review-fixes.md` + `2026-05-14-wave-f-closeout.md` + any other plan dated before today.

- [ ] **B.2 (H2 — 2 min):** `CHANGELOG.md:54` `## [0.1.0] - TBD` → `## [0.1.0] - 2026-05-20` (target submission date).

- [ ] **B.3 (H1 — 5 min):** Remove `delayed-eval` task from `devvit.json:52-54` + remove handler from `src/routes/scheduler.ts:64-70`. PLAN.md already marks ✂️ cut.

- [ ] **B.4 (H3 — 2 min):** `src/client/components/EventRow.tsx:62-74` change `key={i}` to `key={a.kind}` on action badge map.

- [ ] **B.5 (H4 — 5 min):** `Sparkline.tsx:43` use `useId()` for SVG `linearGradient` id to prevent collision on multi-instance render.

- [ ] **B.6 (H6 — 5 min):** `EventRow.tsx:49` add `role="img"` to the status dot `<span aria-label="ok|failed">` so screen readers actually announce it. Verify visual-hidden sr-only fallback isn't needed.

- [ ] **B.7 (H5 — 10 min):** `scripts/demo/stitch.sh:75-80` capture `ffprobe` to a variable, check exit code, parse duration in float not int (`60.9` must fail the 60s gate).

- [ ] **B.8 (H9 — 5 min):** Add `<meta property="og:..."/>` + `<meta name="twitter:..."/>` tags to `src/client/index.html` pointing at `assets/social-preview.png`.

- [ ] **B.9 (H7 — 10 min):** `pillar-5-numbers.md:28` AutoModerator 82% claim — either find primary source (Reddit blog post / S-1) or hedge wording to "Reddit's transparency data suggests AutoMod handles the majority of automated mod actions" with what's actually citable.

---

## Phase C — ENHANCEMENTS (8 commits, ~4.5h)

Order: low-risk text edits first, generative content last (longest, needs tools).

- [ ] **C.1 (E1 — 15 min):** Alt-text on 5 `assets/gallery-*.png` references in `README.md` + `docs/submission/devpost-form-cheat-sheet.md` Step 3 gallery list. Each alt unique + descriptive.

- [ ] **C.2 (E2 — 30 min):** Create `examples/` directory with:
  - `starter-config.json5` — seed config matching README description, ships on install (Phase 3 onAppInstall handler will reference this)
  - `spam-fresh-account.json5` — regex rule + author rule combining new-account / low-karma filter
  - `approve-trusted-mod.json5` — author allowlist for trusted contributors
  - `examples/README.md` — explains each, points at AJV schema

- [ ] **C.3 (E4 — 40 min):** Add `README.md` "Comparison" section before Credits. 3-row table: AutoMod / Original CM (PRAW) / CM-Devvit. Columns: hosting / rule composition / image-hash / per-sub data isolation / mobile dashboard / config surface / install model.

- [ ] **C.4 (E6 — 25 min):** Add AJV validation subsection in `README.md` Config schema area. Show the error shape mods see on malformed JSON5; reference upstream CM schema; mention "last good config stays active" safety story.

- [ ] **C.5 (E5 — 30 min):** Add server-side `?demo=1` branch to `src/routes/api.ts` for `/api/recent` + `/api/stats`. Move `DEMO_EVENTS` / `DEMO_STATS` from client-side `src/client/lib/api.ts` into a shared `src/lib/demo-fixtures.ts` module. Both client + server import. **Lane note:** routes/api.ts is Phase 3.x territory but currently empty stub Stephen authored; Vinh integrates around the demo branch when his ZSET wiring lands.

- [ ] **C.6 (E3 — 60 min):** Playwright captures of `?demo=1` dashboard at 375px (mobile) + 1280px (desktop). Save to `docs/screenshots/dashboard-mobile.png` + `dashboard-desktop.png`. Embed inline in README between Status table and Architecture diagram.

- [ ] **C.7 (E7 — 20 min):** Composite 3-panel install-flow PNG from existing gallery assets (`gallery-install.png` + `gallery-modmenu.png` + `gallery-dashboard.png`) via PIL or ImageMagick. Save to `assets/install-flow.png`. Embed in README Quick start section.

- [ ] **C.8 (E8 — 35 min):** Banana-generate `assets/gallery-dryrun.png` — mockup of the "Test rules on this item" form result showing rule-by-rule eval trace. Embed in README FAQ "How do I see what ContextMod actually did?".

---

## Phase D — Final close-out

- [ ] **D.1:** Strict AI-tone scan post all 23 commits — must stay 0 hits.

- [ ] **D.2:** `npm run type-check && npm run lint && npm test && npm run build` — all 4 must pass.

- [ ] **D.3:** Push entire batch to origin/main.

- [ ] **D.4:** Dispatch fresh `codex:codex-rescue` adversarial review on the now-fixed bundle as verification. Cap output ≤500 words; expect "ship" verdict.

- [ ] **D.5:** Final summary to Stephen — commit count, verification gate state, next milestone.

---

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| C3 idem.ts refactor breaks 9 tests | Med | TDD: extend test suite for race before refactor; refactor until green |
| C1 README rewrite reads as "we did less than claimed" → judge downgrade | Med | Balance honest scope-marking with the genuine accomplishments (dashboard, design system, docs, idempotency) |
| C5 captions drawtext + subtitles filter conflict in stitch.sh | Low | Test ffmpeg command isolation; subtitles filter + drawtext compose fine |
| E5 routes/api.ts touches Vinh-adjacent file | Low | Smallest possible diff; demo branch isolated; Vinh integrates around it |
| E3 Playwright captures need mock-server pattern + dist/client/ build | Low | Already verified pattern earlier today, reuse |
| E7/E8 Banana generations fail safety filter | Low | Existing 5 gallery PNGs went through same pipeline successfully |
| 23 commits in one session burns context window | High | Watch `/context` at ~60% threshold; checkpoint to Claude Memory note if approaching limit |

---

## Verification gates

- After each commit: `./scripts/check-ai-tone.sh --strict` exit 0
- After Phase A: all 6 critical findings closed; type-check + lint + test + build pass; no unintended diff
- After Phase B: all 9 high findings closed; bundle internally consistent
- After Phase C: all 8 enhancements landed; visual assets render in browser preview
- After Phase D: fresh Codex returns "ship" or 0 HIGH findings

---

## Execution order — sequential, no parallelism (commit-history readability)

A.1 → A.2 → A.3 → A.4 → A.5 → A.6 → B.1 → B.2 → B.3 → B.4 → B.5 → B.6 → B.7 → B.8 → B.9 → C.1 → C.2 → C.3 → C.4 → C.5 → C.6 → C.7 → C.8 → D.1 → D.2 → D.3 → D.4 → D.5

23 atomic commits + 5 verification steps.
