# Devvit Developer Portal — App Settings Cheat Sheet

> Stephen pastes these into [developers.reddit.com/apps/cm-devvit/settings](https://developers.reddit.com/apps/cm-devvit/settings) before submission. Copy verbatim or edit to taste — every field is drafted in Stephen's voice with no AI-tone words (no "powerful," "sophisticated," "revolutionary").

---

## App identity

| Field | Value |
|-------|-------|
| **App name** | `cm-devvit` (locked — set at upload) |
| **Display name** | `ContextMod` |
| **Tagline** (≤60 chars) | `Rule-engine moderation, ported from PRAW to Devvit.` |
| **Icon** | Upload `assets/icon.png` (256×256) — already in repo |

---

## Descriptions

### Short description (≤140 chars)

```
A rule-engine moderation bot. Write JSON5 rules in your sub's wiki — ContextMod evaluates every post + comment and takes action.
```

### Long description

```
ContextMod is FoxxMD's PRAW-era moderation bot, ported to Devvit with explicit written permission.

Mods write rule configs in JSON5 inside r/<sub>/wiki/contextmod. ContextMod evaluates every new post and comment against those rules and takes the configured action — remove, comment, lock, flair, ban, report, approve. The Observatory dashboard surfaces live action telemetry as a custom post.

Why a port? The original ContextMod requires a self-hosted server + Reddit API tokens + shared rate limits. Devvit's per-subreddit install model removes all three. Every mod team gets its own isolated instance with one click.

What you get on install:
- 3 rule kinds (regex, author, ruleSet) + 7 actions (remove, approve, lock, comment, report, ban, userFlair)
- Filter system (authorIs / itemIs) gating rule execution
- Mustache-templated action messages with full context
- Atomic config publish via revision pointer
- Per-action idempotency (Devvit at-least-once never double-applies)
- Live Observatory dashboard with action stream + 24h sparkline
- Dry-run rule tester via mod menu

Already running in production for 15+ communities including r/mealtimevideos (60K weekly) and r/piercing (600K visitors).
```

---

## Categorization

| Field | Value |
|-------|-------|
| **Primary category** | `Moderation Tools` |
| **Secondary tags** | `automation`, `rule engine`, `spam`, `wiki`, `dashboard` |
| **Intended audience** | Subreddit moderators |
| **Content rating** | `Suitable for everyone` |

---

## Discoverability

| Field | Value | Why |
|-------|-------|-----|
| **Discoverable in App Directory** | `Yes — Public` | Required for hackathon judging |
| **Allow installations from any subreddit** | `Yes` | This is the whole point |
| **Auto-pin to install subreddit** | `No` | Mods choose when to pin the Observatory |

---

## Compliance links

These must be live HTTPS URLs **before** flipping the app to public. See [Track E1 in the Day-2 plan](../superpowers/plans/2026-05-13-day2-followups.md) for the GitHub Pages setup.

| Field | Value |
|-------|-------|
| **Privacy Policy URL** | `https://stephensook.github.io/context-mod-devvit/privacy` |
| **Terms of Service URL** | `https://stephensook.github.io/context-mod-devvit/terms` |
| **Support URL** | `https://github.com/StephenSook/context-mod-devvit/issues` |
| **Source code URL** | `https://github.com/StephenSook/context-mod-devvit` |
| **Contact email** | `stephensookra@gmail.com` |

---

## Permissions (already declared in `devvit.json`)

For reference — these mirror the `permissions` block in `devvit.json` and the Developer Portal surfaces them on the install screen so mods know what they're granting.

| Permission | Scope | Why |
|------------|-------|-----|
| `reddit` | `moderator` | Take mod actions (remove, ban, comment, flair) |
| `redis` | (full) | Per-sub state: config snapshots, idempotency markers, action log, stats rollups |
| `http` | allowlist | `api.moderatehatespeech.com` for the `mhs` rule (Phase 4) + `i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it` for image-hash repost detection |

---

## HTTP fetch domains (already submitted)

The 5 domains in `permissions.http.domains` need to be approved by Reddit before public ship. Current status (per Day-0 submission):

| Domain | Why | Status |
|--------|-----|--------|
| `i.redd.it` | Reddit-hosted post images for blockhash | Pending review |
| `preview.redd.it` | Preview-sized variant | Pending review |
| `external-preview.redd.it` | External-domain preview | Pending review |
| `external-i.redd.it` | Direct external image | Pending review |
| `api.moderatehatespeech.com` | Free hate-speech classifier API | Pending review |

If any domain is rejected, the corresponding feature (image-hash repost detection or `mhs` rule) is downgraded in the submission writeup. Do not lie about feature parity.

---

## Pre-submission verification checklist

Before clicking "Submit for review":

- [ ] Icon uploaded — confirm Reddit shows the green-dot mark in App Directory preview
- [ ] Privacy + ToS URLs return HTTP 200 (curl them manually)
- [ ] Source code URL points to public repo (flip from private — Wave 7)
- [ ] Demo video URL filled in (unlisted YouTube)
- [ ] All 5 HTTP domains either approved OR feature explicitly downgraded in description
- [ ] Original bot username confirmed with FoxxMD (write the exact handle)
- [ ] Tagline + description scanned for AI-tone words ("powerful", "sophisticated", "revolutionary", "amazing", "seamless", "leverage", "robust", "cutting-edge", "intuitive") — none should appear

---

## After submission

- Reddit dev portal review takes 1–7 business days per their docs. Build the buffer into the May 27 deadline.
- If rejected: address feedback, bump minor version (`npx devvit upload --bump minor`), resubmit.
- Pin the latest install to `r/cm_devvit_test` for the demo video.
