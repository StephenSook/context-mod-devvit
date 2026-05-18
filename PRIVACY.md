# Privacy — context-mod-devvit

## What we collect

ContextMod runs inside the Devvit per-subreddit install model. Every install is isolated from every other install — there is no shared backend.

**Per-install Redis (max 500MB, per-sub isolated by Devvit):**

| Key pattern | What's stored | Why | TTL |
|-------------|---------------|-----|-----|
| `cm:<sub>:cfg:rev:<n>` | Wiki config payload per rev (JSON5) | Immutable audit trail of rule changes | none (unbounded — see [data-retention.md](./data-retention.md)) |
| `cm:<sub>:cfg:current_rev` | Pointer to current rev | Atomic publish gate | none |
| `cm:<sub>:cfg:rev-counter` | INCR counter for rev allocation | Race-free rev numbering | none |
| `cm:<sub>:cfg:last-wiki-rev` | Last seen wiki revision ID | Cron skip-when-unchanged | none |
| `cm:<sub>:events:recent50` | Last 50 moderation events (ZSET) | Dashboard render | bounded ring (50) |
| `cm:mod-activity:<sub>` | Last 50 mod-menu actions (actor + ts + kind) | Activity feed | bounded ring (50) |
| `cm:muted-rules:<sub>` | Mod-muted rule keys (hash) | Dashboard filter state | none |
| `cm:openai-key:<sub>` | OpenAI API key (set via mod menu) | AI explain features | none (manual delete) |
| `cm:proc:<thingId>` | Idempotency NX guard | Prevent double-fire on retry | 24 hours |
| `cm:action:pending:<hash>` | Lease owner token | Prevent race during action execution | 5 minutes |
| `cm:action:done:<hash>` | Completed-action marker | Prevent replay | 7 days |
| `cm:lock:<task>` | Cron single-flight lock | Prevent overlapping cron runs | 60 seconds |
| `cm:rl:<bucket>:<sub>` | Rate-limit counter | Cost control for OpenAI calls | 1 hour |
| `cm:schema-version` | Migration version stamp | Schema migration gate | none |
| `cm:install:<id>:subname` | Install → sub mapping | Cron context resolution | none |

**Sent to external services:**

- `api.openai.com` — tight event-summary metadata when a mod clicks "Explain with AI" (or "Explain a rule with AI"). What's sent: rule names, check names, matched substring (capped 200 chars), action kinds + statuses. What's NOT sent: post body, comment body, author username, post URL.

**NOT collected:**

- Post/comment content (engine reads them transiently for matching; never stored)
- Author usernames in storage (referenced only in transient event objects)
- IP addresses
- Browser fingerprints
- Analytics/telemetry to any third party
- Cookies (custom-post webview is hosted by Devvit; we set no cookies)

## Where it lives

Devvit isolates Redis per-install. r/cm_devvit_test's data is unreachable from r/contextmod_other_sub's install. Only the mods of the installed sub can read or write — and only via Devvit's authenticated mod menu / dashboard.

Source location of every storage write: see [`src/state/keys.ts`](./src/state/keys.ts) for the centralized key schema.

## Deletion

When ContextMod is uninstalled from a subreddit, Devvit reclaims the entire per-install Redis namespace. There is no copy elsewhere.

To manually wipe the OpenAI key without uninstalling: future mod-menu entry **ContextMod: Delete OpenAI API key** (tracked, post-hackathon). For now: uninstall + reinstall the app.

To wipe mod activity log: not a current mod-menu action. The 50-deep ring buffer caps storage; old entries naturally drop off.

## Third-party data sharing

We share with OpenAI only when a mod explicitly clicks an AI explain button. The OpenAI request includes the rule + event metadata described above. We use the `gpt-4o-mini` model with `max_tokens: 160-240` (cost discipline). See OpenAI's data usage policy for how they handle requests from API consumers: <https://openai.com/policies/api-data-usage-policies>.

We share with no other third parties.

## Reddit's data, Reddit's rules

ContextMod runs on Reddit's Devvit platform inside your subreddit. Reddit's own privacy policy + Devvit terms govern the platform itself: <https://www.redditinc.com/policies/privacy-policy>.

## Contact

Privacy questions, deletion requests, or security disclosures: see [`SECURITY.md`](./SECURITY.md).
