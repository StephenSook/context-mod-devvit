# context-mod-devvit — Plan & Coordination

> Living status doc for Stephen + Vinh. Updated on every task change and pushed to `main`. Single source of truth for who is working on what. **Atomic commits — never bundle a status change with code.**

**Project:** Devvit Web port of FoxxMD's context-mod rule-engine moderation bot. Reddit Mod Tools and Migrated Apps Hackathon — Best Ported App ($10K) target.
**Team:** **Stephen** — frontend, custom post, mod UX, demo video, submission writeup. **Vinh** — backend rules engine, actions, idempotency layer, image hashing.
**Deadline:** 2026-05-27 6:00 PM PT (~15 days from today)
**Repo:** github.com/StephenSook/context-mod-devvit (private, push pending Stephen's `gh repo create` OK)
**Upstream:** github.com/FoxxMD/context-mod (collab access granted to StephenSook 2026-05-12, MIT)
**Master spec:** `docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md` (572-line architecture doc — read first)
**Reviews triangulated:** Claude manual + Codex adversarial + ultraplan PR. Consensus baked into Decisions D1–D10.

---

## Status Dashboard

Legend: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked · ✂️ cut
**Stale lock TTL: 4 hours** (hackathon pace). 🟡 task without a fresh timestamp in Notes is claimable.

### Phase 0 — Scaffold & plumbing (Day 0–1)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 0.1 | Devvit Web template clone | repo root | **Stephen** | ✅ | — | from `devvit-template-mod-tool-devvit-web` |
| 0.2 | devvit.json — triggers, scheduler, menu, settings, http | `devvit.json` | **Stephen** | ✅ | 0.1 | 5 fetch domains declared |
| 0.3 | README + LICENSE (MIT) + NOTICES.md | root | **Stephen** | ✅ | 0.1 | FoxxMD credit prominent |
| 0.4 | Privacy Policy + ToS drafted | `policies/` | **Stephen** | ✅ | 0.3 | GH Pages host pending repo push |
| 0.5 | Mop template removed, ContextMod route stubs | `src/routes/*` | **Stephen** | ✅ | 0.2 | All devvit.json paths wired, no 404s |
| 0.6 | Dual idempotency + cron lock helpers | `src/lib/idem.ts` | **Stephen** | ✅ | 0.5 | firstSeen + reserveAction + acquireLock + FNV-1a |
| 0.7 | First playtest + domain approval submit | terminal | **Stephen** | 🟡 May 12 4pm | 0.5, 0.8 | Run `npx devvit playtest <sub>`. Triggers Reddit domain approval review. |
| 0.8 | Create private test sub | reddit.com | **Stephen** | ⬜ | — | <200 members per hackathon rule. e.g., r/cowsufficient_cm_test |
| 0.9 | GitHub repo create + push | github.com | **Stephen** | ⬜ | 0.1 | Private; flip public before submission. Needs explicit Bash permission. |
| 0.10 | Image-decode + blockhash spike | `experiments/image-spike/` | **Vinh** | ⬜ | 0.8 | ⚠️ GO/NO-GO gate for Phase 4 image hashing. Day 0–2 max. → Vinh |

### Phase 1 — Core engine (Day 2–5, ~24h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Redis key schema (central) | `src/state/keys.ts` | **Vinh** | ⬜ | 0.5 | Strings + hashes + sorted-sets ONLY per D3 |
| 1.2 | Config loader: JSON5 + AJV + named-rule expand | `src/core/{config,namedRules}.ts` | **Vinh** | ⬜ | 1.1 | Trim CM schema to MVP rules |
| 1.3 | Atomic config publish via revision pointer | `src/state/configStore.ts` | **Vinh** | ⬜ | 1.2 | `cfg:rev:{n}` + `cfg:current_rev` per D5 |
| 1.4 | Filter eval (authorIs + itemIs) | `src/core/filters.ts` | **Vinh** | ⬜ | — | Port from CM RunnableBase |
| 1.5 | Mustache renderer | `src/core/template.ts` | **Vinh** | ⬜ | — | No-escape mode (Reddit comments are plaintext) |
| 1.6 | Rule dispatcher + Regex + Author + RuleSet | `src/core/runRule.ts`, `src/rules/*` | **Vinh** | ⬜ | 1.4 | 3 MVP rule kinds |
| 1.7 | Check eval (AND/OR aggregation) | `src/core/runCheck.ts` | **Vinh** | ⬜ | 1.6 | |
| 1.8 | Run state machine (postBehavior + goto) | `src/core/runRun.ts` | **Vinh** | ⬜ | 1.7 | 100-iter safety break |

### Phase 2 — Actions + handleActivity (Day 5–8, ~20h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 2.1 | Action dispatcher + per-action idempotency wrap | `src/core/runAction.ts` | **Vinh** | ⬜ | 0.6, 1.5 | reserveAction BEFORE side-effect per D4 |
| 2.2 | 7 MVP actions — remove/approve/lock/comment/report/ban/userFlair | `src/actions/*.ts` | **Vinh** | ⬜ | 2.1 | Each ~5–15 LOC over `reddit.*` client |
| 2.3 | handleActivity orchestrator | `src/core/handleActivity.ts` | **Vinh** | ⬜ | 1.8, 2.1 | Single-revision read at event start |
| 2.4 | onPostSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ⬜ | 2.3 | Replace stub |
| 2.5 | onCommentSubmit handler wire-up | `src/routes/triggers.ts` | **Vinh** | ⬜ | 2.3 | Replace stub |

### Phase 3 — Config UX + dashboard (Day 9–11, ~16h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 3.1 | onAppInstall seeds default config | `src/routes/triggers.ts` | **Vinh** | ⬜ | 1.3 | SETNX-guarded against retry |
| 3.2 | Wiki config loader + refresh-config cron | `src/core/configSource.ts`, `src/routes/scheduler.ts` | **Vinh** | ⬜ | 1.3 | Atomic revision swap |
| 3.3 | Reload-config mod menu action | `src/routes/menu.ts` | **Vinh** | ⬜ | 3.2 | Toast w/ rule count |
| 3.4 | Recent events ZSET + /api/recent | `src/state/recentEvents.ts`, `src/routes/api.ts` | **Vinh** | ⬜ | 2.3 | ZADD score=ts, ZREMRANGEBYRANK trim |
| 3.5 | Dashboard custom post (Vite + React) | `src/client/*` | **Stephen** | ⬜ | 3.4 | Mobile-first Tailwind, Lighthouse>80 |
| 3.6 | Dry-run rule tester menu + form | `src/routes/{menu,forms}.ts` | **Stephen** | ⬜ | 2.3 | UiResponse.showForm |
| 3.7 | onAppUpgrade migrations | `src/state/migrations.ts` | **Vinh** | ⬜ | 1.1 | Version table |

### Phase 4 — Stretch (Day 11–13, ~14h) — image hashing gated by 0.10

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 4.1 | URL-dedupe Repost rule | `src/rules/repost.ts` | **Vinh** | ⬜ | 1.6 | Cheap: sha256(url) + Redis SET w/ 30d TTL |
| 4.2 | MHSRule (HTTP fetch toxicity) | `src/rules/mhs.ts` | **Vinh** | ⬜ | 1.6 | api.moderatehatespeech.com |
| 4.3 | History infrastructure (author cache) | `src/state/authorHistory.ts` | **Vinh** | ⬜ | 1.1 | Shared by 4.4–4.6 — build once |
| 4.4 | HistoryRule | `src/rules/history.ts` | **Vinh** | ⬜ | 4.3 | Submission/comment count + karma |
| 4.5 | AttributionRule | `src/rules/attribution.ts` | **Vinh** | ⬜ | 4.3 | Domain/YouTube frequency |
| 4.6 | RecentActivityRule | `src/rules/recentActivity.ts` | **Vinh** | ⬜ | 4.3 | Per-target-sub thresholds |
| 4.7 | Image-hash port + worker + multi-index LSH | `src/image/*`, `src/rules/imageRepost.ts` | **Vinh** | ⬜ | 0.10 | ⚠️ GATED on 0.10 spike GO |
| 4.8 | DispatchAction | — | — | ✂️ | — | Cut per Codex+ultraplan synthesis |
| 4.9 | SentimentRule | — | — | ✂️ | — | Cut — NLP libs won't bundle in Devvit runtime |
| 4.10 | Full RepostRule w/ YouTube | — | — | ✂️ | — | Cut — 4.1+4.7 cover MVP |
| 4.11 | RepeatActivityRule | — | — | ✂️ | — | Cut — defer post-hackathon |

### Phase 5 — Tests + demo + submission (Day 13–15, ~10h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 5.1 | AJV schema golden tests | `tests/config.test.ts` | **Vinh** | ⬜ | 1.2 | Fixture corpus from real CM configs |
| 5.2 | Rule eval unit tests | `tests/rules/*.test.ts` | **Vinh** | ⬜ | 1.6, 4.* | Each rule covered |
| 5.3 | E2E scenarios A–H on test sub | manual | **Stephen** | ⬜ | All prior | GIFs/screenshots → docs/demo-scenarios/ |
| 5.4 | README polish + Fetch Domains section | `README.md` | **Stephen** | ⬜ | 5.3 | Devvit Rules requirement for fetch apps |
| 5.5 | 60s demo video | YouTube unlisted | **Stephen** | ⬜ | 5.3 | OBS + Audacity + ffmpeg |
| 5.6 | Submission writeup (Devpost) | devpost.com | **Stephen** | ⬜ | 5.5 | First-person build notes per D10 |

### Phase 6 — Ship (Day 15–16, ~6h)

| # | Component | File(s) | Owner | Status | Deps | Notes |
|---|---|---|---|---|---|---|
| 6.1 | `npx devvit publish --public --bump minor` | terminal | **Stephen** | ⬜ | All prior | 1–7 day review window |
| 6.2 | Devpost submission filed | devpost.com | **Stephen** | ⬜ | 6.1 | Before May 27 6 PM PT |

---

## Shared Contracts

> Drift = integration bugs. Modify these only after pinging the other person. `⚠️ CONTRACT` commit prefix on changes.

| Contract | Owner | Consumers | Definition |
|---|---|---|---|
| Redis key schema | Vinh | Both | `src/state/keys.ts` const K namespace |
| AJV config schema | Vinh | Both | `src/schema/app.schema.json` (trimmed from CM `Schema/App.json`) |
| Internal `Item` shape | Vinh | Both | `src/shared/types.ts` — id, title, body, url, author, age, score, isSelf, over18, removed, approved, locked, stickied, linkFlairText, depth?, op? |
| Internal `Author` shape | Vinh | Both | `src/shared/types.ts` — name, id, age, linkKarma, commentKarma, flairText, isMod, isContributor, verified, shadowBanned |
| Trigger event normalizer | Vinh | Both | Maps PostV2/CommentV2/UserV2 → `Item`/`Author` |
| Recent events shape | Vinh | Stephen (client) | `{ts, activityId, runName, checkName, triggered, actions:[{kind,ok}]}` JSON |
| `/api/recent` contract | Vinh | Stephen | Last 50 events newest-first, JSON `{events: [...]}` |
| Mustache template context | Vinh | Both | `{ item, author, manager, rules, actions }` |
| `devvit.json` triggers/cron/menu | Stephen | Both | Adding new endpoint requires both src/ stub AND devvit.json declaration |
| Fetch domain allowlist | Stephen | Both | `devvit.json.permissions.http.domains` — re-review on change |

---

## Decisions

### D1 — Devvit Web (not Blocks)
Blocks dies June 30, 2026. Devvit Web is the only forward path. **Locked 2026-05-12 by Stephen.**

### D2 — CommonJS server bundle
`package.json` has `"type":"module"` but Vite outputs `dist/server/index.cjs`. Devvit Web requires CJS. Template confirms. **Locked 2026-05-12.**

### D3 — Redis primitives: strings + hashes + sorted sets only
NO Lists (LPUSH/LRANGE) — not in Devvit Redis surface. NO Sets (SADD) — same. Recent events use ZADD score=timestamp, NOT LPUSH list. Per Codex CRITICAL #1. **Locked 2026-05-12.**

### D4 — Dual idempotency
`cm:proc:{thingId}` 24h TTL for trigger dedupe + `cm:action:{hash}` 7d TTL for per-effect dedupe. Implemented in `src/lib/idem.ts`. Per ultraplan H2 + Codex HIGH. **Locked 2026-05-12.**

### D5 — Atomic config publish via revision pointer
Each loaded config writes immutable `cfg:rev:{n}` then atomically bumps `cfg:current_rev` pointer. handleActivity reads pointer once at event start, carries `n` through entire pipeline. Per Codex HIGH #3. **Locked 2026-05-12.**

### D6 — Cron single-flight via `acquireLock`
Every cron handler MUST `acquireLock(taskName)` at top, release on completion. 60s TTL. Already wired in `src/routes/scheduler.ts`. Per ultraplan M1. **Locked 2026-05-12.**

### D7 — Path B scope: MVP + select stretch
MVP = Regex/Author/RuleSet + 7 actions + filters + Mustache + named rules + wiki config + dashboard + dry-run tester. Stretch = URL repost + MHSRule + HistoryRule + AttributionRule + RecentActivityRule + image-hash (gated). CUT = DispatchAction, SentimentRule, full RepostRule w/ YouTube, RepeatActivityRule, Web UI w/ Monaco, multi-bot. **Locked 2026-05-12 after triple review.**

### D8 — Image hashing gated on Day 0–2 spike
If 0.10 shows fetch+decode+hash works in Devvit within 5s and <100MB peak memory, image-hash repost ships. Otherwise feature stubs in `4.7`. **Decision deadline: end of Day 2.**

### D9 — Wiki page name: `botconfig/contextmod`
Matches CM convention. Mods write JSON5 config to `reddit.com/r/<sub>/wiki/botconfig/contextmod`. **Locked 2026-05-12.**

### D10 — Submission writeup voice: first-person build notes
No AI-tone marketing prose. Specific bugs hit, exact cuts made, screenshots. Concrete FoxxMD credit. Watchful1 lesson informs this. **Locked 2026-05-12.**

### D11 — Reddit handle for app
u/CowSufficient3840 (Stephen's logged-in account on devvit). Reflected in `policies/*.md` contact info. **Locked 2026-05-12.**

---

## Open Questions

- [ ] **Q1:** Image-hash spike outcome — GO or NO-GO? (Task 0.10 result). **Decides:** finalize D8, sets Phase 4 shape. Owner: Vinh.
- [ ] **Q2:** Does `i.redd.it` fetch work post-approval? CDN auth/referer behavior unknown. Test in playtest. **Decides:** image-hash viability even if blockhash decode works. Owner: Vinh during 0.10 spike.
- [ ] **Q3:** Submission framing — "Devvit-native full port" vs "spiritual successor + dashboard"? Lean former if Phase 4 ships clean. **Decides:** Stephen by Day 14.
- [ ] **Q4:** Custom post height in `devvit.json.post.entrypoints` — `regular` or `tall`? Currently `regular`. Re-evaluate after dashboard mock. **Decides:** Stephen, Phase 3.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Domain approval delayed past Day 8 | Submit Day 0 via 0.7. Escalate r/Devvit modmail Day 5 if pending. Fallback: external Lambda hasher on s3.amazonaws.com (allow-listed). |
| Phase 4 image-hash burns 3+ days w/o GO | Hard gate at 0.10 EOD Day 2. NO-GO → stub feature, reclaim time for polish. |
| Vinh capacity (~5–10 hr/wk previously assumed; back on board now) | If actual capacity below estimate, cut 4.4–4.6 history-based rules first, then 4.7 image-hash, then 4.2 MHS. Ship MVP cleanly. |
| AI-tone burn in submission writeup (Watchful1 lesson) | Per D10. Stephen writes from build notes. AI for outline only. |
| Reddit's app review backed up past May 27 | `npx devvit publish --public` no later than Day 14. Backup contingency: submit Devpost with unlisted listing + repo + video. |
| PLAN.md drift between Stephen + Vinh | Atomic plan commits per protocol. 4h stale-lock TTL. Daily sync ping. |

---

## Coordination Protocol

1. **Before starting a task:** set status to 🟡, add timestamp in Notes, commit PLAN.md only, push. This is your lock.
2. **After finishing:** flip to ✅, commit PLAN.md, push.
3. **If blocked:** set to ⛔, add one-line note. Ping the other person.
4. **Before starting ANY task:** `git pull` and re-read PLAN.md. If someone else has 🟡 on overlapping files, coordinate.
5. **Hotfixes:** skip the protocol — commit the fix, update PLAN.md after. Don't let process block real emergencies.
6. **PLAN.md commits are atomic.** Never bundle a status change with code. One-line status edit → commit → push.
7. **Commit messages:**
   - PLAN.md updates: `status: [task #] [emoji] [description]` (e.g., `status: 2.1 🟡 starting action dispatcher`)
   - Code commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
   - Contract changes: `⚠️ CONTRACT: [field] — [reason]`
8. **Handoffs:** when your part is done and someone else continues, add `→ [Name]` in Notes column.
9. **Stale locks (hackathon TTL = 4 hours):** 🟡 requires a fresh timestamp. No code/PLAN.md commit within 4h → lock is stale, other person can claim by replacing owner + bumping timestamp.
10. **Contract changes require announcement.** Modifying anything in Shared Contracts → ping the other person BEFORE committing. Mark with `⚠️ CONTRACT` prefix. Contract drift is the #1 small-team integration bug.
11. **CLI helper:** `./scripts/plan claim 2.1`, `./scripts/plan done 2.1`, `./scripts/plan block 2.1 "reason"`, `./scripts/plan ls --mine`. Avoid manual table editing errors.

---

_Last updated: 2026-05-12 by Stephen._
