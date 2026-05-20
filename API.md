# API reference — context-mod-devvit

All client-facing endpoints. Internal endpoints (`/internal/triggers/*`, `/internal/cron/*`, `/internal/menu/*`, `/internal/form/*`) are invoked by the Devvit platform — not documented here.

## Auth model

| Endpoint class | Who can call |
|----------------|--------------|
| `GET /api/recent` `GET /api/muted-rules` `GET /api/stats` `GET /api/health` | Any authenticated Reddit user viewing the dashboard custom post |
| `GET /api/mod-activity` `GET /api/config-history` | **Moderators only** (W2 mod-data leak fix) |
| `POST /api/mute-rule` `POST /api/unmute-rule` `POST /api/explain-event` | **Moderators only** (W1 mutation gate) |

Non-mod callers get `403 not a moderator of this sub`. Auth-check exceptions return `500 mod check failed: <reason>` (fail-CLOSED).

Demo mode: any GET endpoint accepts `?demo=1` to bypass auth + serve synthetic fixtures from `src/lib/demo-fixtures.ts`. Used for screenshots + local dev. Fabricated data never auto-shows in production.

---

## `GET /api/recent`

Returns the last 50 moderation events for the current subreddit.

**Auth:** open (dashboard render).

**Response 200:**

```json
{
  "events": [
    {
      "ts": 1747526400000,
      "activityId": "t3_abc123",
      "runName": "spam-removal",
      "checkName": "crypto-giveaway",
      "triggered": true,
      "actions": [
        { "kind": "remove", "ok": true, "status": "ok" },
        { "kind": "comment", "ok": true, "status": "ok" }
      ]
    }
  ]
}
```

**Response 503** (X3 — Reddit context unavailable):

```json
{ "error": "subreddit context unavailable: <reason>", "events": [] }
```

---

## `GET /api/stats`

Aggregate counters for the dashboard stat cards.

**Auth:** open.

**Response 200:** `{ "counters": { actionsToday, timeSavedMin, activeRules, topRule, hourlyActions24h, ... } }` — production reads the hourly stats-rollup snapshot at `cm:stats:snapshot:{sub}` written by the `stats-rollup` cron (`src/state/statsRollup.ts`), falling back to compute-on-fly when the snapshot is absent (fresh install, post-clear). Polish #38 added the client-shape fields the Observatory dashboard reads (`actionsToday` / `timeSavedMin` / `activeRules` / `topRule` / `hourlyActions24h`) — the prior server-only shape (`total`/`lastHour`/`today`) never landed in the dashboard. Demo returns the seeded `DEMO_STATS` fixture.

---

## `GET /api/health`

Liveness probe. Returns app version + server timestamp without hitting Redis.

**Auth:** open.

**Response 200:**

```json
{
  "ok": true,
  "name": "cm-devvit",
  "version": "0.5.1",
  "ts": 1747526400000
}
```

---

## `GET /api/muted-rules`

Returns the array of rule keys currently muted by mods.

**Auth:** open.

**Response 200:** `{ "muted": ["spam-removal/crypto-giveaway", ...] }`

**Response 500** on infra failure: `{ "error": "<reason>" }`

---

## `GET /api/config-history`

Returns the last N (default 10, max 50) published config revisions.

**Auth:** moderators only.

**Query:** `?limit=10`

**Response 200:**

```json
{
  "revs": [
    { "rev": 3, "config": { "runs": [...] } },
    { "rev": 2, "config": { "runs": [...] } }
  ]
}
```

**Response 403** non-mod: `{ "error": "not a moderator of this sub", "revs": [] }`

---

## `GET /api/mod-activity`

Returns the mod activity feed (last 50 mod-menu actions).

**Auth:** moderators only.

**Response 200:**

```json
{
  "activity": [
    { "ts": 1747526400000, "actor": "mod_alice", "kind": "reload-config", "detail": "5 rules @ rev 3" }
  ]
}
```

**Response 403** non-mod: `{ "error": "not a moderator of this sub", "activity": [] }`

---

## `POST /api/mute-rule`

Mute a rule sub-wide (dashboard-side filter; backend rules still fire — soft mute).

**Auth:** moderators only.

**Request body:** `{ "runName": "spam-removal", "checkName": "crypto-giveaway" }`

**Response 200:** `{ "ok": true }`

**Response 400:** `{ "ok": false, "error": "runName + checkName required" }`

**Response 403:** `{ "ok": false, "error": "not a moderator of this sub" }`

**Response 500:** `{ "ok": false, "error": "<infra reason>" }`

Side effect: writes the muted entry + appends a `mute-rule` row to `cm:mod-activity:<sub>` with `actor: auth.username` (NOT request body — W8 log-spoofing defense).

---

## `POST /api/unmute-rule`

Inverse of `/api/mute-rule`.

**Auth:** moderators only.

**Request + response shapes:** same as mute-rule.

---

## `POST /api/explain-event`

AI-generated 2-sentence summary of why an event fired, via OpenAI `gpt-4o-mini`.

**Auth:** moderators only (OpenAI quota protection).

**Request body:**

```json
{
  "event": {
    "runName": "spam-removal",
    "checkName": "crypto-giveaway",
    "matchedRule": "scam-words",
    "matchedSubstring": "crypto",
    "actions": [{ "kind": "remove", "ok": true, "status": "ok" }]
  }
}
```

**Validation (X1 — pre-rate-limit, pre-OpenAI):**
- Every string field capped at 200 chars
- `actions` array capped at 20 items
- Any string containing the reserved `<<<USER_DATA>>>` delimiter is rejected (prompt-injection defense)

**Response 200:** `{ "ok": true, "explanation": "<2-sentence plain English>" }`

**Response 400:** `{ "ok": false, "error": "<validation reason>" }`

**Response 403:** `{ "ok": false, "error": "not a moderator of this sub" }`

**Response 429** (X1 rate limit — 30 calls/hour/sub):
```json
{ "ok": false, "error": "Rate limit: 31/30 calls this hour. Try again in ~45min." }
```

**Response 500:** `{ "ok": false, "error": "Explain failed: <reason>" }`

Key resolution order: Redis `cm:openai-key:<sub>` → Devvit `openai_api_key` setting → empty string (which fails immediately with "API key missing").

Timeout: 30s (X1 AbortController). Returns "OpenAI request timed out after 30s" if exceeded.

---

## Test the live endpoints

```bash
# Dashboard view (works without install via dev:web mode):
curl http://localhost:5173/api/recent?demo=1 | jq

# Auth-gated endpoints fail in demo mode with the demo bypass:
curl http://localhost:5173/api/mod-activity?demo=1 | jq

# In a real install, these surface 403 + an empty array for non-mods.
```

---

## See also

- [`src/routes/api.ts`](./src/routes/api.ts) — implementation
- [`src/lib/requireModerator.ts`](./src/lib/requireModerator.ts) — auth gate
- [`src/lib/ratelimit.ts`](./src/lib/ratelimit.ts) — rate-limit token bucket
- [THREAT-MODEL.md](./THREAT-MODEL.md) — security model for each endpoint
