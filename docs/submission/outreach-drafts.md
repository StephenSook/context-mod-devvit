# Outreach Drafts

> Stephen sends every one of these in his own voice (per the Watchful1 AI-tone lesson). These drafts are starting points — rewrite at least one phrase per message so it doesn't sound copy-pasted. **AI does not send these.**

---

## 1. FoxxMD — ping #2 (Discord DM)

**Context:** Already got permission to port (issue #152). Need two things before submission: (a) confirm the bot username for Devpost's "Original Bot" field, (b) a 1-2 sentence quote we can use in the submission writeup.

**Suggested send time:** 2026-05-15 (gives him 12 days to reply before deadline).

```
hey FoxxMD, quick update on the Devvit port and two questions if you have a minute

progress: phase 0 scaffold is in, observatory dashboard renders, idem layer + atomic config publish working. repo at github.com/StephenSook/context-mod-devvit (public now). domain approval for the reddit hosts came through as expected.

two things i need from you before i hit submit on devpost may 27:

1. what's the actual bot username i should put in devpost's "original bot" field? i had u/ContextModBot in my notes but want to confirm before submitting.

2. if you're willing — a one or two sentence quote i can include in the project impact section. something like "i've been running CM since X, this port unblocks Y for me" — your call on framing. fine if you'd rather not.

no rush, but if i don't hear back by may 22 i'll put u/ContextModBot and skip the quote. either way, thanks for the permission — port is real and judges can install it.
```

**AI-tone scan:** clear of blocklist words.

---

## 2. SampleOfNone — helper nomination ping (Reddit DM)

**Context:** Want to nominate them as "Most helpful user" on Devpost. Their public flag in r/Devvit Discord that "image parsing is the hard part on Devvit" directly shaped Phase 4 scope decisions. Need their OK to (a) name them publicly in the submission, (b) cite r/piercing visitor stats.

**Suggested send time:** 2026-05-16.

```
hey, sorry for the cold DM. i'm Stephen, building a Devvit Web port of FoxxMD's ContextMod for the mod tools hackathon (deadline may 27). repo: github.com/StephenSook/context-mod-devvit

two asks if you have a minute:

1. you mentioned in r/Devvit Discord that image parsing is the hard part on Devvit. that comment directly shaped my Phase 4 scope — I gated the image-hash repost rule behind a Day-0 spike before committing to it. I'd like to nominate you as "most helpful user" on the Devpost submission for that reason. OK with me using your username publicly?

2. mind if I reference r/piercing's visitor stats (600K + 12K contributors per Reddit's public metrics) as one of three named "communities served" examples? would only quote your public sub stats, nothing private.

happy to share the dashboard link if you want to see what i built before deciding.
```

**AI-tone scan:** clear.

---

## 3. r/Devvit subreddit + Discord update (post + share)

**Context:** Build community-side visibility before submission day. Shows progress without sounding AI-marketed. Stephen posts this in r/Devvit + cross-posts the same text to the r/Devvit Discord #show-and-tell channel.

**Suggested send time:** 2026-05-19 (one week before deadline).

```
title: porting FoxxMD's ContextMod to Devvit Web — progress check

body:

i've been heads-down on a port of FoxxMD's context-mod (the rule-engine mod bot ~15 subs have been running since 2019) to Devvit Web for the mod tools hackathon. wanted to share progress in case anyone has feedback.

what's working in v0.1.0:
- the run → check → rule → action pipeline with postBehavior flow control
- 3 MVP rule kinds (regex, author, ruleSet) + 7 actions
- filters (authorIs / itemIs)
- atomic config publish via revision pointer (cfg:rev:n + cfg:current_rev)
- per-effect idempotency (cm:proc 24h + cm:action:pending 5m + cm:action:done 7d) so devvit's at-least-once delivery never double-applies
- observatory custom-post dashboard with live action telemetry + 24h sparkline
- dry-run mod-menu rule tester

what's still in-flight:
- phase 1 (handleActivity wired to live triggers) — Vinh's working on it
- phase 4 stretch: image-hash repost detection (perceptual hash in pure JS, blocked on a 30s-limit spike) + MHS toxicity rule (blocked on api.moderatehatespeech.com fetch approval — might get rejected per personal-domain policy, fine if so)

repo: github.com/StephenSook/context-mod-devvit (MIT, public, CI green)
permission: github.com/FoxxMD/context-mod/issues/152

specifically curious about:
- has anyone gotten image decode + blockhash working in pure JS within the 30s execution window? not asking for code, just confirmation it's feasible
- any gotchas with the developer-portal review process on a port like this? trying to read the tea leaves on review timeline

not asking for a review, just a heads-up that this is happening before submission day. happy to share install links to anyone who wants to playtest.
```

**AI-tone scan:** clear.

---

## 4. Submission day announcement (after Devpost submit)

**Context:** Once Stephen hits submit on Devpost, share the public devpost project page in r/Devvit + Discord. Keep it short — community is fatigued with AI-marketed submissions during hackathon week.

**Suggested send time:** 2026-05-27 (after the actual submission lands).

```
title: ContextMod Devvit Web port — submitted to mod tools hackathon

body:

submitted my devvit web port of FoxxMD's context-mod for the mod tools and migrated apps hackathon today.

devpost: [paste devpost project URL]
repo: github.com/StephenSook/context-mod-devvit
app: developers.reddit.com/apps/cm-devvit

thanks to:
- FoxxMD for the permission to port + the original rule engine design
- u/SampleOfNone for the heads-up on image parsing
- everyone in r/Devvit Discord who answered my "is this on the right path" questions over the last 4 weeks
```

**AI-tone scan:** clear.

---

## Stephen's editorial pass (before sending any of these)

For each message:
1. Read the full draft aloud. If any line makes you wince, rewrite it.
2. Replace at least one phrase per message with your own wording — it should not sound like the same writer wrote all four.
3. Re-run `./scripts/check-ai-tone.sh` (if extended to scan this file) against the literal text you're about to paste.
4. Don't include the AI-tone scan footers in the actual send.
