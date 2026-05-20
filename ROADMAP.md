# ROADMAP.md — context-mod-devvit

Where this project goes after the Reddit Mod Tools Hackathon submission. Organized by horizon: what ships in the next hackathon-finalize sprint, what's planned for the FoxxMD operator-pool migration, what's on the longer-term wishlist.

## Now — hackathon-finalize (T-8 to deadline)

- [ ] **S17** Devpost writeup voice rewrite — strip AI-tone words per D10 voice rules
- [ ] **S18** Demo video record + YouTube upload (OBS) — T-3 to T-1
- [ ] **S19** Final Devpost submission click — T-0 (2026-05-27 18:00 PT)
- [ ] **Stephen final `npm run launch`** — T-2 (2026-05-25) — publishes v0.6.x to Reddit App Directory
- [ ] Final live retest on r/cm_devvit_test once published (smoke-test all 12 example configs render)
- [ ] Capture remaining scenario screenshots (A/C/D/E + I image-repost + J AI explainer per refreshed `docs/screenshots/CAPTURE-CHECKLIST.md`)

## Next — post-submission migration (T+0 to T+30d)

- [ ] **Operator outreach** — 15+ FoxxMD ContextMod operator pool (mods of r/mealtimevideos, r/piercing, etc) — DM template + migration guide shipped at [`docs/migration-from-upstream-cm.md`](./docs/migration-from-upstream-cm.md) + YAML→JSON5 tool at [`scripts/migrate-upstream-config.mjs`](./scripts/migrate-upstream-config.mjs)
- [ ] **History rule perf audit** — verify the 1h author-history cache holds under busy-sub load (FETCH_LIMIT=100 per author)
- [ ] **`/api/stats` rollup widening** — beyond 50-event ring buffer (7-day rolling counts written by stats-rollup cron into a dedicated ZSET)
- [ ] **GitHub Discussions threads seeded** for top 5 migration questions

## Later — V1 maturity (T+30d to T+90d)

- [ ] **Lua/CAS replacement** — when/if Devvit Redis gains script support, replace the read-then-write monotonic pointer guard (W4) w/ a true atomic CAS — closes the residual TOCTOU window
- [ ] **Wiki diff in `/api/config-history`** — server-side diff (instead of client-side LCS) for large configs (>500 lines) that overflow webview render budget. Currently deferred (closed Task #155) — client LCS handles typical 20-60-line configs fine.
- [ ] **Rule library** — curated config snippets contributed by the operator community (extend `examples/` w/ author-tagged real-world configs beyond the 12 shipped)
- [ ] **MHS-equivalent toxicity scoring** — explore in-Devvit ML via webgpu transformers.js or similar. MHS itself is cut (PR #96 HTTP allowlist excludes ModerateHateSpeech)
- [ ] **Dashboard webview embeds** — sparkline + stat cards as standalone Devvit Block components for mods who don't want the full custom post
- [ ] **Per-sub circuit breaker dashboards** — visible breaker state (open/half/closed) per external API (OpenAI, Wiki) in the activity feed

## Shipped during the hackathon run (formerly Next / Later items)

- ✅ **Devvit App Directory review** — v0.5.5 approved 2026-05-17; v0.6.7 (Phase 4.7 + AE polish #1–#88 + 12 examples + 820 tests) currently under review
- ✅ **Phase 4.7 image-mode repost** — shipped v0.6.0 (2026-05-18) — pure-JS blockhash pipeline (upng-js + jpeg-js + blockhash-core) w/ Content-Length pre-check (Polish #23)
- ✅ **Hard-mute integration** — wired `isRuleMuted` into `runCheck` (Polish #4 in AE Critical wave, also closes muteSet sentinel-vs-real check)
- ✅ **Per-user rate limit on /explain-event** — `cm:rl:explain:{sub}:{user}` 10/hr on top of per-sub 30/hr (Pull-Forward #7)
- ✅ **Migration tool YAML→JSON5** — `scripts/migrate-upstream-config.mjs` w/ 10-rename ladder + cut classifications + exit-code-1 failure tests (Pull-Forward #10 + Polish #22)
- ✅ **Shared regex cache + safe-regex guard on filters** — extracted to `src/lib/regexCache.ts`, applied to filter regex path too (Polish #35) — closes the ReDoS hole in `filters.titleMatches/bodyMatches/urlMatches`

## Wishlist — out-of-scope w/o new platform primitives

- [ ] **Multi-install fan-out** — one install across multiple subs w/ shared config (Devvit's per-install isolation makes this currently impossible)
- [ ] **Real-time push to dashboard** — Devvit has no WebSocket / SSE primitive; today the dashboard polls every 10s
- [ ] **Server-side render of the dashboard** — would need Devvit to allow non-iframe custom post entries
- [ ] **External logging integration** (Datadog, Honeycomb) — Devvit Redis doesn't expose outbound TCP; current X33 structured JSON logger writes to console only
- [ ] **PostgreSQL store for large-window analytics** — Devvit only ships Redis
- [ ] **OAuth-protected `/api/*`** — no external auth provider integration available on Devvit
- [ ] **Image storage / asset CDN** — no Devvit primitive for arbitrary file storage

## Process commitments

- **Atomic commits per fix** — every logical fix lands as its own commit (HARD RULE locked 2026-05-16, MEMORY.md)
- **Edit → tests → tsc → lint → commit → push triplet** — pre-commit discipline (HARD RULE locked 2026-05-17)
- **Multi-agent code review** — codex-rescue + silent-failure-hunter + comment-analyzer + type-design-analyzer + Gemini architecture sweep against every WAVE-class change before tagging
- **THREAT-MODEL.md updated** w/ every new attack surface
- **CHANGELOG.md** Keep-a-Changelog format, populated at PR time not release time

## Versioning

| Version | When | Scope |
|---------|------|-------|
| **v0.4.0** | Post-submission, first operator-pool wave | Hard-mute wiring + Phase 4.7 image-hash (if GO) + first round of operator feedback fixes |
| **v0.5.0** | T+45d | History rule perf + stats rollup widening + 1-2 operator-requested features |
| **v1.0.0** | T+90d | Production-grade — Lua/CAS migration done (if available), full coverage, stable API contract |

## How to contribute

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the dev workflow + [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the 10 load-bearing design decisions any new contributor should read before touching the security-sensitive paths.

Issue templates + PR template at [`.github/`](./.github/). Security disclosures go to GitHub's private security advisory flow per [`SECURITY.md`](./SECURITY.md).
