# E2E Scenarios A–H — ContextMod Devvit Hackathon Submission

> Step 5.3 in PLAN.md. 8 reproducible scenarios judges can replay on the
> demo sub (`r/cm_devvit_test`) to verify each capability end-to-end.
> Each scenario = trigger → expected outcome → verification → screenshot target.

**Demo sub:** `r/cm_devvit_test` (Stephen's playtest sub where live captures G/F/H were taken 2026-05-16). Vinh's parallel dev sub `r/contextmod_vinh_dev` runs the package-renamed `contextmod-vinh` build for backend iteration.
**App version:** v0.6.7 (`cm-devvit@0.6.7`, in Reddit App Directory review; published 2026-05-18). Phase 1 + 2 + 3 + 4 + 4.7 ALL SHIPPED. 828 tests green.
**Prerequisites:** App installed on demo sub + `botconfig/contextmod` wiki page seeded with the hackathon-demo config (covered by Scenario G; first install auto-seeds via `onAppInstall` per Phase 3, now safely behind `dryRun: true` per Polish #28).

> **Note on Screenshot targets:** each scenario lists a `Screenshot target:` filename
> referencing `docs/screenshots/scenario-<letter>-*.png`. These are *target paths* —
> the file Stephen captures via OBS/Cmd-Shift-4 during demo recording (see
> [`docs/screenshots/CAPTURE-CHECKLIST.md`](../screenshots/CAPTURE-CHECKLIST.md)).
> As of 2026-05-19 the captured set is **B/F/G/H** (live on `r/cm_devvit_test`);
> A/C/D/E/I/J are pending Stephen's recording-day pass. Gemini brutal-audit P2-3
> flagged these as "broken cross-refs" but they are filename placeholders, not
> inline image links — the doc is internally consistent, just incomplete at the
> screenshot-set level. Polish #86 added this preamble for clarity.

---

## Scenario A — Regex spam removal (Mustache-templated comment)

**Trigger:** mod-test user submits post titled "free crypto giveaway 🚀"

**Config (in wiki `botconfig/contextmod`):**
```json5
{
  runs: [{
    name: 'spam-removal',
    checks: [{
      name: 'crypto-giveaway',
      combinator: 'OR',
      rules: [{ kind: 'regex', name: 'scam-words', pattern: 'crypto|giveaway', flags: 'i' }],
      actions: [
        { kind: 'remove', isSpam: true },
        { kind: 'comment', template: 'Hi {{author.nameSafe}}, your post "{{item.titleSafe}}" was removed as suspected spam.' },
      ],
    }],
  }],
}
```

**Expected outcome:**
- Post removed within ~3 sec of submission
- Sticky bot comment posted by `u/CowSufficient3840` (or current dev account) with the rendered Mustache template — author/title rendered through `escapeMarkdown` so any `u/` or `r/` pings the spammer included are defanged (no accidental notifications)

**Verification:**
- Open the post permalink — should show `[removed]`
- Read bot comment — verify template values rendered + special chars escaped
- Observatory dashboard ("View recent actions" menu) shows new row: `spam-removal / crypto-giveaway → remove, comment`

**Screenshot target:** `docs/screenshots/scenario-a-spam-removed.png` (post 404 + bot comment overlay)

---

## Scenario B — URL-dedupe repost (dry-run mode)

**Trigger:** mod-test user submits same URL twice within 30d window (e.g. `https://example.com/article`)

**Config:**
```json5
{
  runs: [{
    name: 'repost-watch',
    checks: [{
      name: 'url-dedupe',
      combinator: 'OR',
      rules: [{ kind: 'repost', name: 'url-30d', windowDays: 30 }],
      actions: [{ kind: 'remove', dryRun: true }],  // dry-run until mods watch the feed
    }],
  }],
}
```

**Expected outcome:**
- First submission: no action (writes seen-marker `cm:{sub}:repost:url:{hash}` w/ NX, 30d TTL)
- Second submission: TRIGGER + dry-run remove (no actual Reddit side-effect)
- Codex H7 fix (2026-05-16): SET NX atomic, no GET-then-SET race even on simultaneous submissions

**Verification:**
- First post survives; second post survives BUT Observatory shows a `repost-watch / url-dedupe → remove (dry-run)` entry
- `runAction` returns `{status: 'dry-run', wouldHaveCalled: 'remove'}` so the event row indicates intent without firing

**Screenshot target:** `docs/screenshots/scenario-b-dryrun-repost.png` (dashboard row w/ dry-run chip)

---

## Scenario C — Mod whitelist bypass (authorIs filter)

**Trigger:** existing subreddit mod submits a post titled "free crypto giveaway 🚀" (same trigger as Scenario A)

**Config addition (check-level `filters` wrapper):**
```json5
{
  filters: { authorIs: { isMod: false } },  // check-level filter — current schema wraps under `filters:`
  // ... rules as Scenario A
}
```

**Expected outcome:**
- Spam-removal check pre-filters on `filters.authorIs` BEFORE rule eval (Step 1.4 short-circuit)
- Post is NOT removed (mod is exempt)
- Observatory shows NO new event row

**Verification:**
- Post stays live; no bot comment
- Server log: `[cm/runCheck] crypto-giveaway: pre-filter authorIs failed (isMod), skipping rule eval`

**Screenshot target:** `docs/screenshots/scenario-c-mod-bypass.png` (mod post still up + dashboard empty)

---

## Scenario D — Approved-user bypass

**Trigger:** user added to the sub's approved-contributors list posts a borderline title (matches Scenario A regex)

**Config addition (check-level `filters` wrapper):**
```json5
{ filters: { authorIs: { isContributor: false } } }
```

**Expected outcome:**
- Same short-circuit as Scenario C — approved contributors exempt
- No removal, no bot comment

**Verification:**
- Post stays live
- Server log shows pre-filter exit

**Screenshot target:** `docs/screenshots/scenario-d-approved-bypass.png`

---

## Scenario E — Comment moderation + lock parent

**Trigger:** mod-test user comments on a Scenario-A-removed post with `slur-pattern-here` (real config redacts the regex source)

**Config:**
```json5
{
  runs: [{
    name: 'comment-mod',
    checks: [{
      name: 'banned-phrase',
      combinator: 'OR',
      rules: [{ kind: 'regex', name: 'phrase', pattern: 'slur-pattern-here', flags: 'i' }],
      actions: [
        { kind: 'remove' },
        { kind: 'lock' },  // locks the comment (or parent post if comment.id is parent)
      ],
    }],
  }],
}
```

**Expected outcome:**
- Comment removed + locked
- Observatory shows `comment-mod / banned-phrase → remove, lock`
- Vinh's Phase 2 reality-correction: `lock.ts` routes via `getCommentById` (not on `reddit.lock(thingId)` directly)

**Verification:**
- Comment permalink: `[removed]`
- Locked state visible in mod tools

**Screenshot target:** `docs/screenshots/scenario-e-comment-locked.png`

---

## Scenario F — Dry-run rule tester (Stephen's Step 3.6)

**Trigger:** mod right-clicks an existing suspicious post → menu "ContextMod: Test rules on this item" → form pre-filled with `thingId` → click "Run dry-run"

**Expected outcome:**
- Form submit returns a toast like:
  ```
  Dry-run (rev 3):
  • spam-removal / crypto-giveaway → remove, comment
  ```
- No Reddit side-effects (post stays unchanged, no bot comment added)
- Observatory does NOT show this evaluation (`dryRunActivity` skips ZSET write by design)

**Verification:**
- Post unchanged before + after dry-run
- Observatory has no new row
- Toast bullets match expected rule firings

**Screenshot target:** `docs/screenshots/scenario-f-dryrun-toast.png` (toast overlay on post)

---

## Scenario G — Reload config from wiki

**Trigger:** mod edits `r/{sub}/wiki/botconfig/contextmod` with new JSON5 → menu "ContextMod: Reload config from wiki"

**Expected outcome:**
- Toast: `Loaded N rules (rev M).` where N = sum of rules across all checks across all runs, M = new revision number
- Atomic publish (Vinh's Phase 1.3 D5 pattern): `cfg:rev:{M}` written → `cfg:current_rev` pointer bumped
- `cm:cfgLastWikiRev:{sub}` updated so the 5-min cron knows to short-circuit
- Next post-submit trigger evaluates against the NEW rev (read-once at event start)

**Verification:**
- Toast appears within ~2 sec
- Edit a rule (e.g. add a regex) → reload → re-trigger → see new behavior
- If wiki has parse error: toast = "Config parse failed — check the wiki page for JSON5/schema errors."
- If wiki not found: toast = "Wiki page \"botconfig/contextmod\" not found in r/{sub}. Create it first, then retry."

**Screenshot target:** `docs/screenshots/scenario-g-reload-toast.png`

---

## Scenario H — Observatory dashboard live data

**Trigger:** mod clicks "ContextMod: View recent actions" → Observatory custom post created/navigated → dashboard renders

**Expected outcome:**
- Dashboard renders 4 stat cards (actions today / mod time saved / active rules / top rule), 24h hourly sparkline, recent events list w/ action chips
- Reads from `/api/recent` → `events:recent50` ZSET via `zRange ... reverse: true`
- Events have `v:1` + `nonce` stripped at wire (server-internal)
- Empty state shows starter-config snippet + copy-to-clipboard
- a11y: aria-live polite on event stream, prefers-reduced-motion gate, semantic `<time>` for refreshedAt

**Verification:**
- After running Scenarios A + B + E, dashboard shows 3+ event rows w/ correct rule/action data
- Stat cards animate in (or skip animation if user has reduce-motion set)
- "Reload" button hits `/api/health` round-trip + refetches `/api/recent`

**Screenshot target:** `docs/screenshots/scenario-h-dashboard-live.png` (already captured at `docs/screenshots/dashboard-desktop.png` for `?demo=1`; will re-capture against live data closer to demo)

---

## Scenario I — Image-repost (Phase 4.7, v0.6.0)

**Trigger:** mod-test user submits two posts containing the SAME image (or perceptually-identical resizes) within 30d window. First post seeds the hash; second post triggers.

**Config:**
```json5
{
  dryRun: true, // safety — flip after watching for ~1 day
  runs: [{
    name: 'image-repost-watch',
    checks: [{
      name: 'duplicate-image',
      combinator: 'OR',
      rules: [{ kind: 'imageRepost', name: 'blockhash', hammingThreshold: 8, windowDays: 30 }],
      actions: [{ kind: 'report', reason: 'possible image repost' }],
    }],
  }],
}
```

**Expected outcome:**
- First post: NO trigger (no prior hash). Hash recorded.
- Second post (same image OR a resize / re-encode): triggers — report fires (dry-run shows in dashboard with "would have reported" badge).

**Verification:**
- Observatory dashboard shows `image-repost-watch / duplicate-image → report` row on second submission.
- Pure-JS pipeline (upng-js + jpeg-js + blockhash-core) decodes preview.redd.it variants (320–640px) for ~5MB peak RAM instead of 180MB for full-res 4K.

**Screenshot target:** `docs/screenshots/scenario-i-image-repost.png`

---

## Scenario J — AI rule explainer (Wave V Phase V7)

**Trigger:** mod opens any triggered-event row in the Observatory dashboard + clicks "Explain with AI" button.

**Expected outcome:**
- Loading skeleton + animated 3-dot pulse for ~2–8s while OpenAI gpt-4o-mini responds
- Plain-English 2-sentence explanation renders inline (what triggered + what action fired)
- Second click on the SAME event returns instantly (24h Redis response cache per Tier 1 #151)

**Verification:**
- Click → loading state visible → explanation text appears → role="status" live-region announces for screen readers
- Per-sub rate limit: 30 calls/hr; per-user 10/hr — Pull-Forward #7 closes the "one bad-actor mod burns whole sub's quota" hole
- requireModerator gate: a non-mod hitting `/api/explain-event` directly gets 403 + zero OpenAI cost

**Screenshot target:** `docs/screenshots/scenario-j-ai-explainer.png`

---

## Scenarios cut from MVP

- **MHSRule toxicity** (was 4.2): cut per Reddit PR #96 (HTTP fetch allowlist excludes ModerateHateSpeech). Subs needing hate-speech filtering stay on upstream PRAW.

*(Previously listed as cut but SHIPPED:* image-repost shipped 2026-05-18 as Phase 4.7 v0.6.0 — see Scenario I above. History-based rules shipped in Phase 4 v0.5.x — see `examples/history-fresh-low-karma.json5`, `attribution-drive-by-self-promo.json5`, `recent-activity-cross-sub.json5`.*)*

---

## Capture order for demo video (5.5)

Capture A → G → F → H for the 60s cut. B/C/D/E are screenshots for the README + Devpost writeup. I + J are 90s alt-cut bonus material (Phase 4.7 + AI explainer money shots).

---

_Drafted 2026-05-16 by Stephen. Will capture screenshots + verify live before submission lockdown._
