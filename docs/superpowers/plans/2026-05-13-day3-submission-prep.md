# Day 3 Submission Prep — Stephen Solo Track

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

### Wave B — Architecture diagram redo (Mermaid research done)
- [ ] **B.1** Replace ASCII flowchart with Mermaid `flowchart TB` — 4 subgraphs (Platform / Server / Client / External), 14 nodes, hot path with thick arrows, 4 classDef palette (Reddit orange + Devvit blue + dashboard green + external gray)
- [ ] **B.2** Add Mermaid `sequenceDiagram` for `handleActivity` request lifecycle — surfaces the 3-stage idempotency dance (`cm:proc` 24h → `cm:action:pending` 5m → `cm:action:done` 7d)
- [ ] **B.3** Add `accTitle` + `accDescr` for screen-reader users (Reddit dev review will check)
- [ ] **B.4** Playwright visual verification on github.com rendered README — desktop + mobile (375px)

### Wave C — README AI-tone scan
- [ ] **C.1** Build blocklist: `powerful` `sophisticated` `revolutionary` `seamless` `leverage` `robust` `cutting-edge` `intuitive` `amazing` `easily` `simply` `effortlessly` `transform`
- [ ] **C.2** Grep README — atomic commit per offense

### Wave D — NOTICES.md verification
- [ ] **D.1** Audit BSD-3-Clause Devvit template attribution + FoxxMD MIT
- [ ] **D.2** Verify Reddit trademark policy compliance (nominative use only, per `policies/terms.md` "No Reddit affiliation")
- [ ] **D.3** Commit only if changes needed

### Wave E — Pillar deepening (waits on running research)
- [ ] **E.1** Pillar 4 research lands → update `pillar-5-numbers.md` Section 6 with deepened "Tech inevitable" evidence (Blocks deprecation timeline, Devvit Web positioning quotes, App Migration Program framing)
- [ ] **E.2** Pillar 5 research lands → update `pillar-5-numbers.md` Section 7 with computed TAM math ($62.4M/yr volunteer-labor offset), Reddit FY26 financials, Discord ecosystem-maturity parallel
- [ ] **E.3** Update `writeup-draft.md` Project Impact section — pull in deepened numbers, prune generic claims
- [ ] **E.4** Update `writeup-draft.md` Tool Overview — sharpen "Why now" framing

### Wave F — Devpost cheat sheet (depends on E)
- [ ] **F.1** Capture exact Devpost form structure from user screenshots — 5 steps, exact field labels + char limits + Markdown/plaintext distinction
- [ ] **F.2** Step 2 Project overview: name candidates (≤60 chars), elevator pitch (≤200 chars), thumbnail spec (3:2 ratio)
- [ ] **F.3** Step 3 Project details: full Markdown story (## Inspiration / ## What it does / ## How we built it / ## Challenges / ## Accomplishments / ## What's next), Built-with tag list, Try-it-out URLs, image gallery curation, video demo URL slot
- [ ] **F.4** Step 4 Additional info: Reddit usernames, app page URL, Tool Overview (judges-only), Project Impact (judges-only), Ported app + Original Bot username + Port Completion + Helper nomination
- [ ] **F.5** Pre-submission verification protocol + AI-tone scan applied to every field
- [ ] **F.6** Sookra Pillar mapping per field — which pillar each piece of copy reinforces

### Wave G — Quick wins (parallel)
- [ ] **G.1** `docs/submission/domain-approval-runbook.md` — Stephen's 5-min Devvit dashboard check + MHS rejection decision tree
- [ ] **G.2** `scripts/check-ai-tone.sh` — bash blocklist scanner over `docs/submission/*.md` + `README.md`; exits non-zero on hit
- [ ] **G.3** Wire `check-ai-tone.sh` into `.github/workflows/ci.yml` as a soft check (warning only)

### Wave H — External-surface polish
- [ ] **H.1** Generate 1280×640 social preview image via Banana (matches Observatory aesthetic — warm-dark + concentric rings + green accent + "ContextMod · Devvit Web port of FoxxMD's PRAW-era moderation bot" overlay text)
- [ ] **H.2** Commit `assets/social-preview.png`
- [ ] **H.3** Upload to GitHub repo via plugin_github (Settings → Social preview)
- [ ] **H.4** Set GitHub Topics tags via gh CLI: `devvit`, `reddit-bot`, `reddit-moderation`, `moderation-tools`, `hackathon`, `mod-tools-hackathon-2026`, `rule-engine`, `praw-port`, `typescript`, `hono`, `vite`
- [ ] **H.5** Set GitHub About description via gh CLI (≤350 chars)

### Wave I — Demo prep + outreach (last)
- [ ] **I.1** `docs/submission/demo-video-runbook.md` — bridges `demo-video-script.md` → recording. OBS settings, ffmpeg stitch commands, retake protocol, voiceover re-record guidance, captions baked-in via ffmpeg `subtitles=` filter
- [ ] **I.2** `docs/submission/outreach-drafts.md` — FoxxMD ping #2 (confirm bot username for "Original Bot" field, request quote), SampleOfNone ping (helper nomination + r/piercing citation OK), r/Devvit Discord update draft. All in Stephen's voice for Stephen to send (no AI-tone burn risk).

### Wave J — Close-out
- [ ] **J.1** Day-3 commit count tally
- [ ] **J.2** Update PLAN.md if needed (Vinh's status board)
- [ ] **J.3** Mark this plan complete + push

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
