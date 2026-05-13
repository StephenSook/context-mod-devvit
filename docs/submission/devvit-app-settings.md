# Devvit Developer Portal — App Settings Cheat Sheet

> **Rewritten 2026-05-13 after Codex+docs review.** The previous draft fabricated most fields (tagline, category dropdown, discoverability toggles, support/source URLs, etc.) that don't exist in Reddit's actual Developer Portal. This version reflects the real surface per `reddit/devvit-docs:docs/guides/launch/launch-guide.md`, `docs/guides/faq.mdx`, and `docs/capabilities/server/http-fetch-policy.md`.

---

## What the Developer Portal actually surfaces

Per the official FAQ (`docs/guides/faq.mdx`):

> You can edit the **display name, about description, and mature flag (18+)** fields in the Developer Portal under **Developer Settings**.

That's the entire editable surface. At [developers.reddit.com/apps/cm-devvit/developer-settings](https://developers.reddit.com/apps/cm-devvit/developer-settings) Stephen will see:

| Field | Value | Notes |
|-------|-------|-------|
| **Display name** | `ContextMod` | Shown in App Directory + install screen. ≤30 chars is a safe bet (Reddit doesn't publish a hard limit). |
| **About description** | (see below) | Single free-text field. No "short / long" split. |
| **Mature (18+)** | `Off` | The app is not 18+. (Mods using it on NSFW subs is a separate setting on their sub.) |
| **Terms & Conditions URL** | `https://stephensook.github.io/context-mod-devvit/terms/` | Required when `permissions.http` is declared (per http-fetch-policy.md). |
| **Privacy Policy URL** | `https://stephensook.github.io/context-mod-devvit/privacy/` | Same. |

### About description (paste verbatim)

```
ContextMod is FoxxMD's rule-engine moderation bot, ported to Devvit with explicit written permission.

Mods write rule configs in JSON5 inside r/<sub>/wiki/contextmod. ContextMod evaluates every new post and comment against those rules and takes the configured action — remove, comment, lock, flair, ban, report, approve. The Observatory dashboard surfaces live action telemetry as a custom post.

Why a port? The original ContextMod requires a self-hosted server + Reddit API tokens + shared rate limits. Devvit's per-subreddit install model removes all three. Every mod team gets its own isolated instance with one click.

Already serving 15+ communities through the upstream PRAW bot — including r/mealtimevideos (60K weekly) and r/piercing (600K visitors).

Full docs + source: https://github.com/StephenSook/context-mod-devvit
```

---

## What does NOT exist in the portal

These were in the previous draft and are wrong — Reddit's Developer Portal has no surface for them. **Delete from your mental model:**

- ~~Tagline (≤60 chars)~~ — not a field
- ~~Short description / Long description split~~ — single "about" field
- ~~Primary category dropdown ("Moderation Tools" etc.)~~ — App Directory grouping is automatic, not a dropdown
- ~~Secondary tags~~ — not a field
- ~~Intended audience / Content rating~~ — not fields (only the 18+ flag exists)
- ~~"Discoverable in App Directory" toggle~~ — listing is the `--public` CLI flag on publish, not a UI toggle
- ~~"Allow installations from any subreddit" toggle~~ — not a field; public apps install anywhere by default
- ~~"Auto-pin to install subreddit" toggle~~ — not a field
- ~~Support URL / Source code URL / Contact email fields~~ — these live in `README.md`, not in any portal field

---

## README.md is load-bearing

Per `docs/guides/launch/launch-guide.md`:

> "Publicly listed apps must include a detailed `README.md` with a comprehensive app overview, installer-facing instructions, and changelogs."

The README is the *real* "long description" surface for the App Directory. Reddit's listing page shows the README inline. Our README is already polished as of Day 2 Track A (hero, quick-start, architecture, config schema, fetch domains, migration guide, FAQ, changelog).

---

## Listing the app (the actual mechanism)

To make the app appear in the public App Directory:

```bash
npx devvit publish --public
```

The `--public` flag toggles App Directory visibility. Without it the app is unlisted (still installable via direct URL but not in search). Reddit reviews the publish; outcome shows in the dashboard.

There is no UI toggle for this. The CLI flag is the toggle.

---

## HTTP fetch domains — the real story

The previous draft listed 5 domains as "Pending review." Per `docs/capabilities/server/http-fetch-policy.md`, that's mostly wrong:

| Domain | Category | Actual status | Action |
|--------|----------|---------------|--------|
| `i.redd.it` | Reddit-controlled | ✅ Global allowlist — no approval needed | none |
| `preview.redd.it` | Reddit-controlled | ✅ Global allowlist — no approval needed | none |
| `external-preview.redd.it` | Reddit-controlled | ✅ Global allowlist — no approval needed | none |
| `external-i.redd.it` | Reddit-controlled | ✅ Global allowlist — no approval needed | none |
| `api.moderatehatespeech.com` | **Personal domain** | ⚠️ "Will not be approved" without strong justification | ⚠️ **High risk** — see below |

**The four Reddit-owned domains don't need approval at all.** They can come out of the "submitted Day 0" mental model.

**The `api.moderatehatespeech.com` domain is at high risk of rejection.** Reddit's policy on "personal" or hobbyist endpoints is strict — only well-known third-party APIs get through. If it's rejected, the `mhs` rule (Phase 4 stretch) cannot ship on Devvit and must be marked as not-yet-available in the submission writeup. The decision tree:

1. Domain approved → MHS rule ships in Phase 4
2. Domain rejected → MHS rule documented as "out of scope for the Devvit port; available in upstream CM" in `docs/submission/writeup-draft.md` Section 3 "Gaps vs upstream"

Either outcome is honest. Do not invent a workaround.

Approved-domain status is visible in the Developer Settings page (display-only list — not editable from the UI). Approval timeline per docs: up to 4 business days, independent of the app review timeline.

---

## Permissions reference (already in `devvit.json`)

These are surfaced on the install screen so mods see what they're granting:

| Permission | Scope | Why |
|------------|-------|-----|
| `reddit` | `moderator` | Take mod actions (remove, ban, comment, flair) |
| `redis` | full | Per-sub state: config snapshots, idempotency markers, action log, stats rollups |
| `http` | allowlist (5 domains) | Image-hash repost detection + MHS rule (Phase 4) |

No edits needed in the portal — these come from `devvit.json` at publish time.

---

## Pre-submission verification checklist

Before clicking "Publish" in the portal:

- [ ] `assets/icon.png` is a real PNG (re-encoded after icon-was-JPEG bug — see commit 67127bc)
- [ ] Privacy + ToS URLs both return HTTP 200 (verified 2026-05-13: ✅)
- [ ] Repo is public (verified 2026-05-13: ✅)
- [ ] Demo video URL filled in (unlisted YouTube)
- [ ] `api.moderatehatespeech.com` approval status decided — ship MHS or document as gap
- [ ] FoxxMD has confirmed which bot username goes in "Original bot" field
- [ ] About description scanned for AI-tone words (`powerful`, `sophisticated`, `revolutionary`, `seamless`, `leverage`, `robust`, `cutting-edge`, `intuitive`) <!-- AITONE_IGNORE -->
- [ ] README.md final pass — this is the App Directory's "long description"

---

## After publish

- Reddit's review timeline is "a few business days" (no published SLA). Build the buffer into the May 27 deadline.
- If rejected: fix the noted issue, bump minor (`npx devvit upload --bump minor`), resubmit.
- Pin the latest install to `r/cm_devvit_test` for the demo recording.

---

## Sources

- [`reddit/devvit-docs:docs/guides/launch/launch-guide.md`](https://developers.reddit.com/docs/launch/launch-guide)
- [`reddit/devvit-docs:docs/guides/faq.mdx`](https://developers.reddit.com/docs/faq)
- [`reddit/devvit-docs:docs/capabilities/server/http-fetch-policy.md`](https://developers.reddit.com/docs/capabilities/server/http-fetch-policy)
