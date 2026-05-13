# Sookra Pillar 5 — Numbers Dossier

> The business-case evidence file. Every claim is citation-traceable. Use these in the demo voiceover, Devpost writeup, judge Q&A.

## 1. Reddit moderator labor scale

- **466 hours/day of moderation labor measured across 21,500 active moderators in 126 subreddits.** At UpWork median ($20/hr) the measured population's labor is worth **$3.4M/year unpaid**. ([Li, Hecht, Chancellor — "You Are an Expert!" ICWSM 2022](https://arxiv.org/abs/2205.14529))
- **Linear scaling to Reddit's current 60K active mods**: ~$9.5M/yr in volunteer-labor-equivalent value (Reddit Inc statistic, 2.8× the measured population). Flag this as scaling math, not measured — judges should hear both numbers.
- **73% of mod actions on Reddit are performed by bots** (sample of 25,812 daily actions across 126 subreddits). Same paper.
- **9–94% of mod labor is "invisible work"** — context-gathering, behavioral checks, rule-interpretation. Median 43%. Comment removal alone is as little as 2% of human labor. This is exactly the gap ContextMod fills — AutoMod handles regex, ContextMod handles context.

## 2. Reddit platform scale (FY24 — Q1 2026)

- **126.8M daily active uniques · 493.1M weekly** (Reddit Inc Q1 2026 earnings — public).
- **2.8M total subreddits, ~138K active, ~60K active volunteer moderators.** Reddit 10-K + Statista.
- **$663M Q1 2026 revenue (+69% YoY).** Reddit Inc Q1 2026 transcript.
- **$300M+ free cash flow** in same quarter.

## 3. Reddit content moderation volume (Transparency Report H1 2024)

- **5.3B pieces of content** posted in 6 months.
- **3% removed** total: **1.6% by mods** + **1.5% by admins**.
- **Mods initiated 40.7% of all removals.**
- **66.5% of admin removals are spam.**

## 4. AutoModerator scale (the existing baseline)

- "AutoModerator reviews ~82% of submitted content, acts on ~8%" — Reddit's own published data (cite via Karmatic 2025 restatement; primary source needs hedge).
- AutoMod is the most widely-deployed automated regulation tool on Reddit. (Wright 2022)

## 5. ContextMod current footprint (the upstream this port serves)

- **r/mealtimevideos: 60K weekly visitors** — FoxxMD's personal ContextMod instance (per Discord 2026-05-12).
- **r/piercing: 600K visitors, 12K contributors** — SampleOfNone's instance (per Discord 2026-05-12).
- **15+ third-party ContextMod operators** running CM in their own subs, per FoxxMD. A few in the 10K–1M subscriber range. ~150 NSFW subs managed via separate accounts.
- **github.com/FoxxMD/context-mod**: 54 stars, 12 forks, 1,258 commits, 4 contributors. Active 2019–2022, last release 2022-11-29.
- FoxxMD's `multi-scrobbler` for context: 929 stars (demonstrates he's a proven OSS shipper).

## 6. The 2023 API blackout context

- **8,800 subreddits went private** in protest.
- **28,606 moderators participated.**
- **2.79B subscribers affected.**
- Reddit's paid Data API tier launched **2023-07-01**. Apollo was quoted **$12,000 per 50M requests / ~$20M/yr** for commercial access ([apolloapp post, Christian Selig](https://www.reddit.com/r/apolloapp/comments/13ws4w3/had_a_call_with_reddit_to_discuss_pricing_bad/), [Wikipedia: Reddit API controversy](https://en.wikipedia.org/wiki/Reddit_API_controversy)).
- The free tier survives only at **100 QPM per OAuth client** for non-commercial use — mathematically incompatible with full-subreddit moderation streams.
- This is the moment that **necessitated** this port: Reddit's free Data API was killed, and PRAW-based mod bots needed a new home. Devvit is that home.

## 6.5. Devvit Blocks deprecation — Pillar 4 evidence

The 2023 blackout closed off PRAW. Reddit's 2026 platform decisions close off the only remaining alternative (Devvit Blocks), leaving Devvit Web as the singular path forward. Migration is structurally forced, not stylistically preferred.

**Reddit's own deprecation announcement:**
> "To better support our development of Devvit Web, in the coming months we will be deprecating Devvit Blocks renderer for interactive posts."

