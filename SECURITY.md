# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.6.x   | :white_check_mark: |
| 0.5.x   | :white_check_mark: |
| < 0.5   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Report vulnerabilities privately via one of:

1. **GitHub Security Advisory (preferred):** https://github.com/StephenSook/context-mod-devvit/security/advisories/new
2. **Email:** stephensookra@gmail.com (PGP key available on request)

Please include:
- A description of the issue + its impact
- Steps to reproduce
- Affected version(s)
- Any proof-of-concept code (do not include real Reddit user data)

### Response Timeline

- **Acknowledgement:** within 72 hours
- **Initial assessment:** within 7 days
- **Coordinated disclosure:** 90-day coordinated disclosure window from the date of initial report, extendable by mutual agreement.

We will credit reporters in the security advisory unless you request otherwise.

## Scope

In scope:
- Idempotency bypass / double-application of mod actions
- Config-publish race conditions allowing mid-event tear
- Wiki-config injection into Mustache action templates
- Per-subreddit isolation bypass (one sub's data leaking to another)
- HTTP fetch policy bypass / unapproved domain calls
- Token / API-key disclosure in repo or logs
- Auth-gate bypass on any `/api/*` mutation or cost-bearing endpoint
- Prompt injection via user-controlled fields → OpenAI completion exfiltration
- Rate-limit / circuit-breaker bypass that allows OpenAI quota burn
- Log spoofing via request body fields landing in `cm:mod-activity:<sub>`
- Lease-token spoofing in `reserveAction` → action replay

See [`THREAT-MODEL.md`](./THREAT-MODEL.md) for the full STRIDE inventory: 15 cataloged threats, their mitigations, and the residual risks we've acknowledged.

Out of scope (file as bugs, not security):
- Rate limits applied by Reddit's API
- Devvit platform-level vulnerabilities (report to Reddit directly via [r/Devvit](https://reddit.com/r/Devvit) or their Discord)
- Issues in upstream `FoxxMD/context-mod` PRAW codebase (this is the Devvit port)
- Misconfiguration in a specific subreddit's wiki (that's the mod team's responsibility)

## What we won't do

- We do not pay bug bounties for this project (no funding).
- We will not pursue legal action against good-faith security research that follows this policy.
