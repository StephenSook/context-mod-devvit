# ROADMAP.md — context-mod-devvit

Where this project goes after the Reddit Mod Tools Hackathon submission. Organized by horizon: what ships in the next hackathon-finalize sprint, what's planned for the FoxxMD operator-pool migration, what's on the longer-term wishlist.

## Now — hackathon-finalize (T-9 to deadline)

- [ ] **S17** Devpost writeup voice rewrite — strip AI-tone words per D10 voice rules
- [ ] **S18** Demo video record + YouTube upload (OBS)
- [ ] **S19** Final Devpost submission click
- [ ] **4.7 GO/NO-GO** — image-hash repost rule perceptual-blockhash spike (90-min timebox, blocked on Stephen's green light to Vinh)
- [ ] Final live retest on r/cm_devvit_test once Devvit trigger-subscription drift settles (Vinh hit intermittent delivery 2026-05-18)
- [ ] Capture remaining scenario screenshots (A/C/D/E per `docs/screenshots/CAPTURE-CHECKLIST.md`) if shipping w/ submission

## Next — post-submission migration (T+0 to T+30d)

- [ ] **Operator outreach** — 15+ FoxxMD ContextMod operator pool (mods of r/mealtimevideos, r/piercing, etc) — DM template + migration guide already shipped at [`docs/migration-from-upstream-cm.md`](./docs/migration-from-upstream-cm.md)
- [ ] **Devvit App Directory review** — v0.3.2 publish + manual review (1-7 days)
- [ ] **Phase 4.7 image-mode repost** — perceptual blockhash for image dedupe (gated on spike GO)
- [ ] **Hard-mute integration** — wire `isRuleMuted` into `runCheck` so dashboard mute affects backend (currently soft-mute only — dashboard-side filter)
- [ ] **History rule perf audit** — verify the 1h author-history cache holds under busy-sub load (FETCH_LIMIT=100 per author)
- [ ] **`/api/stats` rollup widening** — beyond 50-event ring buffer (7-day rolling counts written by stats-rollup cron into a dedicated ZSET)
- [ ] **GitHub Discussions threads seeded** for top 5 migration questions

## Installed but not wired (deferred to scale-trigger)

- **react-window** — installed in v0.5.1 dev deps. Ring buffer caps at 50 events; drill-down requires variable row heights (FixedSizeList won't fit). When events:recent grows past ~100 OR a future product change adds a "show all history" view, wire as VariableSizeList w/ ResizeObserver-based row heights.

## Later — V1 maturity (T+30d to T+90d)

- [ ] **Lua/CAS replacement** — when/if Devvit Redis gains script support, replace the read-then-write monotonic pointer guard (W4) w/ a true atomic CAS — closes the residual TOCTOU window
- [ ] **Per-user (not per-sub) rate limit option** — current `cm:rl:explain:{sub}` is per-sub; a malicious mod could burn the sub's quota. Per-user keys for shared-mod-team scenarios
- [ ] **Wiki diff in `/api/config-history`** — server-side diff (instead of client-side LCS) for large configs that overflow the webview render budget
- [ ] **Rule library** — curated config snippets contributed by the operator community (extend `examples/` w/ author-tagged real-world configs)
- [ ] **MHS-equivalent toxicity scoring** — explore in-Devvit ML via webgpu transformers.js or similar. MHS itself is cut (PR #96 HTTP allowlist excludes ModerateHateSpeech)
- [ ] **Migration tool** — auto-convert FoxxMD ContextMod YAML configs → CM-Devvit JSON5 (currently manual per `docs/migration-from-upstream-cm.md`)
- [ ] **Dashboard webview embeds** — sparkline + stat cards as standalone Devvit Block components for mods who don't want the full custom post
- [ ] **Per-sub circuit breaker dashboards** — visible breaker state (open/half/closed) per external API (OpenAI, Wiki) in the activity feed

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