— r/Devvit post [`1r3xcm2`](https://www.reddit.com/r/Devvit/comments/1r3xcm2/devvit_web_and_the_future_of_devvit/) — "Devvit Web and the future of Devvit"

**Reddit's positioning of Devvit Web:**
> "Devvit Web has reached full feature parity with blocks, and we strongly recommend using Devvit Web for all new apps."

— r/Devvit post [`1pcm13z`](https://www.reddit.com/r/Devvit/comments/1pcm13z/devvit_0125_payments_for_devvit_web/) — "Devvit 0.12.5: Payments for Devvit Web"

**The countdown:**
> "As announced previously we are approaching the deprecation deadline for apps that use the Blocks renderer. We are about 80 days away from the final deadline..."

— r/Devvit post [`1shophd`](https://www.reddit.com/r/Devvit/comments/1shophd/upcoming_deprecation_of_apps_that_use_blocks/) — "Upcoming Deprecation of apps that use Blocks Renderer." The 80-day window places the hard cutover in 2026 H2 — i.e., this hackathon period.

**The Migration Bounty is scoped to exactly this archetype:**
> "Moving an app from blocks to Devvit Web does not count towards the migration program bounty. We're only accepting existing Data API apps..."

— r/Devvit post [`1sgwkm7`](https://www.reddit.com/r/Devvit/comments/1sgwkm7/bring_your_data_api_apps_to_devvit_and_details/). Reddit pays the bounty *specifically* for PRAW/Data-API → Devvit Web ports. ContextMod is the textbook target.

**ContextMod's release timing is the case study.** GitHub confirms FoxxMD/context-mod's last release was **v0.13.4 on 2022-11-29**, and the last substantive code commit was **2023-05-01** (PR #143 merge) — weeks before the July 1, 2023 paid-tier launch. The repository was just touched again on **2026-05-12** with commits literally titled *"disable existing workflows"* and *"ci: disable auto workflows for publish/pages"* — the maintainer is winding it down, not reviving it. ([github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod/releases))

**The four arrows of inevitability** all point the same way within the same 18-month window:
1. Reddit pushes Devvit Web ("strongly recommend... for all new apps")
2. Reddit deprecates Blocks ("80 days away from final deadline")
3. Reddit prices out the Data API ($12K+/yr commercial; 100 QPM free is unworkable for moderation)
4. Reddit *pays $1,000* per qualifying PRAW→Devvit migration

This is structural inevitability, not vibes.

## 7. Devvit Developer Funds 2026

Source: [support.reddithelp.com — Developer Funds 2026 Terms](https://support.reddithelp.com/hc/en-us/articles/27958169342996).

**Daily Qualified Engager (DQE) tiers** — rolling 7-day average:

| Tier | Threshold | Payout | Cumulative |
|---|---|---|---|
| 1 | 500 DQEs | $500 | $500 |
| 2 | 1,000 DQEs | $1,000 | $1,500 |
| 3 | 10,000 DQEs | $5,000 | $6,500 |
| 4 | 25,000 DQEs | $10,500 | $17,000 |
| 5 | 50,000 DQEs | $25,000 | $42,000 |
| 6 | 100,000 DQEs | $25,000 | $67,000 |
| 7 | 250,000 DQEs | $25,000 | $92,000 |
| 8 | 1,000,000 DQEs | $75,000 | $167,000 |

**Qualified Install (QI) tiers** — for mod tools like ours:

| Tier | Threshold | Payout |
|---|---|---|
| Installs 1 | 50 QIs | $500 |
| Installs 2 | 250 QIs | $1,000 |
| Installs 3 | 1,000 QIs | $2,000 |

**Max payout per app:** $75K (DQE side), $3,500 (QI side). $500K total across 3 apps. One-time per tier.

## 8. App Migration Program 2026

Source: [support.reddithelp.com — App Migration Program 2026 Terms](https://support.reddithelp.com/hc/en-us/articles/47822311698452).

- **$1,000 USD bounty** per qualifying Data API → Devvit migration.
- **Eligibility:** PRAW app existed before 2026-03-25 AND serves a subreddit with ≥1,000 weekly active users.
- **Program window:** 2026-03-31 → 2026-12-31.
- **One bounty per developer.**
- **ContextMod easily qualifies** — r/mealtimevideos alone is 60× the WAU threshold.

## 9. Discord mod-bot ecosystem (latent demand framing)

- **Carl-bot:** 14.2M server installs, 1.66B users. $4.99/mo premium.
- **Dyno:** $5/mo premium.
- **MEE6:** $11.95/mo premium.

Reddit's Devvit ecosystem is at the same inflection point Discord's mod-bot scene was 6 years ago.

## 10. Citations for the headline voiceover (60s demo)

1. "Reddit's volunteer mods do 466 hours of unpaid work every day — $3.4M/year." → Li et al. 2022
2. "73% of mod actions are already performed by bots." → Same paper
3. "Reddit Q1 2026 revenue: $663M, +69% YoY, 127M daily users." → Reddit Q1 2026 earnings
4. "5.3B pieces of content posted in 6 months of 2024." → Reddit Transparency Report H1 2024
5. "60K active moderators, zero paid." → Reddit 10-K + Statista
6. "ContextMod's port qualifies for the $1,000 Migration bounty + up to $75K Developer Funds." → Reddit Help official terms
7. "Discord's Carl-bot has 14.2M server installs. Reddit's Devvit ecosystem is at the same inflection point." → top.gg

## Open verification flags (revisit before submission)

- **"AutoMod 82%/8%"** — cite as "per Reddit's own published data" with hedge until primary source located.
- **Live App Directory install counts** (Spotlight 1664, etc.) — pull from `developers.reddit.com/apps` browser before submission (Firecrawl blocked from scraping).
- **r/ContextMod subscriber count** — pull live; reddit.com blocked from scrapers.
- **Specific ContextMod testimonials** — ask FoxxMD + SampleOfNone for 1-2 named-sub quotes for the writeup.
- **"Y hours saved per mod per week with ContextMod"** — no published study. Defensible claim: each manual user-history check takes 5–10 min; ContextMod automates these. **DO NOT INVENT** specific time-savings figures.
