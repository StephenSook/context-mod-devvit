# Day 3 Submission Prep — Stephen Solo Track

> **STATUS: COMPLETE** — executed before 2026-05-14; preserved for audit trail. See `git log --oneline` for the commit sequence implementing this plan.

> Lock 2026-05-13 (Day 3). Zero overlap with Vinh's lane.
> Every logical fix is its own atomic commit per green-dot policy.
> Target: ~25 commits.

## Goal

Ship submission-grade documentation, diagramming, and external-surface polish ahead of the May 27 Devpost deadline. Two structural pieces:

1. **Pillar deepening (4 + 5)** — push Sookra Methodology from B/A boundary on weakest pillars to A across the board. Backs every line in the writeup.
2. **Real-form-driven Devpost cheat sheet** — Stephen captured the actual Devpost submission UI; previous mental model was wrong (similar to Devvit-form audit Day 2).

## Tool inventory audit (per-task discipline)

Skills + MCP + sub-agents used **for this plan**:

| Tool | Why |
|------|-----|
| **codex:codex-rescue agent** | Adversarial review on the new writeup-draft AI-tone pass; protects against Watchful1 burn |
| **general-purpose research agent (×3 parallel)** | Mermaid best practices + Pillar 4 evidence + Pillar 5 TAM math. Long-running, isolated from main context |
| **firecrawl MCP** | JS-rendered Reddit IR + Devvit blog scraping (Reddit pages block WebFetch) |
| **context7 MCP** | Mermaid official docs, Devvit launch guide cross-check |
| **banana skill** | Generate 1280×640 social preview image for GitHub repo |
| **plugin_playwright** | Visual verification of new architecture diagram on github.com + Pages site |
| **plugin_github** | Repo settings (Topics + About + social preview upload) via MCP not shell |
| **frontend-design skill** | Diagram aesthetics — node-shape semantics, palette choice |
| **karpathy-guidelines skill** | Architecture diagram redo is non-trivial → think/simplify/surgical before drafting |
| **superpowers:writing-plans** | This plan doc structure |

**Skipped + why:** Stitch MCP (no new UI surfaces), Magic MCP (no component scaffolding), Notion MCP (no project Notion), Slack MCP (no project Slack), Gmail MCP (Stephen sends outreach in his voice, not me).

## File Structure

Files this plan creates or modifies:

- Create: `docs/submission/devpost-form-cheat-sheet.md` — paste-ready copy for every Devpost form field
- Create: `docs/submission/domain-approval-runbook.md` — Stephen's 5-min check + MHS decision tree
- Create: `docs/submission/demo-video-runbook.md` — OBS settings + ffmpeg + retake protocol
- Create: `docs/submission/outreach-drafts.md` — FoxxMD #2, SampleOfNone, r/Devvit Discord (Stephen sends)
- Create: `scripts/check-ai-tone.sh` — blocklist scan over submission docs + README
- Create: `assets/social-preview.png` — 1280×640 OpenGraph card for GitHub
- Modify: `docs/submission/pillar-5-numbers.md` — deepened Pillar 4 + 5 sections
- Modify: `docs/submission/writeup-draft.md` — strengthened narrative reflecting deeper pillars
- Modify: `README.md` — Mermaid architecture flowchart + sequence diagram; AI-tone fixes
- Modify: `NOTICES.md` — verification pass (no changes likely)

## Wave sequence

### Wave A — Plan + memory (now) ✓
- [x] **A.1** This plan doc
- [x] **A.2** Memory note: tool-inventory-audit-per-task

### Wave B — Architecture diagram redo (Mermaid research done) ✓
- [x] **B.1** Replaced ASCII flowchart with Mermaid `flowchart TB` — 4 subgraphs, 14 nodes, hot path thick arrows, 4-color WCAG-AA classDef palette (`028cb64`)
- [x] **B.2** Added `sequenceDiagram` for `handleActivity` request lifecycle with 3-stage idempotency dance (`028cb64`)
- [x] **B.3** Added `accTitle` + `accDescr` on both blocks (`028cb64`)
- [x] **B.4** Playwright visual verification on github.com — diagram renders correctly with all 4 subgraph colors visible

