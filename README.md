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

## Credits

- **Original bot:** FoxxMD ([github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod)) — MIT License. Used with written permission.
- **Devvit Web template:** Reddit Inc — BSD-3-Clause, see `NOTICES.md`.
- **Devvit port:** Stephen Sookra ([github.com/StephenSook](https://github.com/StephenSook)) — MIT License.

## Fetch Domains

Per Devvit policy, this app fetches the following external domains:

- `api.moderatehatespeech.com` — toxicity classification used by MHSRule (port of CM's MHSRule)
- `i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it` — Reddit-hosted image fetch for perceptual-hash (blockhash) repost detection

## License

MIT. See `LICENSE`.
