# HTTP Fetch Domain Approval — Runbook

> **Status update 2026-05-13:** `api.moderatehatespeech.com` was proactively dropped from `devvit.json` permissions (commit `c2d2865`) after `reddit/devvit-docs` PR #96 (2026-05-08) locked the HTTP fetch policy's AI-provider allowlist to OpenAI + Gemini only. The `mhs` rule is cut from the Devvit port per CHANGELOG + writeup-draft. **No outstanding domain-approval request remains for ContextMod.** This runbook is kept as a general-purpose reference for any future domain additions.

> Original framing (kept for reference): 5-minute Stephen-side check + decision tree for `api.moderatehatespeech.com`. Run this once per week and on submission day.

## Background

Per [`devvit-docs:docs/capabilities/server/http-fetch-policy.md`](https://developers.reddit.com/docs/capabilities/server/http-fetch-policy):

- **Reddit-owned hosts are in the global allowlist.** No approval needed for `i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it`. ✅ ContextMod's image-hash repost detection can use these without any per-domain submission.
- **Third-party APIs need explicit approval.** Submit via `devvit.json` `permissions.http.domains`; Reddit reviews up to 4 business days.
- **"Personal domains" are policy-flagged.** Reddit's stated stance: "Will not be approved" without strong justification — only well-known third-party APIs typically clear the bar.

The only domain in our `devvit.json` that needs review is `api.moderatehatespeech.com`. The four Reddit hosts in the same block are technically redundant (already globally allowed) but harmless to keep listed.

## The 5-minute check

1. Sign in to Reddit as the app-owner account (`u/CowSufficient3840`).
2. Open https://developers.reddit.com/apps/cm-devvit/developer-settings.
3. Scroll to the **Approved fetch domains** section (display-only list of what Reddit has approved).
4. Note current status of `api.moderatehatespeech.com`:
   - ✅ **Listed in approved domains** → MHS rule ships in Phase 4.
   - ⏳ **Not yet listed, no rejection** → still under review; check again in 24-48h.
   - ❌ **Rejected (notification in dashboard or email)** → execute decision tree below.
5. Note status of the four Reddit hosts:
   - These should NOT need approval. If they appear in the approved list, great. If they're missing but `i.redd.it` HTTP fetches work fine in the running app, ignore — global allowlist trumps the per-app list.

## Decision tree — if `api.moderatehatespeech.com` is rejected

### Step 1 — Remove from `devvit.json`

Edit `devvit.json`, drop `api.moderatehatespeech.com` from `permissions.http.domains`. Keep the four Reddit hosts (harmless).

```diff
 "permissions": {
   "http": {
     "enable": true,
     "domains": [
-      "api.moderatehatespeech.com",
       "i.redd.it",
       "preview.redd.it",
       "external-preview.redd.it",
       "external-i.redd.it"
     ]
   }
 }
```

### Step 2 — Mark MHS rule as upstream-only

In `docs/submission/writeup-draft.md` Section 3 "Gaps vs upstream (deferred to Phase 4)" → move `mhs` to "Gaps vs upstream (explicitly cut)" with rationale:

> `mhs` (ModerateHateSpeech toxicity classifier) — explicitly cut. Reddit's HTTP fetch policy rejected `api.moderatehatespeech.com` as a personal-domain endpoint without a strong justification path. Available in upstream ContextMod's PRAW build; not available in the Devvit port. Documented honestly rather than worked around.

### Step 3 — Update Phase 4 commitments

In the Day-2 plan and the README "Phase 4 stretch" section, replace `mhs` with "(removed)".

### Step 4 — Re-bump app version + republish

```bash
npx devvit upload --bump minor
```

The next playtest + publish cycle picks up the trimmed permissions.

### Step 5 — Update the Devpost writeup Built-with section

Remove "ModerateHateSpeech" if it was listed.

## Decision tree — if approval drags past 2026-05-20 (1 week before deadline)

Treat as effective rejection. Execute Steps 1-5 above. Submission integrity > waiting on a maybe.

## When to re-check

- Every Monday + Thursday morning until the deadline
- Once on submission day (2026-05-27 morning Pacific)
- After any `devvit publish` operation (review may re-trigger)

## Source

[Devvit HTTP fetch policy doc](https://developers.reddit.com/docs/capabilities/server/http-fetch-policy)
