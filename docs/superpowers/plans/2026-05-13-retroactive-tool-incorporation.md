# Retroactive Tool Incorporation — Day 3 Closeout

> Lock May 13, 2026. Stephen made the tool-inventory audit MANDATORY (not optional) after I missed leveraging it twice. This plan retroactively applies tools I should have used during Day 0-3 work, before moving on to Phase 1+.

## Tool inventory audit for THIS plan

Per the [new locked memory policy](../../../../.claude/projects/-Users-stephensookra-Reddiit-Hacks/memory/tool-inventory-audit-per-task.md), full 5-pass scan applied. **USED** in this retroactive cycle:

| Tool | Pass | Used? | Why |
|------|------|-------|-----|
| `codex:codex-rescue` sub-agent | Sub-agents | ✅ USED | Final adversarial review of submission text (writeup-draft + devpost-cheat-sheet + outreach-drafts) — verification gate from day-3 plan was never run. |
| `pr-review-toolkit:silent-failure-hunter` sub-agent | Sub-agents | ✅ USED | Bash audit on `scripts/check-ai-tone.sh` beyond my manual review pass. |
| `pr-review-toolkit:comment-analyzer` sub-agent | Sub-agents | ✅ USED | Comment + claim accuracy across all `docs/submission/*.md`. |
| `cc-gemini-plugin:gemini-agent` sub-agent | Sub-agents | ✅ USED | Long-context cross-doc consistency check — read all submission docs + README + NOTICES + policies at once, flag contradictions across files. |
| `plan-review` skill | Skills | ✅ USED | Retroactive review on the Day 3 master plan as if it were a pre-implementation spec. |
| `plugin_github_github` MCP | MCP | ✅ USED | Bulk-add cards to FoxxMD's Projects v2 board via GraphQL (gated on Stephen refreshing `gh` scopes). |
| `banana` skill | Skills | ✅ USED (planned) | Hero gallery image for Devpost image-gallery slot if Tier C lands. |
| `karpathy-guidelines` skill | Skills | ✅ USED | Applied for "Think before edit" gate on each retroactive fix. |
| `three-brain` skill | Skills | ✅ USED | Routing this multi-agent dispatch via the codex-for-review hard rule. |

**SKIPPED with reason:**

| Tool | Pass | Skip reason |
|------|------|-------------|
| `claude_ai_Notion` MCP | MCP | Stephen has no project Notion linked. |
| `claude_ai_Slack` MCP | MCP | No project Slack. |
| `claude_ai_Gmail` MCP | MCP | Outreach happens on Discord + Reddit, not email. |
| `claude_ai_Google_Calendar` MCP | MCP | Stephen's calendar — would need explicit auth + permission to write his calendar. Defer to user-side TODO. |
| `claude_ai_Figma` MCP | MCP | No live Figma file for this project. |
| `claude_ai_Google_Drive` MCP | MCP | No project Drive. |
| `plugin_supabase_supabase` MCP | MCP | N/A — no Supabase backend. |
| `plugin_vercel_vercel` MCP + `vercel:*` sub-agents | MCP + sub-agents | N/A — deploying to Devvit not Vercel. |
| `stitch` MCP | MCP | Dashboard design is locked; overkill for Tier B+. |
| `magic` MCP | MCP | Considered for hero image but Banana already produces consistent aesthetic; consistency wins. |
| `sequential-thinking` MCP | MCP | Caveman + this plan structure already handle that role. |
| `ide` MCP | MCP | Single-file IDE diagnostics not needed at this layer. |
| `firecrawl` MCP | MCP | Already used Day 2 + by research agents. No new web scraping needed at retroactive stage. |
| `concept-to-image` skill | Skills | Mermaid arch already shipped. Single visual asset doesn't reward double-pass. |
| `canvas-design` skill | Skills | Devpost form doesn't request a poster-format asset. |
| `designlang` skill | Skills | Stephen could use it post-hackathon to extract DTCG tokens but doesn't move the submission needle now. |
| `usage-audit` / `codeburn` skills | Skills | Budget audit nice-to-have but not load-bearing. |
| `mcp-builder` skill | Skills | N/A — not authoring MCPs. |
| `superpowers:subagent-driven-development` skill | Skills | Day-3 plan already had subagent dispatch baked in implicitly. |
| `superpowers:writing-skills` skill | Skills | Not authoring new skills this session. |
| `graphify` skill | Skills | Knowledge-graph artifact would duplicate the pillar-5 dossier. |
| `distill-imports` skill | Skills | No raw chat imports to distill in this session. |
| `claude-code-guide` sub-agent | Sub-agents | Not a Claude Code usage question. |
| `feature-dev:code-architect` sub-agent | Sub-agents | Architecture already locked. |
| `feature-dev:code-explorer` sub-agent | Sub-agents | Codebase already explored — would re-cover ground. |
| `feature-dev:code-reviewer` sub-agent | Sub-agents | Overlaps with codex-rescue; codex pass first, this if findings need second opinion. |
| `code-simplifier:code-simplifier` sub-agent | Sub-agents | No production code touched in retroactive pass. |
| `pr-review-toolkit:code-reviewer` sub-agent | Sub-agents | Codex covers the broad sweep. Specialist below already chosen. |
| `pr-review-toolkit:pr-test-analyzer` sub-agent | Sub-agents | Tests live in Vinh's lane (Phase 1+). |
| `pr-review-toolkit:type-design-analyzer` sub-agent | Sub-agents | Docs work, no type design surface. |
| `statusline-setup` sub-agent | Sub-agents | N/A. |

