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

**ContextMod's release timing is the case study.** GitHub confirms FoxxMD/context-mod's last release was **v0.13.4 on 2022-11-29**, and the last substantive code commit was **2023-05-01** (PR #143 merge) — weeks before the July 1, 2023 paid-tier launch. The repository was just touched again on **2026-05-12** with commits titled *"disable existing workflows"* and *"ci: disable auto workfows for publish/pages"* (upstream typo preserved). Same week, FoxxMD added Stephen + Vinh as collaborators on the Devvit port and shared a GitHub Project board for it (2026-05-12 / 2026-05-13 per Discord transcript) — the maintainer is redirecting energy to the port, not abandoning the codebase. ([github.com/FoxxMD/context-mod](https://github.com/FoxxMD/context-mod/releases))

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

## 7.5. Reddit CEO confirms mod-bot porting as a strategic line item

**Steve Huffman, Reddit Q1 2026 earnings call (2026-04-30):**
> "We have what we call good bots on Reddit, which are basically programs that mostly moderators have written to help run communities on Reddit. We're porting those over to our developer platform."

Source: [Q1 2026 earnings call transcript (Motley Fool)](https://www.fool.com/earnings/call-transcripts/2026/05/01/reddit-rddt-q1-2026-earnings-transcript/). The CEO of a public company stated this thesis verbatim on the earnings call. The exact archetype of this hackathon project is named as a corporate priority.

**S-1 framing** (per [TechCrunch S-1 analysis](https://techcrunch.com/2024/02/23/reddit-downplays-risks-of-developer-backlash-decentralized-social-media-in-its-ipo-filing/), [SEC EDGAR filing](https://www.sec.gov/Archives/edgar/data/1713445/000162828024006294/reddits-1q423.htm)): Reddit's S-1 named the developer platform as a means of "enhancing its own site — by building bots and creating features that shape their communities." The 2023 blackout (8,800 subs, 28,606 mods) is the disclosed risk; Devvit is the disclosed mitigation. Porting ContextMod is therefore directly tied to a named IPO risk-factor mitigation.

**Q1 2026 financial backdrop** ([businesswire release](https://www.businesswire.com/news/home/20260430242740/en/Reddit-Reports-First-Quarter-2026-Results)):
- Revenue $663M (+69% YoY — 7th consecutive quarter >60%)
- Ad revenue $625M (+74% YoY)
- GAAP net income $204M; FCF $311M (47% margin)
- Adjusted EBITDA $266M (40% margin, +1,100 bps YoY)
- DAU 126.8M (+17%); capex just $1M

The Developer Funds pool ($500K/dev max) is a rounding error against $311M quarterly FCF. Reddit can fund this indefinitely without flinching.

## 8. App Migration Program 2026

Source: [support.reddithelp.com — App Migration Program 2026 Terms](https://support.reddithelp.com/hc/en-us/articles/47822311698452).

- **$1,000 USD bounty** per qualifying Data API → Devvit migration.
- **Eligibility:** PRAW app existed before 2026-03-25 AND serves a subreddit with ≥1,000 weekly active users.
- **Program window:** 2026-03-31 → 2026-12-31.
- **One bounty per developer.**
- **ContextMod clears the Bounty's 1K WAU bar by ~60×** — r/mealtimevideos alone is at ~60K weekly visitors. (Note: the Reddit Mod Tools Hackathon's Ported-track requires only 500 WAU, also satisfied — see FoxxMD's Discord confirmation in [`outreach-drafts.md`](./outreach-drafts.md). The two thresholds belong to different Reddit programs and are sometimes conflated.)

## 9. Discord mod-bot scene (latent demand framing)

| Bot | Active servers (top.gg current) | Cumulative installs | Premium | Notes |
|-----|------------------------------|---------------------|---------|-------|
| **Carl-bot** | ~3.4M | 10–14M lifetime | $7.99/mo | Launched 2016 ([top.gg](https://top.gg/bot/235148962103951360)) |
| **MEE6** | (paused at GA) | ~21M lifetime | $11.99/mo | ([mee6.xyz/en/premium](https://mee6.xyz/en/premium)) |
| **Dyno** | ~3M | ~10M lifetime | $5.99–$12.99/mo (Standard / Premium / Custom) | ([dyno.gg/premium](https://dyno.gg/premium)) |

**Discord platform scale** ([SQ Magazine Discord stats 2026](https://sqmagazine.co.uk/discord-statistics/)):
- **55,000+ bots** in Discord's bot marketplace
- **680,000 monthly active developers**
- **96% of Discord moderation actions are bot-driven** (2025 data)

**The timing parallel:** Discord launched 2015. Carl-bot launched 2016. By 2018–2019 Discord's mod-bot economy was a multi-million-dollar premium-tier industry. Devvit Web hit general availability in 2026. Mirror-timing puts Reddit's mod-bot economy on a 5-year trajectory toward Carl-bot-class premium ARR. **First-mover ports (ContextMod) capture the equivalent slot** — there is no Carl-bot-of-Reddit yet, but there will be.

## 9.5. r/modnews "Mod Monthly" 2026-05 top-comment dossier

The most direct first-party signal of what mods want from Reddit *right now* lives in a single comment thread, captured below in dossier form so judges can replicate the sampling.

| Field | Value |
|-------|-------|
| Source thread | [r/modnews/comments/1t6jggp](https://www.reddit.com/r/modnews/comments/1t6jggp/) — May 2026 "Mod Monthly" announcement |
| Sampled date | 2026-05-13 (post age: 6 days at sampling) |
| Sampled comment rank | Top 6 by upvote at time of sampling |
| Sampled by | Stephen, manual scroll + screenshot (no API scrape) |

**Top-1 comment — anchors the anti-AI-tooling framing:**
- Author: `u/Aeroncastle`
- Upvotes: 94
- Text (verbatim): *"I want stronger tools to fight AI, not in person events"*

**Top-2 / Top-3 / Top-4 comments — same axis, different angle:**
- `u/critacle` (34 upvotes) — *"Stop the AI bot spam. It's dominating /r/all. This is killing Reddit"*
- `u/GamingYouTube14` (21 upvotes) — *"can you guys look into these new ai bots that adapt to the conversation? they're pretty much undetectable by any kind of algorithm"*
- `u/OMGWTFBBQUE` (15 upvotes) — *"If I have to remove another AI post I'm going to lose my shit. Fucking do something about it."*

**Drift caveat:** comment ranking + upvote counts evolve. The 94/34/21/15 snapshot is a point-in-time read on 2026-05-13. By May 27 (submission day) ordering may shift; the *direction* (anti-AI-tooling) is the load-bearing claim, not the specific counts. If judges re-sample post-submission and find a different #1, the framing still holds — anti-AI-tooling is the dominant axis across the top 6.

**Why this matters for ContextMod scoring (Pillar 1 — Real Problem):** the loudest mod ask of the month is anti-AI-bot tooling; ContextMod is *anti-AI-bot tooling by construction* — `regex` rule catches generic AI phrasings, `author` rule flags new-account / low-karma / no-verified-email signatures AI bot farms produce, and Phase 4's `history` rule detects cross-sub posting cadence no human author would maintain. The writeup §1 paragraph cites this dossier; this page is the audit trail behind that citation.

## 10. Citations for the headline voiceover (60s demo)

1. "Reddit's volunteer mods do 466 hours of unpaid work every day across 21,500 measured moderators — $3.4M/year." → Li et al. ICWSM 2022
2. "73% of mod actions are already performed by bots." → Same paper
3. "On the Q1 2026 earnings call, Reddit's CEO said: 'we're porting good bots over to our developer platform.'" → Huffman, Q1 2026 transcript
4. "Reddit Q1 2026: $663M revenue, +69% YoY, $311M free cash flow." → BusinessWire Q1 2026 release
5. "60K active mods, zero paid. Linear scaling puts the addressable volunteer-labor TAM at $9.5M/year." → Reddit 10-K + Statista, scaled from Li et al.
6. "Reddit is paying $1,000 per qualifying PRAW→Devvit migration. ContextMod is the textbook target." → App Migration Program 2026 Terms
7. "Devvit Blocks is being deprecated. Reddit's recommendation: Devvit Web for all new apps. ContextMod's last release was November 2022 — exactly the pre-blackout boundary." → r/Devvit posts 1r3xcm2, 1pcm13z; github.com/FoxxMD/context-mod releases
8. "Discord launched 2015, Carl-bot launched 2016, now 3.4M servers and 96% bot-driven moderation. Devvit Web hit GA in 2026. Reddit's mod-bot economy is at Year 1 of where Discord was at Year 3." → top.gg, SQ Magazine 2026 stats

## 11. Computed addressable market (TAM)

Two stacked claims, separated so judges can attack the assumption-laden one without nuking the measured one:

**A — Measured value (defensible without scaling).** Li et al. ICWSM 2022 measured **170,170 hours/year of moderation labor across 21,500 active moderators in 126 subreddits** ([arxiv.org/abs/2205.14529](https://arxiv.org/abs/2205.14529)). At UpWork median ($20/hr) the measured population's labor is worth **$3.4M/year unpaid volunteer effort** ([Northwestern Now](https://news.northwestern.edu/stories/2022/05/unpaid-social-media-moderators)).

**B — Linear scaling to Reddit's stated ~60K active mods.** $3.4M × (60K / 21.5K) = **~$9.5M/year volunteer-labor-equivalent value** across Reddit's full mod base. Honestly flag this as scaling math, not measured.

**Incremental capture available to ContextMod-class tools.** AutoMod is regex-only — handles 82% review / 8% action per Reddit's data, mostly anti-spam. The *context-gathering* tier (5–10 minutes of manual user-history check per ambiguous post, multi-attribute author criteria, composable rules) is what humans currently do and what CM-class bots automate. If a CM-class bot offloads **1 additional hour per mod per week** beyond AutoMod's reach, that's:

```
60,000 mods × 52 weeks × 1 hr × $20/hr = $62.4M/year
```

in labor-equivalent value offloadable. Even at a conservative **10% capture rate**, that's **$6M+/year of mod-labor value offloaded** — multiples larger than the entire Developer Funds program budget per app.

## 12. Realistic direct-cash envelope (program-window scoped)

Stacking the actual programs ContextMod-on-Devvit qualifies for, **with the Developer Funds program currently running through June 2026**:

| Source | Math | Tier reached | Payout |
|--------|------|------|--------|
| App Migration Bounty | r/mealtimevideos alone is 60× the 1K WAU threshold | qualifies | $1,000 |
| Hackathon Best Ported App | grand prize | win condition | $10,000 |
| Developer Funds — Install side | 10% of 60K mods × installs threshold = 6K (well past Tier 3 cap) | Tier 3 cap | $3,500 |
| Developer Funds — DQE side | ~10K daily distinct mods at maturity | Tier 3-4 ladder | $5,000-$10,500 |
| **Total envelope (one-time, before program close)** | | | **$19,500–$25,000** |

**Tail upside** if DQE compounds toward Tier 5+ before the program closes: up to **$42K cumulative** on the funds side alone, plus the $1K + $10K base. Stretch-but-credible target: **$50K+ against zero hosting/infra cost.**

⚠ **Honesty caveat:** Developer Funds 2026 program window is approximately Apr 2025 → Jun 2026 per Reddit's published terms. From a May 27, 2026 hackathon submission, the realistic capture window for the *current* program is one to two months — payouts past that depend on Reddit renewing the program. Treat all ladder figures as one-time and probabilistic, not recurring ARR.

Sources: [Developer Funds 2026 Terms](https://support.reddithelp.com/hc/en-us/articles/27958169342996-Reddit-Developer-Funds-2026-Terms), [Migration Program 2026 Terms](https://support.reddithelp.com/hc/en-us/articles/47822311698452-Reddit-Developer-Platform-App-Migration-Program-2026-Terms), [hackathon rules](https://mod-tools-migration.devpost.com/).

## 13. Cost basis displaced

Original ContextMod requires self-hosting (Heroku, VPS, or equivalent) + Reddit API tokens + Snoowrap maintenance. Each operator:

- **Hosting:** ~$25/mo for a small Heroku/VPS instance running PRAW + node + the wiki polling loop. Across 15+ operators that's **$4,500/year displaced** from the operator base.
- **Reddit API cost (post-2023):** moderation bots still ride the free-tier carve-out for non-commercial use ([Reddit's published mod-bot policy](https://mods.reddithelp.com/hc/en-us/articles/16693988535309-Moderation-Bots-Tooling)), but any operator who tried to scale commercial usage hit the $12K+/yr wall. Devvit removes the wall entirely.

Devvit-native gives every operator zero marginal hosting + zero API cost + per-sub Reddit-rate-limit isolation. The cost-side win is structural, not budgetary.

## 14. Honest gaps + counter-frame

Per Codex's mandate not to overclaim:

- **"60K mods" is Reddit's public statistic** (Statista + Reddit press), not a peer-reviewed measurement. The academic measured value is 21.5K (Li et al.). TAM math compounds the gap. Flag both numbers and let judges pick which to attack.
- **AutoMod 82%/8%** lacks a clean primary citation — restate as "per Reddit's published data" with a hedge.
- **DQE Tier 5+ ($25K+)** requires ~50K daily distinct mods which is near-implausible for a moderation tool. Cap honest projections at Tier 4 ($10.5K cumulative).
- **Developer Funds renewal isn't guaranteed.** Program runs Apr 2025 → Jun 2026. Treat all ladder payouts as one-time and probabilistic, not recurring ARR.
- **Devvit kill risk.** Reddit has killed monetization products before (Community Points, 2023). Mitigation: this port stands as utility regardless of monetization.
- **Counter-frame from a skeptical judge:** *"Mod tools have low engagement metrics by design — they hide work. Why does this matter to Reddit's growth?"* Reframe: the win condition is **mod retention** + **2023-blackout-style risk mitigation**, not DAU lift. Reddit's S-1 already cites mod-developer relations as a named risk factor — keeping moderators happy and bots functional *is* the win condition.

## Open verification flags (revisit before submission)

- **"AutoMod 82%/8%"** — cite as "per Reddit's own published data" with hedge until primary source located.
- **Live App Directory install counts** (Spotlight 1664, etc.) — pull from `developers.reddit.com/apps` browser before submission (Firecrawl blocked from scraping).
- **r/ContextMod subscriber count** — pull live; reddit.com blocked from scrapers.
- **Specific ContextMod testimonials** — ask FoxxMD + SampleOfNone for 1-2 named-sub quotes for the writeup.
- **"Y hours saved per mod per week with ContextMod"** — no published study. Defensible claim: each manual user-history check takes 5–10 min; ContextMod automates these. **DO NOT INVENT** specific time-savings figures.
