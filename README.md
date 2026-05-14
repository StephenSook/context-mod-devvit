<img src="assets/icon.png" alt="ContextMod Observatory" width="96" align="right" />

# context-mod-devvit

> **A rule-engine moderation co-pilot for Reddit subreddits, running natively on Devvit.**
> Write your moderation rules once in JSON5. The rule engine, idempotency primitives, atomic config publish, and Observatory dashboard (demo mode) ship in v0.1.0. Live trigger evaluation, action handlers, and dashboard live-data wiring land in Phase 1-3 — see "What's ported" below for the per-phase ship state. Mods install ContextMod once, define what counts as spam / what to remove / what to comment / what users to ban, and the bot handles the rest once Phase 1-3 wiring lands.

[![CI](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml/badge.svg)](https://github.com/StephenSook/context-mod-devvit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Devvit](https://img.shields.io/badge/Devvit-Web-FF4500.svg)](https://developers.reddit.com/docs)
[![Hackathon](https://img.shields.io/badge/Reddit-Mod%20Tools%20Hackathon%202026-orange.svg)](https://mod-tools-migration.devpost.com/)

---

**Devvit Web port of [ContextMod](https://github.com/FoxxMD/context-mod)** — FoxxMD's flagship moderation bot, originally built on PRAW and now ported to Reddit's first-party developer platform.

Built for the [Reddit Mod Tools and Migrated Apps Hackathon](https://mod-tools-migration.devpost.com/) (Apr 29 – May 27, 2026). Ported with explicit written permission from FoxxMD via [github.com/FoxxMD/context-mod#152](https://github.com/FoxxMD/context-mod/issues/152).

**Why a port?** The original ContextMod requires you to host a server, manage API tokens, and trust a centralized instance. Devvit's per-subreddit install model removes all three. Every mod team installs their own instance with one click — no infrastructure, no shared rate limits, no central bottleneck.

## What it does

ContextMod evaluates new posts and comments against a flexible, mod-defined rule engine and takes moderation actions when checks trigger. Each rule + action set is defined in a JSON5 config (loaded from your sub's wiki), composable with named rules, filters, and Mustache-templated action messages.

The Devvit port preserves the rule/check/action concept model that mods of [r/mealtimevideos](https://reddit.com/r/mealtimevideos) (60K weekly visitors), [r/piercing](https://reddit.com/r/piercing) (600K visitors, 12K contributors), and 15+ other communities already know — while solving the central-server bottleneck that capped CM's adoption on the original PRAW infrastructure. With Devvit's per-subreddit install model, every mod team can install their own instance.

## Quick start (for moderators)

![3-panel install flow: (1) App Directory page with Add to community button highlighted, (2) Subreddit mod overflow menu listing the three ContextMod entries, (3) Observatory dashboard with stat cards and event stream.](./assets/install-flow.png)

1. **Install** — Visit [developers.reddit.com/apps/cm-devvit](https://developers.reddit.com/apps/cm-devvit) and click **Add to community**, then pick your subreddit (you must be a mod with `posts` + `wiki` permissions).
2. **Pin the dashboard** — In your sub's mod overflow menu, click **ContextMod: View recent actions**. A custom post appears that shows mod-action telemetry (demo data until Phase 3 wires live events). Stickying it is optional but recommended.
3. **Write your rules** — Create `r/<your-sub>/wiki/contextmod` with JSON5 config. A starter config is seeded on install; edit it to taste. See [Config schema](#config-schema) for the full surface.
4. **Reload** — In the subreddit mod overflow, click **ContextMod: Reload config from wiki** (or wait 5 minutes — the app polls automatically). The Observatory dashboard shows the rule count + actions taken once Phase 1-3 wiring lands.
5. **Test a rule** — Right-click any post or comment, choose **ContextMod: Test rules on this item**. A dry-run shows which rules would fire without taking action.

> **No hosting. No tokens. No central bottleneck.** Everything lives inside your subreddit's Devvit installation.

## Status — what's production vs scaffolded vs Phase-N pending

**Hackathon-era MVP.** Active development; expect rough edges. Architecture diagram below shows the *full pipeline*; the Status table below tells you which boxes are wired today vs which land Phase 1-3.

| Component | State today | Lands |
|-----------|-------------|-------|
| Observatory dashboard (React + Vite + Tailwind, 24h sparkline + event stream + dry-run mod menu) | **Production** (renders against `?demo=1` synthetic; production zero-state surfaces when API returns empty) | shipped |
| Idempotency primitives (`src/lib/idem.ts`, FNV-1a + BigInt + 3-stage Redis keys + 60s cron lock) | **Production** (150 LOC + 9 unit tests passing) | shipped |
| Devvit configuration (`devvit.json`, fetch allowlist, post entry, scheduler tasks, menu items, forms) | **Production** | shipped |
| Hono server routing (`src/index.ts`, `/api/*`, `/internal/*`) | **Production** | shipped |
| `routes/menu.ts` recent-actions menu (opens custom post) | **Production** (handler wired) | shipped |
| `routes/api.ts` `/api/recent` + `/api/stats` | **Scaffolded** (returns `{events:[]}` / `{}` today; live ZRANGE wiring lands Phase 3) | Phase 3 |
| `routes/scheduler.ts` cron handlers (`refresh-config`, `stats-rollup`) | **Scaffolded** (TODO comments; lock-and-log stubs) | Phase 3 |
| `routes/triggers.ts` (`onPostSubmit`, `onCommentSubmit`, `onAppInstall`) | **Scaffolded** (minimal stubs; full pipeline wires Phase 2) | Phase 1+2 |
| `routes/forms.ts` dry-run form result handler | **Scaffolded** (TODO; lands Phase 3) | Phase 3 |
| Rule engine — `handleActivity` → `runRun` → `runCheck` → `runRule` (regex / author / ruleSet) | **Pending** (Vinh's lane; types + schema defined, evaluation code lands Phase 1) | Phase 1 |
| Action handlers (`remove` / `approve` / `lock` / `comment` / `report` / `ban` / `userFlair`) | **Pending** (Phase 2 — Mustache templating + idempotency wrap) | Phase 2 |
| Phase 4 stretch rules (`history`, `attribution`, `recentActivity`, `repost`) | **Deferred** (post-hackathon) | Phase 4 |

See [implementation plan](./docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md) + [`PLAN.md`](./PLAN.md) team-coordination doc for full per-phase scope.

### Observatory dashboard preview

![Observatory dashboard rendered against `?demo=1` synthetic data: stat cards showing 47 actions today, 3h 8m mod time saved, 12 active rules, spam-filter as top rule; 24-hour hourly-actions sparkline; recent moderation events list with action chips (remove, comment, approve, lock); Reload config + Wiki + Docs links at the bottom.](./docs/screenshots/dashboard-desktop.png)

> Captured 2026-05-14 via Playwright against the mock-server-backed `?demo=1` build. Production renders with the same chrome over real `events:recent` ZSET data once Phase 1+2+3 wire-up lands (see Status table above).

## Architecture

```mermaid
flowchart TB
  accTitle: ContextMod Devvit Architecture
  accDescr: Reddit Devvit platform delivers trigger events and cron jobs to a Hono server that runs the rule engine and emits moderation actions back to Reddit while telemetry feeds a React webview dashboard.

  subgraph Platform["Reddit Devvit Platform"]
    direction LR
    TRIG[/"Triggers<br/>onPostSubmit · onCommentSubmit<br/>onAppInstall · onAppUpgrade"/]
    SCHED[/"Scheduler (cron)<br/>refresh-config · stats-rollup<br/>image-hash · delayed-eval"/]
    WIKI[("Wiki API<br/>r/&lt;sub&gt;/wiki/contextmod")]
    REDIS[("Per-sub Redis<br/>strings · hashes · zsets")]
    RAPI{{"Reddit API<br/>remove · approve · ban · flair<br/>comment · lock · report"}}
  end

  subgraph Server["Hono Server (CommonJS)"]
    HA["handleActivity()"]
    CFG[("Config store<br/>cfg:rev:n + cfg:current_rev")]
    PIPE["runRun → runCheck → runRule<br/>filters · named rules · Mustache"]
    IDEM["Idempotency<br/>cm:proc 24h · cm:action:pending 5m<br/>cm:action:done 7d"]
    ACT["Actions"]
    STATS["Stats rollup<br/>events:recent ZSET (50-deep)"]
  end

  subgraph Client["Observatory Webview (React + Vite)"]
    DASH["Dashboard<br/>stat cards · sparkline · event stream"]
  end

  subgraph External["External HTTP (allowlist)"]
    RIMG{{"i.redd.it · preview.redd.it<br/>· external-{preview,i}.redd.it<br/>✓ global allowlist (no approval needed)"}}
  end

  TRIG ==>|"POST /internal/triggers/*"| HA
  SCHED -->|"POST /internal/cron/*"| HA
  SCHED -->|"refresh-config"| CFG
  WIKI -.->|"5-min poll"| CFG
  CFG -.->|"read at event start"| HA
  HA ==> PIPE
  PIPE ==> IDEM
  IDEM ==> ACT
  ACT ==>|"mod action"| RAPI
  ACT --> STATS
  IDEM <-.->|"SET NX"| REDIS
  CFG <-.->|"SET cfg:rev:n"| REDIS
  STATS <-.->|"ZADD"| REDIS
  DASH -->|"GET /api/recent · /api/stats · /api/health"| HA
  PIPE -.->|"fetch (image hash)"| RIMG

  classDef platform fill:#FF4500,stroke:#CC3700,color:#fff
  classDef server fill:#0079D3,stroke:#005FA3,color:#fff
  classDef client fill:#10B981,stroke:#047857,color:#fff
  classDef external fill:#6B7280,stroke:#4B5563,color:#fff
  class TRIG,SCHED,WIKI,REDIS,RAPI platform
  class HA,CFG,PIPE,IDEM,ACT,STATS server
  class DASH client
  class RIMG external
```

**Storage:** Redis only (Devvit-native, per-install isolation, 500MB cap). No external DB. Strings + hashes + sorted sets only — no Lists, no Sets, per Devvit constraints.

**Atomic config publish (Phase 1+3 scaffolded, full wiring pending):** the design is — mod edits wiki → `refresh-config` cron parses + validates → writes immutable `cfg:rev:{n}` → atomically bumps `cfg:current_rev` pointer. Every `handleActivity` reads the pointer once at event start so the entire pipeline runs against a consistent config snapshot — no mid-event tear under concurrent reload. The cron handler (`src/routes/scheduler.ts:20-33`) is a logging stub today; the rev-pointer write lands with Phase 1 (`runRun`) + Phase 3 (`refresh-config` loader).

### Request lifecycle

How a single Reddit trigger flows through the engine end-to-end, including the three-stage idempotency that makes Devvit's at-least-once trigger delivery safe:

```mermaid
sequenceDiagram
  accTitle: handleActivity request lifecycle
  accDescr: The handleActivity pipeline processes a single Reddit trigger end-to-end, gated by three sequential Redis idempotency keys so that retries never double-apply moderation actions.
  autonumber
  participant R as Reddit
  participant T as Devvit Trigger
  participant S as Hono Server
  participant X as Redis
  participant API as Reddit API

  R->>T: post submitted
  T->>S: POST /internal/triggers/post-submit
  S->>X: SET cm:proc:postId NX EX 86400
  alt First time seen
    X-->>S: OK
    S->>X: GET cfg:current_rev → cfg:rev:n
    X-->>S: { schema_version, runs[] }
    Note over S: runRun → runCheck → runRule<br/>filters · named rules · Mustache
    loop For each action queued
      S->>X: SET cm:action:pending:hash NX EX 300
      S->>API: remove · comment · ban · flair · ...
      API-->>S: 200 OK
      S->>X: SET cm:action:done:hash EX 604800
      S->>X: ZADD events:recent score=ts member=event
    end
    S-->>T: 200 OK
  else Retry (already processed)
    X-->>S: nil
    S-->>T: 200 OK (no-op, idempotent)
  end
```

## Config schema

Mod config is JSON5 stored at `r/<your-sub>/wiki/contextmod`. Minimum viable example:

```json5
{
  schema_version: "1",
  runs: [
    {
      name: "main",
      checks: [
        {
          name: "spam-filter",
          condition: "AND",
          rules: [
            { kind: "regex", regex: "free.{0,5}money|crypto.+(giveaway|drop)", testOn: ["title", "body"] },
            { kind: "author", include: [{ age: "< 86400" }] }       // accounts <1d old
          ],
          actions: [
            { kind: "remove", spam: true },
            { kind: "comment", content: "Removed: looks like spam from a fresh account. /u/{{item.author.name}}, modmail us if this was a mistake." }
          ]
        }
      ]
    }
  ]
}
```

**Concept model** (ported faithfully from the original ContextMod):

- **Run** — ordered list of Checks. Supports `postBehavior` (`next` / `nextRun` / `stop` / `goto:<run>.<check>`) for branching workflows.
- **Check** — a group of Rules combined with `AND` or `OR`. When triggered, executes its Actions.
- **Rule** — a single boolean predicate (`regex`, `author`, `history`, `attribution`, `recentActivity`, `repost`, plus composite `ruleSet`). Upstream `mhs` rule cut from Devvit port per PR #96 — see Phase FAQ.
- **Filter** — `authorIs` / `itemIs` clauses that gate Rule/Check/Action execution by author + item attributes.
- **Action** — side-effect (`remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`). Action content supports [Mustache](https://mustache.github.io/) templating with `{{item.*}}`, `{{author.*}}`, `{{rules.<name>.data.*}}` context.
- **Named rules** — declare a rule once with `name:`, reference by string elsewhere — DRY composition.

The canonical AJV schema lands at `src/server/schema/app.schema.json` in Phase 1 (Vinh's lane, finishing Day 5-8). Until then, the original [context-mod docs](https://github.com/FoxxMD/context-mod/tree/master/docs/subreddit-configuration) are the reference — concepts identical, surface trimmed per [migration guide](#migration-guide-for-existing-contextmod-operators).

### Validation behavior + safety story

Every config load runs the JSON5 source through AJV against the schema. Three outcomes:

| Outcome | Behavior | What mods see |
|---------|----------|---------------|
| **Valid JSON5 + schema match** | New revision (`cfg:rev:{n+1}`) is written immutably, then the `cfg:current_rev` pointer is atomically bumped. Every subsequent `handleActivity` reads the new revision. | Observatory event chip: `config loaded · revision N+1`. Mod-menu **Reload config** toast: *"Loaded N+1, X rules active."* |
| **Invalid JSON5 (parser error)** | New revision **NOT** written. `cfg:current_rev` stays pointed at the prior known-good revision. The sub keeps moderating against the prior config. | Observatory event chip: `config rejected · JSON5 parse error at line L col C`. Mod-menu **Reload config** toast: *"Parse failed at L:C — last revision N still active."* |
| **Valid JSON5 + schema violation** | New revision **NOT** written. Same fallback to prior revision. | Observatory event chip: `config rejected · schema: <AJV instance path>: <human reason>` (e.g., `/runs/0/checks/1/rules/0/threshold must be integer, got "1"`). Mod-menu **Reload config** toast carries the same. |

**Safety property:** the sub *never* runs against a broken config. A typo or syntax error in the wiki halts the swap, not moderation — the last known-good revision keeps firing rules until you fix the wiki. No "broken window" between bad save + fix.

This is one of the two reasons the port uses an immutable-revision + atomic-pointer pattern (the other reason is mid-event consistency — `handleActivity` reads the pointer once at event start so the whole pipeline runs against a single revision snapshot, even if a concurrent reload fires).

## Comparison — AutoMod vs original CM vs CM-Devvit

Why does Reddit need a port of CM when AutoMod already exists? Because AutoMod handles a different problem.

| Dimension | AutoModerator | Original CM (PRAW) | **ContextMod-Devvit (this port)** |
|-----------|---------------|--------------------|------------------------------------|
| Hosting | Built into Reddit — no setup | Self-hosted server + Snoowrap + API tokens | Per-subreddit Devvit install, one click |
| Rule composition | Single-pass YAML matchers (regex + simple filters) | Composable named rules + ruleSets (AND/OR) + `postBehavior` flow control | Composable named rules + ruleSets (AND/OR) + `postBehavior` flow control |
| Author-history rules | Age + karma threshold only | Full `author` rule: age, karma, flair, verified, contributor, mod, shadowban, history-window | Full `author` rule + filter system (`authorIs`/`itemIs`) at check level |
| Image-hash repost detection | ❌ | ✅ (perceptual hash via Python image libs) | 🚧 Phase 4 stretch (pure-JS blockhash in Devvit's 30s window — feasibility spike pending) |
| Per-sub data isolation | Shared infrastructure | Operator runs their own instance, isolation depends on hosting | Hard-isolated: each install gets its own Redis namespace, no cross-sub leak |
| Mobile dashboard | ❌ (modmail only) | ❌ (terminal logs / Discord webhooks) | ✅ Observatory custom post — stat cards + sparkline + event stream, renders on mobile webview |
| Config surface | YAML in wiki, single source | JSON5 in wiki + named-rule reuse + Mustache action templating | JSON5 in wiki + named-rule reuse + Mustache action templating |
| Install model | Auto-on for every sub | Operator-managed central server serving N subs | Per-mod-team install — no shared rate limits, no central bottleneck |
| Pricing | Free | Heroku/VPS hosting + dev time | Free (Devvit hosts) — eligible for Reddit's Developer Funds program |
| When to use | High-volume regex spam catches | Context-aware rules requiring history + composition | Same as original CM, without the central-server tax |

**Best-of-both posture:** ContextMod-Devvit doesn't replace AutoMod — both coexist on the same sub. AutoMod handles the fast regex pass; ContextMod handles the *context* part (history, composition, audit trail). Mods of [r/mealtimevideos](https://reddit.com/r/mealtimevideos) (60K weekly visitors) and [r/piercing](https://reddit.com/r/piercing) (600K visitors) already run upstream CM alongside AutoMod for exactly this reason.

## Credits

- **Original bot:** FoxxMD ([github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod)) — MIT License. Used with written permission.
- **Devvit Web template:** Reddit Inc — BSD-3-Clause, see `NOTICES.md`.
- **Devvit port:** Stephen Sookra ([github.com/StephenSook](https://github.com/StephenSook)) — MIT License.

## Fetch Domains

Per [Devvit Rules](https://developers.reddit.com/docs/policies/devvit-rules), every external domain this app contacts is declared in `devvit.json` and listed here with justification + data flow.

| Domain | Status | Why we need it | What data we send | What data we store |
|---|---|---|---|---|
| `i.redd.it` | global allowlist (no approval needed) | Fetch Reddit-hosted image to compute perceptual hash for repost detection. | None (anonymous GET). | 64-bit blockhash + post ID. Never the image bytes. |
| `preview.redd.it` | global allowlist | Same as above for preview-sized Reddit images. | None. | Same. |
| `external-preview.redd.it` | global allowlist | Same for cross-posted previews. | None. | Same. |
| `external-i.redd.it` | global allowlist | Same for cross-posted full-size images. | None. | Same. |

**Privacy commitments:**
- No PII ever transmitted. No usernames, no IPs, no profile data.
- No data sold, shared, or used for training (per our [Privacy Policy](./policies/privacy.md)).
- Image bytes are decoded → hashed → discarded in-process. Only the 64-bit hash is persisted.
- All cached data is per-installation isolated (Devvit Redis) and TTL'd: hashes auto-expire after 30 days, author profile cache 1h, idempotency keys 24h.

## Migration guide for existing ContextMod operators

If you're already running [FoxxMD/context-mod](https://github.com/FoxxMD/context-mod) (Docker/Heroku) you can keep your existing config and migrate progressively.

**Config compatibility:** YAML/JSON5 → JSON5 only. Convert with [`yaml-to-json`](https://www.npmjs.com/package/yaml-to-json) or any online converter. The schema is a strict subset of upstream — see `What's ported vs deferred` below.

**What's ported (rule engine + dashboard ship in v0.1.0):**

The concept model, schema validation, config publish pipeline, idempotency primitives, and Observatory dashboard all ship. Live trigger wiring (`handleActivity` → rule pipeline → mod action) is the Phase 1+2 integration step Vinh is finishing through Day 5-8.

- ✅ `Run` / `Check` / `Rule` / `Action` concept model + `postBehavior` flow control (`next` / `nextRun` / `stop` / `goto:`) — typed + scaffolded
- ✅ Filters: `authorIs` / `itemIs` with the canonical criteria set (name, age, karma, flair, isMod, isContributor, verified, shadowBanned, removed, approved, locked, score, age, title, isSelf, over18, depth, op) — typed + scaffolded
- ✅ Rules: `regex` (with multi-field `testOn` + threshold), `author`, `ruleSet` (AND/OR composition) — types ship; live evaluation lands Phase 1
- ✅ Actions: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair` — types + Mustache templating ship; handler wiring lands Phase 2
- ✅ Named rules + composition by name reference — types ship; resolver lands Phase 1
- ✅ Wiki-based config + 5-min refresh cron + manual `Reload config` menu action — types + Hono routes scaffolded; loader implementation lands Phase 3 (`src/routes/menu.ts:15-20` currently returns a "Phase 3" toast)
- ✅ Per-action idempotency primitives (`cm:proc` 24h + `cm:action:pending` 5m + `cm:action:done` 7d) — `src/lib/idem.ts` shipped
- ✅ Observatory dashboard — renders against `?demo=1` synthetic data; live data wires up at Phase 3

**What's deferred (Phase 4 stretch, not yet shipped):**
- `history`, `attribution`, `recentActivity`, `repost` (URL + image-hash variants) rules — landing in Phase 4. `mhs` rule cut per Phase FAQ.
- `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube — explicitly **cut** (NLP libs don't bundle in Devvit; YouTube API exceeds scope)
- `DispatchAction` — explicitly **cut** (defer-and-replay isn't load-bearing for MVP; defer to v2 if operators ask)

**What's different from upstream:**
- **No central server.** Every mod team installs their own instance — no shared rate limits, no central API token to manage.
- **Per-subreddit Redis isolation.** Your data never leaves your sub. Mod-action history, image hashes, author cache — all scoped per-install by Devvit.
- **Observatory dashboard.** Inline custom post showing mod-action telemetry (last 50 events + 24h sparkline + stat cards). Currently renders with `?demo=1` synthetic data; live wiring lands at Phase 3 after Vinh's Phase 1+2 backend ships.
- **No `wikiLocation` config fragment hydration.** v1 reads one wiki page; `wiki:` + `url:` includes were dropped to simplify the threat model.

**The grandfather case:** if you're FoxxMD or running CM in production with subscribers depending on it, [open an issue](https://github.com/StephenSook/context-mod-devvit/issues) — we'd love to talk about a graceful cutover.

## FAQ

**Do I need to host anything?**
No. Devvit runs the server. You install via the Reddit App Directory, write your rules in your sub's wiki, and that's it.

**Can other mods edit the config?**
Yes — anyone with `wiki` permissions in your sub can edit `/wiki/contextmod`. Standard Reddit wiki access control applies.

**What happens if I edit the wiki and break the config?**
The 5-minute refresh cron validates new config against an AJV JSON Schema. If it fails to parse or validate, the previous `cfg:current_rev` stays active and the error is logged. Your sub stays moderated by the last good config until you fix the wiki page.

**How do I see what ContextMod actually did?**
Open the Observatory dashboard. From the sub overflow menu: **ContextMod: View recent actions**. Shows last 50 events with action chips (REMOVE / APPROVE / COMMENT etc), color-coded by status, with a 24h sparkline of action volume.

**Does it work on iOS / Android?**
The dashboard is mobile-responsive. Devvit custom posts render natively in the Reddit app's webview. Mod menu actions work on web only (per Devvit platform limits today).

**Is this safe to install on my big sub?**
This is hackathon-era MVP code with the trigger pipeline still being wired (Phase 1+2). Stable enough for a private test sub, not yet recommended for high-volume production. Watch the [App Versions page](https://developers.reddit.com/apps/cm-devvit/app-versions) for the v1.0 release.

**Why a separate slug, not `context-mod`?**
Reddit's Devvit App Directory has a 16-character app-name limit. `cm-devvit` is the working slug — leaving `context-mod` open if FoxxMD eventually publishes his own official port.

**Which Phase is this work in?**
Active scope tracked on the [FoxxMD/ContextMod Devvit project board](https://github.com/users/FoxxMD/projects/6). Cards tagged `[P1]`-`[P6]`:
- **P1** — Core engine (`handleActivity`, `runRule`, etc.) — Vinh, Day 5-8
- **P2** — Action handlers + trigger routes — Vinh, Day 5-8
- **P3** — Dashboard wire-up to live data — Stephen, Day 9-11
- **P4** — Stretch rules (`history` / `attribution` / `recentActivity` / `repost`) — Phase 4 stretch
- **P5** — Demo + Devpost submission — Stephen, Day 13-15
- **P6** — Post-hackathon ship + open to upstream operators

The `mhs` rule was cut after `reddit/devvit-docs` PR #96 (2026-05-08) locked the HTTP fetch policy's AI-provider list to OpenAI + Gemini only.

## Install troubleshooting

**The custom post shows a blank white screen.**
Vite's `base` must be `'./'` for the Devvit webview iframe. Verify in `vite.config.ts`. Also confirm `post.dir` in `devvit.json` points at `dist/client` (build output), not `src/client` (source).

**`devvit playtest` says "Unable to authenticate."**
Run `devvit login` and complete the browser flow. Token's cached in your home dir.

**Wiki config fails to validate after editing.**
The AJV schema (lands at `src/server/schema/app.schema.json` in Phase 1) is strict. If the cron's `refresh-config` rejects your JSON5, the previous `cfg:current_rev` stays active and the error is logged. Common gotchas: trailing commas (OK in JSON5), unquoted keys (OK in JSON5), but type mismatches (e.g., `age: "1d"` instead of `age: 86400`) get rejected.

**Devvit upload fails with "name does not meet maximum length of 16".**
`devvit.json:name` must be ≤16 chars. Our slug is `cm-devvit`.

**App icon upload rejected on the Developer Portal.**
The file must be a real PNG, not JPEG bytes inside a `.png` filename. Verify with `file assets/icon.png` — it must report `PNG image data`. If JPEG, re-encode via PIL (see `DESIGN.md` "Assets" section).

**`devvit publish --public` says my domain isn't approved.**
The 4 Reddit hosts (`i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it`) are in the global allowlist. Only third-party domains need explicit approval, which takes up to 4 business days per [Devvit FAQ](https://developers.reddit.com/docs/faq).

## Changelog

### v0.1.0 — Hackathon Day 1-2 (2026-05-12 – 2026-05-13)
- Initial Devvit Web scaffold + custom-post Observatory dashboard
- Per-effect idempotency (5min pending / 7d done) + atomic config publish (`cfg:rev:{n}` + `cfg:current_rev`)
- BigInt FNV-1a for action keys (canonical test vectors verified)
- Liquid-glass UI (Geist + Geist Mono + Instrument Serif italic accents)
- Mod menu wired: View recent actions, Reload config, Test rules
- Privacy Policy + Terms of Service + Fetch Domains table
- CI on every push (type-check + lint + test + build)
- 60+ atomic commits

## License

MIT. See [`LICENSE`](./LICENSE). Citations + third-party attribution in [`NOTICES.md`](./NOTICES.md).