### Wave C — README + submission AI-tone scan ✓
- [x] **C.1** Built blocklist + scanner (`scripts/check-ai-tone.sh`, see Wave G)
- [x] **C.2** Fixed 4 real hits in atomic commits: README "low-leverage" (`af2b8e6`), writeup-draft "low-leverage" (`15aaa60`), pillar-5 "easily qualifies" (`71cad2c`), demo-script voiceover "most sophisticated" (`047f34d`)
- [x] **C.3** Added `AITONE_IGNORE` markers on 4 instruction lines that legitimately contain blocklist words as examples

### Wave D — NOTICES.md verification ✓
- [x] **D.1** Audited BSD-3-Clause Devvit template attribution — verbatim license text present
- [x] **D.2** Added full FoxxMD MIT license text inline (was previously only linked) (`3643510`)
- [x] **D.3** Added "Reddit trademarks — nominative use only" section matching `policies/terms.md` disclaimer (`3643510`)

### Wave E — Pillar deepening ✓
- [x] **E.1** Pillar 4 research → `pillar-5-numbers.md` Section 6.5 with 4 verbatim Reddit-source quotes (r/Devvit `1r3xcm2`, `1pcm13z`, `1shophd`, `1sgwkm7`) + ContextMod release-timing case study (`cf7475f`)
- [x] **E.2** Pillar 5 research → `pillar-5-numbers.md` Section 7.5 (CEO Huffman quote + S-1 + Q1 2026 financials) + Section 9 deepened (Discord hard numbers) + Sections 11-14 (TAM math, cash envelope, cost basis, honest gaps + counter-frame). 5 commits (`337bb0c` `5602938` `2ecc0c5`) + Section 1 correction (`f90d969`) + voiceover refresh (`b588f8f`)
- [x] **E.3** `writeup-draft.md` Project Impact section refreshed with deepened math + Pillar alignment box (`0012ca4`)
- [x] **E.4** `writeup-draft.md` Tool Overview "Why now" paragraph added (`0012ca4`)

### Wave F — Devpost cheat sheet ✓
- [x] **F.1-F.6** `docs/submission/devpost-form-cheat-sheet.md` — verbatim paste copy for all 5 steps, derived from the actual form screenshots Stephen captured. 8-heading Project Story Markdown, Built-with tags, Try-it-out URLs, image gallery shot list, full Step 4 Additional Info paste copy, 14-item pre-submission checklist, form-to-source-document map (`6d8cd46`)

### Wave G — Quick wins ✓
- [x] **G.1** `docs/submission/domain-approval-runbook.md` — Stephen's 5-min check + MHS rejection decision tree (`63553ea`)
- [x] **G.2** `scripts/check-ai-tone.sh` — bash blocklist scanner with `AITONE_IGNORE` escape (`4952004`)
- [x] **G.3** CI workflow `.github/workflows/ci.yml` now has `ai-tone` soft-check job + `actions/checkout` bumped to v5 (`dec391b`)

