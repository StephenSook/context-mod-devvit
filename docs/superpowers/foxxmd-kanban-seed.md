# FoxxMD GitHub Project Board — Seed Cards

> Source: [`github.com/users/FoxxMD/projects/6`](https://github.com/users/FoxxMD/projects/6) (title: "ContextMod Devvit").
> FoxxMD added Stephen + Vinh as collaborators on 2026-05-12 + shared the project URL on 2026-05-13 at 2:50 PM.
>
> This file is the source-of-truth for cards Stephen seeds into the board. Stephen can either:
> 1. Paste each card title via the GitHub Projects v2 UI (Add item → free-text), then set Status + Owner via the UI.
> 2. Authorize the `gh` CLI with `read:project` + `project` scopes (`gh auth refresh --scopes project,read:project`) and ask me to bulk-add via the GraphQL API.

## Status legend

- **Todo** = not started
- **In Progress** = active work happens this week
- **Blocked** = waiting on a dependency
- **Done** = shipped

## Owner legend

- **@chiblue** = Stephen Sookra
- **@vinhbin** = Vinh

---

## Cards — Phase 1 (Vinh's lane, May 13-17, 2026)

Backend core engine wiring. Stephen does not touch these files.

| Title | Owner | Status | Body / notes |
|-------|-------|--------|--------------|
| `handleActivity` entry: read cfg pointer once, dispatch by trigger type | @vinhbin | Todo | `src/server/core/handleActivity.ts`. Reads `cfg:current_rev` → `cfg:rev:n` snapshot, branches by post/comment/appinstall/appupgrade trigger. Single config read for the whole pipeline (prevents mid-event tear). |
| `runRun` flow control + `postBehavior` semantics | @vinhbin | Todo | `src/server/core/runRun.ts`. Iterates checks in order, honors `next` / `nextRun` / `stop` / `goto:<run>.<check>`. |
| `runCheck` AND/OR rule composition | @vinhbin | Todo | `src/server/core/runCheck.ts`. Evaluates rules with `condition: "AND" \| "OR"`, short-circuits, returns triggered-rules array for action context. |
| `runRule` dispatcher per rule kind | @vinhbin | Todo | `src/server/core/runRule.ts`. Switches on `kind: "regex" \| "author" \| "ruleSet"` for MVP. Returns boolean + populated `rules.<name>.data` context. |
| Filter system: `authorIs` / `itemIs` gates | @vinhbin | Todo | `src/server/core/filters.ts`. Multi-attribute author criteria (age, karma, flair, isMod, etc.) + item criteria. Same criteria set as upstream CM. |
| Named-rule expansion + cycle detection | @vinhbin | Todo | `src/server/core/namedRules.ts`. Resolves string-named rule references, errors on cycles. |
| Mustache action templating with full context | @vinhbin | Todo | `src/server/core/template.ts`. Context: `{{item.*}}`, `{{author.*}}`, `{{rules.<name>.data.*}}`. |
| Config store: atomic publish via revision pointer | @vinhbin | Todo | `src/server/state/configStore.ts`. Writes immutable `cfg:rev:n` then atomically bumps `cfg:current_rev`. Wiki refresh-config cron writes here. |

---

## Cards — Phase 2 (Vinh's lane, May 17-20, 2026)

7 action handlers + 4 trigger routes.

| Title | Owner | Status | Body / notes |
|-------|-------|--------|--------------|
| Action: `remove` with optional `spam: true` flag | @vinhbin | Todo | `src/server/actions/remove.ts`. Per-effect idempotency gate. |
| Action: `approve` | @vinhbin | Todo | `src/server/actions/approve.ts`. |
| Action: `lock` | @vinhbin | Todo | `src/server/actions/lock.ts`. |
| Action: `comment` with Mustache-rendered body | @vinhbin | Todo | `src/server/actions/comment.ts`. Sticky + distinguished options. |
| Action: `report` with templated reason | @vinhbin | Todo | `src/server/actions/report.ts`. |
| Action: `ban` with templated reason/duration | @vinhbin | Todo | `src/server/actions/ban.ts`. Optional duration days. |
| Action: `userFlair` with CSS class + text | @vinhbin | Todo | `src/server/actions/userFlair.ts`. |
| Trigger route: `/internal/triggers/post-submit` | @vinhbin | Todo | `src/routes/triggers/postSubmit.ts`. Wraps `handleActivity` with idempotency `cm:proc:{thingId}` 24h gate. |
| Trigger route: `/internal/triggers/comment-submit` | @vinhbin | Todo | Same pattern as post-submit. |
| Trigger route: `/internal/triggers/app-install` | @vinhbin | Todo | Seed starter wiki config + create install record. |
| Trigger route: `/internal/triggers/app-upgrade` | @vinhbin | Todo | Run any schema migrations + bump version. |

---

## Cards — Phase 3 (Stephen's lane, May 20-22, 2026)

Wire the Observatory dashboard to live Phase 1 + Phase 2 data. Currently uses `?demo=1` synthetic data.

| Title | Owner | Status | Body / notes |
|-------|-------|--------|--------------|
| Wire `/api/recent` to read events from `events:recent` ZSET | @chiblue | Blocked on Phase 2 | `src/routes/api/recent.ts`. Reads last 50 entries by score (timestamp). |
| Wire `/api/stats` to compute from `events:recent` ZSET + stats hash | @chiblue | Blocked on Phase 2 | `src/routes/api/stats.ts`. Actions today, mod time saved estimate, active rules, top rule. |
| Mod menu: "Reload config from wiki" — wire to `configStore.refresh()` | @chiblue | Blocked on Phase 2 | `src/routes/menu/reloadConfig.ts`. Already scaffolded in `src/routes/menu.ts`. |
| Mod menu: "View recent actions" — create custom post | @chiblue | Blocked on Phase 2 | Reuses existing submit-custom-post handler. |
| Mod menu: "Test rules on this item" — dry-run rule tester | @chiblue | Blocked on Phase 2 | Form-submit pattern. Returns which rules would fire without taking action. |
| End-to-end smoke: real test post triggers real action chip in dashboard | @chiblue | Blocked on Phase 2 | The demo-recording prerequisite. |

---

## Cards — Phase 4 stretch (May 22-24, 2026, optional)

Image-hash repost detection + MHS toxicity rule. Both gated on external dependencies.

| Title | Owner | Status | Body / notes |
|-------|-------|--------|--------------|
| Image decode + perceptual blockhash in pure JS within Devvit 30s window | @vinhbin | Blocked on spike | `src/server/image/blockhash.ts`. Day-0 spike target — confirm feasibility before committing. |
| `repost` rule with URL + image-hash variants | @vinhbin | Blocked on blockhash spike | `src/server/rules/repost.ts`. |
| `history` rule — author post history checks | @vinhbin | Todo | `src/server/rules/history.ts`. |
| `attribution` rule — sub-distribution checks | @vinhbin | Todo | `src/server/rules/attribution.ts`. |
| `recentActivity` rule | @vinhbin | Todo | `src/server/rules/recentActivity.ts`. |
| `mhs` rule — ModerateHateSpeech API integration | @vinhbin | Blocked on domain approval | `src/server/rules/mhs.ts`. Gated on `api.moderatehatespeech.com` being approved by Reddit's HTTP fetch policy. High risk of rejection per [domain-approval-runbook.md](../submission/domain-approval-runbook.md). |

---

## Cards — Phase 5 demo + submission (May 22-27, 2026)

Stephen-side. Detailed in [`docs/submission/`](../submission/).

| Title | Owner | Status | Body / notes |
|-------|-------|--------|--------------|
| Demo recording: OBS capture per [demo-video-runbook.md](../submission/demo-video-runbook.md) | @chiblue | Blocked on Phase 1+2+3 smoke | Realistic window May 22-26, 2026. Fallback to `?demo=1` synthetic data if Phase 1 slips. |
| Demo voiceover via Audacity | @chiblue | Blocked on capture | Stephen records in his own voice. |
| ffmpeg stitch + caption + encode | @chiblue | Blocked on VO | YouTube-spec final encode. |
| YouTube unlisted upload | @chiblue | Blocked on encode | Paste URL into Devpost Step 3 video field. |
| Devpost form fill per [devpost-form-cheat-sheet.md](../submission/devpost-form-cheat-sheet.md) | @chiblue | In progress (5 steps) | Run check-ai-tone --strict before each text paste. |
| Final Codex review on writeup-draft.md + devpost-form-cheat-sheet.md | @chiblue | Todo before submit | `codex:codex-rescue` adversarial pass. |
| Click Submit on Devpost | @chiblue | Todo | By May 27, 2026 at 6pm PT. |

---

## Cards — Phase 6 ship + post-hackathon (May 27 onward)

| Title | Owner | Status | Body / notes |
|-------|-------|--------|--------------|
| Submission-day announcement post in r/Devvit + Discord | @chiblue | Todo | Draft in [outreach-drafts.md §5](../submission/outreach-drafts.md). |
| Open the app to all 15+ ContextMod operators FoxxMD identified | @chiblue | Post-deadline | One-by-one DM via Reddit. |
| Pursue Reddit Developer Funds DQE ladder | @chiblue | Post-deadline | Tier 3-4 realistic. |
| Phase 4 stretch follow-through if not shipped pre-deadline | @vinhbin | Post-deadline | Image-hash + MHS, depending on domain approval. |

---

## Notes on the kanban itself

- **FoxxMD prefers technical discussion in GitHub issues/discussions** (per his May 12 Discord message) — board comments + issue-linked cards better than Discord threading for substantive content.
- **Stephen's PLAN.md status table** in the repo root is the lower-fidelity day-to-day status board mirroring this. Both should stay in sync; the kanban is the canonical project view.
- **Cards-to-issues escalation:** if a card requires multi-comment back-and-forth, convert it to a real GitHub Issue and link from the board.

## How to bulk-add via gh CLI (if Stephen authorizes scopes)

```bash
# Stephen runs this once to grant the gh CLI project-level scope
gh auth refresh --scopes project,read:project

# Then I can iterate this file + add cards via GraphQL
# Example single-card add (project ID from `gh project list --owner FoxxMD`):
gh project item-create 6 --owner FoxxMD --title "Card title here" --body "Card body"
```
