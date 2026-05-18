# Data retention — context-mod-devvit

All storage lives in Devvit per-install Redis (500MB cap per install). This document maps every key prefix to its retention policy.

## Bounded-time keys (auto-expire)

| Key | TTL | Why |
|-----|-----|-----|
| `cm:proc:<thingId>` | 24h | Trigger idempotency — covers max plausible Devvit retry window |
| `cm:action:pending:<hash>` | 5min | Lease lock — long enough to ride out transient blip, short enough that crash-mid-action retries quickly |
| `cm:action:done:<hash>` | 7d | Completed-action marker — long enough to lock out replays from the slowest plausible Reddit delivery |
| `cm:lock:<task>` | 60s | Cron single-flight — caps re-acquire delay |
| `cm:rl:<bucket>:<sub>` | 1h | Rate-limit window for OpenAI calls — resets hourly |

## Bounded-size keys (ring buffer)

| Key | Size cap | Mechanism |
|-----|----------|-----------|
| `cm:<sub>:events:recent50` | 50 entries | `ZREMRANGEBYRANK 0 -51` on every write |
| `cm:mod-activity:<sub>` | 50 entries | Same trim pattern |

## Unbounded keys (intentional)

| Key | Why unbounded | Practical bound |
|-----|---------------|-----------------|
| `cm:<sub>:cfg:rev:<n>` | Immutable audit trail of rule history; mods need to diff old revs | ~1KB per revision × 500K revs to fill 500MB |
| `cm:<sub>:cfg:current_rev` | Single pointer | bytes |
| `cm:<sub>:cfg:rev-counter` | Single counter | bytes |
| `cm:<sub>:cfg:last-wiki-rev` | Single revision ID | bytes |
| `cm:muted-rules:<sub>` | Hash, one field per muted rule. Mods rarely mute >50 rules | KB |
| `cm:openai-key:<sub>` | Single string. Mod overwrites when rotating | bytes |
| `cm:schema-version` | Single migration stamp | bytes |
| `cm:install:<id>:subname` | Install → sub mapping | bytes |

## Future cleanup tasks (post-hackathon)

- **rev-trim policy**: optional `cm:<sub>:cfg:rev-trim-after` setting; cron deletes rev:N older than N days. Currently unbounded by design (audit trail), but ops teams running large subs may want to cap.
- **Manual OpenAI key delete**: mod-menu action **ContextMod: Delete OpenAI API key** (sets cm:openai-key:`<sub>` to "").
- **Mod-activity export**: mod-menu action **Export activity log** → CSV download for compliance records.

## Uninstall

When ContextMod is uninstalled, Devvit reclaims the entire per-install Redis namespace. Nothing persists in any other location.

See [PRIVACY.md](./PRIVACY.md) for what's collected + where it goes.
