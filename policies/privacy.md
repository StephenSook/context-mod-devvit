---
permalink: /privacy/
title: Privacy Policy
description: Privacy Policy for the cm-devvit Reddit Devvit app.
---

# Privacy Policy — context-mod-devvit

**Last updated:** May 16, 2026 (v0.2.0 — Reddit App Directory review)
**App owner:** Stephen Sookra (stephensookra@gmail.com)
**App name:** context-mod-devvit (a Reddit Devvit app, `cm-devvit` slug)

## TL;DR

context-mod-devvit is a moderation tool installed by subreddit moderators to enforce their community's rules. It evaluates new posts and comments against a config the moderators control, and takes moderation actions (remove, comment, lock, etc.) on their behalf. It does not sell, share, or commercialize any user data. It does not train AI models on Reddit content.

## What the app processes

When a post or comment is submitted to a subreddit where this app is installed, Reddit's Developer Platform (Devvit) delivers a trigger event to the app. The event includes:

- The post or comment ID, title, body, URL, author username + ID, score, timestamps, and standard Reddit metadata
- The subreddit name and ID

The app uses this data **only** to evaluate the moderator's rule configuration and take the moderation action the rule specifies.

## What the app stores

Data is stored in Reddit's per-installation Redis storage (scoped to a single subreddit, isolated by Devvit's platform). Stored values include:

- Recent moderation actions taken (last ~500, for the moderator's audit dashboard)
- The current rule configuration (loaded from the subreddit's wiki page or the moderator's settings)
- Author profile cache (username, account age, karma — TTL 1 hour)
- Image perceptual hashes for repost detection, keyed by post ID (TTL 30 days)
- URL-normalized hashes for URL-based repost detection (TTL 30 days)
- Idempotency keys for trigger deduplication (TTL 24 hours)
- Aggregate counters of how often each rule fired (daily, for the dashboard)

The app does **not** store:

- Full post or comment text beyond the audit log of triggering events
- Author email, IP, or any private profile information
- Voting history, subscribed subreddits, saved content, or any other private Reddit data the app could not access

## External data transmission

The app makes outbound HTTP requests to these allow-listed domains only:

- **i.redd.it, preview.redd.it, external-preview.redd.it, external-i.redd.it** — Reddit's own image CDNs, fetched to compute perceptual hashes for repost detection. Image bytes are decoded and hashed locally; the bytes themselves are not stored or transmitted further.

The app does not transmit data to any other third party.

## Data retention and deletion

- On Reddit's `PostDelete` or `CommentDelete` trigger, the app deletes all stored references to the affected post/comment ID, including hashes, audit-log entries, and idempotency keys.
- All cached author data is TTL'd to 1 hour and expires automatically.
- Image hashes are TTL'd to 30 days from last access.
- Idempotency markers TTL to 24 hours.
- On app uninstall from a subreddit, Reddit's platform automatically wipes the per-installation Redis namespace.

Users who want their data removed before TTL expiry can: (1) delete the post/comment on Reddit, which fires the deletion trigger and wipes the related data, or (2) contact the app owner at stephensookra@gmail.com.

## What the app does NOT do

- Does not collect or transmit personal information (no real names, email, IP, location)
- Does not train machine learning or AI models on Reddit content
- Does not sell, license, share, or commercialize data
- Does not use ad networks or data brokers
- Does not profile users by protected characteristics (race, religion, politics, health, etc.)
- Does not surveil specific users or comply with surveillance requests
- Does not bypass Reddit's safety, privacy, or security mechanisms
- Does not process data of persons under 13 years old (Reddit's minimum age)
- Does not handle protected health information, financial information, or any other sensitive category under applicable law

## Third-party services

The app does not call any third-party APIs. All outbound HTTP traffic stays within Reddit's image CDN domains listed in "External data transmission" above.

## Changes to this policy

If this policy materially changes, the updated version will be published at the same URL and the "Last updated" date above will be incremented. Continued installation of the app constitutes acceptance.

## Contact

For privacy questions, data deletion requests, or any other concerns:

**Email:** stephensookra@gmail.com
**Reddit:** u/CowSufficient3840 (or modmail to r/stephens_cm_test for hackathon period)
**GitHub:** https://github.com/StephenSook/context-mod-devvit
