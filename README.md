# context-mod-devvit

> **A rule-engine moderation co-pilot for Reddit subreddits, running natively on Devvit.**
> Write your moderation rules once in JSON5. ContextMod reads every new post and comment, evaluates your filters, and takes the right action — remove, comment, lock, flair, ban — without you ever opening the modqueue.

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

1. **Install** — Visit [developers.reddit.com/apps/cm-devvit](https://developers.reddit.com/apps/cm-devvit) and click **Add to community**, then pick your subreddit (you must be a mod with `posts` + `wiki` permissions).
2. **Pin the dashboard** — In your sub's mod overflow menu, click **ContextMod: View recent actions**. A custom post appears that shows live mod-action telemetry. Stickying it is optional but recommended.
3. **Write your rules** — Create `r/<your-sub>/wiki/contextmod` with JSON5 config. A starter config is seeded on install; edit it to taste. See [Config schema](#config-schema) for the full surface.
4. **Reload** — In the subreddit mod overflow, click **ContextMod: Reload config from wiki** (or wait 5 minutes — the app polls automatically). The Observatory dashboard shows the rule count + actions taken in near-real-time.
5. **Test a rule** — Right-click any post or comment, choose **ContextMod: Test rules on this item**. A dry-run shows which rules would fire without taking action.

> **No hosting. No tokens. No central bottleneck.** Everything lives inside your subreddit's Devvit installation.

## Status

**Hackathon-era MVP.** Active development; expect rough edges. See [implementation plan](./docs/superpowers/plans/2026-05-12-contextmod-devvit-port.md) for what's in scope.

## Architecture

```
                  Reddit subreddit
                         │
   ┌─────────────────────┼─────────────────────┐
   │                     │                     │
   ▼                     ▼                     ▼
onPostSubmit       onCommentSubmit       onModAction
   │                     │                     │
   └──────────┬──────────┴──────────────┬──────┘
              ▼                         ▼
        Hono server                 ┌────────────────┐
        (Node.js,                   │  Mod menu:     │
         CommonJS)                  │  /reload-config│
              │                     │  /test-rules   │
              ▼                     │  /recent-actions
        firstSeen                   └────────┬───────┘
        (24h Redis SETNX,                    ▼
         fail-closed)              Observatory dashboard
              │                    (Vite + React, custom
              ▼                     post webview)
   Load cfg:current_rev → cfg:rev:{n} from Redis
              │
              ▼
       Run → Check → Rule → Action pipeline
        │
        ├─ filters (authorIs, itemIs)
        ├─ named rules + composition
        ├─ Mustache action templating
        └─ per-action idempotency (reserve → side-effect → commit)
              │
              ▼
        reddit.{remove, approve, lock, comment, report, ban, setUserFlair}
              │
              ▼
        Push compact event → events:recent ZSET (50-deep ring buffer)
              │
              ▼
        Dashboard polls /api/recent every 10s → renders timeline
```

**Storage:** Redis only (Devvit-native, per-install isolation, 500MB cap). No external DB, no Lists, no Sets — strings + hashes + sorted sets only.

**Atomic config publish:** mod edits wiki → `refresh-config` cron parses + validates → writes immutable `cfg:rev:{n}` → atomically bumps `cfg:current_rev` pointer. Every handleActivity reads the pointer ONCE at event start so the entire pipeline runs against a consistent config snapshot.

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
- **Rule** — a single boolean predicate (`regex`, `author`, `history`, `attribution`, `recentActivity`, `repost`, `mhs`, plus composite `ruleSet`).
- **Filter** — `authorIs` / `itemIs` clauses that gate Rule/Check/Action execution by author + item attributes.
- **Action** — side-effect (`remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair`). Action content supports [Mustache](https://mustache.github.io/) templating with `{{item.*}}`, `{{author.*}}`, `{{rules.<name>.data.*}}` context.
- **Named rules** — declare a rule once with `name:`, reference by string elsewhere — DRY composition.

See [`src/server/schema/app.schema.json`](./src/server/schema/app.schema.json) for the canonical AJV schema, or the original [context-mod docs](https://github.com/FoxxMD/context-mod/tree/master/docs/subreddit-configuration) for an exhaustive reference (concepts identical, surface trimmed).

## Credits

- **Original bot:** FoxxMD ([github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod)) — MIT License. Used with written permission.
- **Devvit Web template:** Reddit Inc — BSD-3-Clause, see `NOTICES.md`.
- **Devvit port:** Stephen Sookra ([github.com/StephenSook](https://github.com/StephenSook)) — MIT License.

## Fetch Domains

Per [Devvit Rules](https://developers.reddit.com/docs/policies/devvit-rules), every external domain this app contacts is declared in `devvit.json` and listed here with justification + data flow.

| Domain | Status | Why we need it | What data we send | What data we store |
|---|---|---|---|---|
| `api.moderatehatespeech.com` | declared | Toxicity classification (`MHSRule`, port of CM's classifier rule). Only triggered when a mod enables the rule in their config. | Comment/post text, no PII. | Boolean `flagged` + numeric `confidence` (~kb-sized JSON). Never the original text. |
| `i.redd.it` | pending approval | Fetch Reddit-hosted image to compute perceptual hash for repost detection. | None (anonymous GET). | 64-bit blockhash + post ID. Never the image bytes. |
| `preview.redd.it` | pending approval | Same as above for preview-sized Reddit images. | None. | Same. |
| `external-preview.redd.it` | pending approval | Same for cross-posted previews. | None. | Same. |
| `external-i.redd.it` | pending approval | Same for cross-posted full-size images. | None. | Same. |

**Privacy commitments:**
- No PII ever transmitted. No usernames, no IPs, no profile data.
- No data sold, shared, or used for training (per our [Privacy Policy](./policies/privacy.md)).
- Image bytes are decoded → hashed → discarded in-process. Only the 64-bit hash is persisted.
- All cached data is per-installation isolated (Devvit Redis) and TTL'd: hashes auto-expire after 30 days, author profile cache 1h, idempotency keys 24h.

## Migration guide for existing ContextMod operators

If you're already running [FoxxMD/context-mod](https://github.com/FoxxMD/context-mod) (Docker/Heroku) you can keep your existing config and migrate progressively.

**Config compatibility:** YAML/JSON5 → JSON5 only. Convert with [`yaml-to-json`](https://www.npmjs.com/package/yaml-to-json) or any online converter. The schema is a strict subset of upstream — see `What's ported vs deferred` below.

**What's ported (works today):**
- `Run` / `Check` / `Rule` / `Action` concept model + `postBehavior` flow control (`next` / `nextRun` / `stop` / `goto:`)
- Filters: `authorIs` / `itemIs` with the canonical criteria set (name, age, karma, flair, isMod, isContributor, verified, shadowBanned, removed, approved, locked, score, age, title, isSelf, over18, depth, op)
- Rules: `regex` (with multi-field `testOn` + threshold), `author`, `ruleSet` (AND/OR composition)
- Actions: `remove`, `approve`, `lock`, `comment`, `report`, `ban`, `userFlair` — all support Mustache templates over `{{item, author, manager, rules, actions}}` context
- Named rules + composition by name reference
- Wiki-based config + 5-min refresh cron + manual `Reload config` menu action
- Per-action idempotency (pending/done split — never double-applies the same action even on Devvit's at-least-once trigger delivery)

**What's deferred (Phase 4 stretch, not yet shipped):**
- `history`, `attribution`, `recentActivity`, `repost` (URL + image-hash variants), `mhs` rules — landing in Phase 4
- `RepeatActivityRule`, `SentimentRule`, full `RepostRule` w/ YouTube — explicitly **cut** (NLP libs don't bundle in Devvit; YouTube API exceeds scope)
- `DispatchAction` — explicitly **cut** (defer-and-replay was low-leverage for hackathon scope)

**What's different from upstream:**
- **No central server.** Every mod team installs their own instance — no shared rate limits, no central API token to manage.
- **Per-subreddit Redis isolation.** Your data never leaves your sub. Mod-action history, image hashes, author cache — all scoped per-install by Devvit.
- **Observatory dashboard.** Inline custom post showing live action telemetry (last 50 events + 24h sparkline + stat cards).
- **No `wikiLocation` config fragment hydration.** v1 reads one wiki page; `wiki:` + `url:` includes were dropped to simplify the threat model.

**The grandfather case:** if you're FoxxMD or running CM in production with subscribers depending on it, [open an issue](https://github.com/StephenSook/context-mod-devvit/issues) — we'd love to talk about a graceful cutover.

## License