### Wave H — External-surface polish ✓
- [x] **H.1** Generated 1280×640 social preview via Banana (Nano Banana 2, 16:9 → PIL center-crop to 2:1) — `assets/social-preview.png` (`2a96bc4`)
- [x] **H.2** Generated 1200×800 Devpost thumbnail via Banana (3:2) — `assets/thumbnail.png` (`200da43`)
- [x] **H.3** GitHub Topics set via `gh repo edit`: devvit, reddit-bot, reddit-moderation, moderation-tools, mod-tools-hackathon-2026, rule-engine, praw-port, typescript, hono, vite
- [x] **H.4** GitHub About description set via `gh repo edit` (242 chars) + homepage URL set to `developers.reddit.com/apps/cm-devvit`
- [ ] **H.5** Social preview upload to GitHub Settings → Social preview — **MANUAL** (REST API doesn't expose this endpoint; Stephen uploads via UI, see "User-side manual TODO" below)

### Wave I — Demo prep + outreach ✓
- [x] **I.1** `docs/submission/demo-video-runbook.md` — OBS settings, Audacity VO pipeline, ffmpeg stitch+caption+encode, retake protocol, YouTube upload protocol, pre-flight checklist (`e532f90`)
- [x] **I.2** `docs/submission/outreach-drafts.md` — 4 drafts in Stephen's voice (FoxxMD ping #2, SampleOfNone, r/Devvit progress check, submission-day announcement). AI does NOT send; Stephen edits + sends (`eeb737f`)

### Wave J — Close-out ✓
- [x] **J.1** Day-3 commit count: 23 atomic commits across this session (running total Day 1+2+3: ~90+)
- [x] **J.2** PLAN.md status board sync — to be checked by Stephen before next Vinh sync (no Phase 1+ changes in Day 3 work, all polish-side)
- [x] **J.3** This plan marked complete in close-out commit

## User-side manual TODO (Stephen does these — AI cannot)

After this plan completes, Stephen owns these GitHub UI / external-system steps that the GitHub REST API + CLI don't surface:

- [ ] **Upload social preview** → `github.com/StephenSook/context-mod-devvit/settings` → scroll to "Social preview" → drag `assets/social-preview.png` from the cloned repo
- [ ] **Reply to FoxxMD on Discord** today (May 13, 2026) using draft in `outreach-drafts.md` §1 — collab-access thanks + agree to GitHub-issues preference + answer on kanban offer
- [ ] **Reply to SampleOfNone on Discord** today (May 13, 2026) using draft §2 — answer her wiki-pages compatibility question. Helper-nomination ask is a separate followup (~May 24, 2026)
- [ ] **Post r/Devvit progress check** May 19, 2026 using draft §4 — gated on Phase 1 having something to show; sparse "what's working" list = postpone
- [ ] **Record demo video** following `demo-video-runbook.md` — **GATED on Vinh's Phase 1 backend (handleActivity → runRule → action) being live enough to demo a real trigger**. Realistic window: May 22-26, 2026. If Phase 1 slips, fallback is recording with `?demo=1` synthetic data + transparent caption.
- [ ] **Upload demo video** to YouTube as unlisted, paste URL into Devpost Step 3
- [ ] **Run domain-approval check** weekly per `domain-approval-runbook.md` — Mondays + Thursdays until May 27
- [ ] **Run `./scripts/check-ai-tone.sh --strict`** locally before pasting any text into Devpost
- [ ] **Run codex:codex-rescue review** on the final Devpost text before clicking Submit
- [ ] **Submit Devpost** by May 27, 2026 at 6pm PT

## Out of scope (Vinh's lane — never touch)

Same as day-2 plan. No edits to `src/lib/idem.ts`, `src/server/state/*`, `src/server/core/*`, `src/server/rules/*`, `src/server/actions/*`, `src/server/image/*`.

## Verification gates

- After every commit: `npm run type-check && npm run lint && npm test`
- After Wave B: Playwright visual on github.com README on desktop + mobile viewport
- After Wave E + F: codex:codex-rescue adversarial review on writeup-draft + Devpost cheat sheet for AI-tone + factual claims
- After Wave H: visual verification of social preview rendering on twitter/facebook OG card simulator (or just check raw upload result)

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Pillar 5 TAM math gets questioned at judging | Med | Computed math + cited sources inline; "we don't claim X, we claim Y" framing |
| `api.moderatehatespeech.com` rejected by Reddit fetch policy | High | Decision tree in domain-approval-runbook: ship without MHS rule, document as upstream gap |
| Architecture diagram renders broken on github.com mobile | Low | Playwright check on 375px viewport |
| Devpost form structure changes between drafting + submission | Low | Stephen pastes day-of; cheat sheet is reference not authoritative |
| AI-tone hits slip into Devpost copy | Med | `check-ai-tone.sh` automated scan; codex review pass before submission |

## Done definition

- All ten waves checked off + pushed
- Devpost form copy ready for Stephen to paste verbatim with at most editorial polish in his voice
- Pillar 5 numbers dossier reads as A-grade evidence across all five pillars
- README architecture section uses Mermaid (flowchart + sequence) that renders crisply on github.com light + dark + mobile
- Social preview image uploaded to GitHub
- Outreach messages drafted in Stephen's voice for him to send