## Goal

Apply every tool that would have improved Day 0-3 work but wasn't invoked. Lock the audit-policy into every future task via the strengthened memory file.

## Waves

### Wave 1 — Memory + plan (this commit) ✓

- [x] Strengthen `tool-inventory-audit-per-task.md` memory file with full inventory + mandatory protocol + audit-table format + self-correction trigger
- [x] This plan doc with embedded tool audit

### Wave 2 — Tier A parallel dispatch (in flight)

- [ ] **W2.1** `codex:codex-rescue` — final adversarial review of submission text. Files: `docs/submission/writeup-draft.md`, `docs/submission/devpost-form-cheat-sheet.md`, `docs/submission/outreach-drafts.md`, `docs/submission/demo-video-script.md`, `docs/submission/demo-video-runbook.md`, `docs/submission/devvit-app-settings.md`, `docs/submission/domain-approval-runbook.md`. Look for: AI-tone slip-throughs the regex missed, factual claims without source, internal contradictions, missing-edge-case prose, weasel words.

- [ ] **W2.2** `pr-review-toolkit:silent-failure-hunter` — `scripts/check-ai-tone.sh` bash audit. Look for: silent failures, swallowed errors, edge cases.

- [ ] **W2.3** `pr-review-toolkit:comment-analyzer` — `docs/submission/*.md` + `README.md` + `NOTICES.md`. Look for: comment / claim mismatches, comments that lie about the code, comments that will rot.

- [ ] **W2.4** `cc-gemini-plugin:gemini-agent` — long-context cross-doc consistency check. Read all of `docs/submission/`, `README.md`, `NOTICES.md`, `policies/*.md`, `devvit.json`, `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md` in one pass. Flag contradictions between docs (e.g., one says "Phase 4 ships" and another says "Phase 4 cut"). Flag dates that disagree. Flag URLs that disagree.

- [ ] **W2.5** `plan-review` skill on the Day 3 master plan retroactively — apply the structured Combined-mode review per the skill's sequence (assumption challenge / risk mapping / scope assessment / what's missing).

### Wave 3 — Fix findings in atomic commits

For every finding from W2.1–W2.5 with severity ≥ MED, ship an atomic fix commit. Findings ≥ HIGH that affect submission integrity are blockers.

### Wave 4 — FoxxMD kanban bulk-add (requires Stephen action)

- [ ] **W4.1** Stephen runs `gh auth refresh --scopes project,read:project` and confirms when done.
- [ ] **W4.2** I bulk-add ~40 cards from `docs/superpowers/foxxmd-kanban-seed.md` to https://github.com/users/FoxxMD/projects/6 via the GitHub GraphQL API.
- [ ] **W4.3** Verify card count + statuses + owners via `gh project item-list 6 --owner FoxxMD --format json`.
- [ ] **W4.4** Reply on Discord to FoxxMD confirming cards seeded with link to the project board.

### Wave 5 — Close-out

- [ ] **W5.1** Update `docs/superpowers/plans/2026-05-13-day3-submission-prep.md` with retroactive findings + fix commits cross-referenced.
- [ ] **W5.2** Push all close-out commits.
- [ ] **W5.3** Final summary to Stephen.

## Verification gates

- After Wave 2: every finding triaged (HIGH/MED/LOW/NIT) with concrete fix recommendation per finding.
- After Wave 3: re-run `./scripts/check-ai-tone.sh --strict` (must pass 0 hits).
- After Wave 3: re-run all CI workflows + Pages workflow.
- After Wave 4: visual confirm FoxxMD project board shows the seeded cards.

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Codex finds HIGH issue that requires writeup rewrite the day before submission | Med | Land any rewrites today, leave May 22-27 buffer untouched. |
| Gemini-agent flags contradictions that require multi-doc edits | Med | Atomic commits per file; no cascading edits. |
| `gh auth refresh` requires Stephen's browser flow + delay | High | Block W4 on Stephen's confirmation. Use the time for W2 + W3 review of agent outputs. |
| Codex finds nothing new (already-clean docs) | Low (good outcome) | Note "0 new findings" in plan close-out. |

## Done definition

- Memory file rewritten with mandatory full-inventory protocol + locked in every future task.
- 5 parallel audit agents dispatched; all findings triaged.
- All HIGH + MED findings fixed in atomic commits.
- FoxxMD kanban seeded with cards.
- Final close-out commit + push.
