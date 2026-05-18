# Contributing to context-mod-devvit

Thanks for your interest in contributing. This doc describes how to get set up + the conventions we follow.

## Before you start

Read these in order — they encode the load-bearing decisions any change must respect:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — 10 ADR-style sections, the load-bearing invariants
- [`THREAT-MODEL.md`](./THREAT-MODEL.md) — STRIDE inventory + the per-handler safety guarantees
- [`PRIVACY.md`](./PRIVACY.md) + [`data-retention.md`](./data-retention.md) — every Redis key + TTL policy
- [`API.md`](./API.md) — auth tier + request/response for every `/api/*` endpoint
- [`ROADMAP.md`](./ROADMAP.md) — what's coming + what's intentionally out of scope

## Code of Conduct

By participating, you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

1. Fork + clone the repo.
2. Install dependencies: `npm install`
3. Install Devvit CLI: `npm install -g devvit`
4. Authenticate: `devvit login`
5. Run locally against a test subreddit: `devvit playtest <your-test-subreddit>`

You'll need Node 22+ (per `.github/workflows/ci.yml`). Devvit dependencies are pinned to exact versions in `package.json` — do not bump them without a corresponding playtest pass.

## How to contribute

### Filing issues

- Search existing issues first (closed + open).
- Use the bug-report or feature-request template at `.github/ISSUE_TEMPLATE/`.
- For security issues, see [SECURITY.md](SECURITY.md) — do not open a public issue.

### Pull requests

- Open against the `main` branch.
- Keep PRs small + focused (< 400 lines diff where reasonable).
- One logical change per PR. Split refactors from feature work.
- Link the issue you're fixing with `Fixes #N`.
- Fill out the PR template completely (`.github/PULL_REQUEST_TEMPLATE.md`).

### Branch naming

- `feat/<short-description>` for features
- `fix/<short-description>` for bug fixes
- `docs/<short-description>` for documentation
- `chore/<short-description>` for tooling/cleanup
- `test/<short-description>` for test-only changes

### Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add karma-floor rule
fix(idem): handle Redis err in firstSeen — fail-closed
docs(readme): document the migration story
chore(deps): bump devvit to 0.12.24
test(idem): add canonical FNV-1a vectors
```

Keep commits atomic — one logical change per commit. Per the project's green-dot policy, every logical fix gets its own commit.

### Code style

- TypeScript strict mode (full strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride`).
- Run `npm run type-check && npm run lint && npm test && npm run prettier` before committing — the locked pre-commit triplet.
- Prettier defaults + ESLint with the project config.
- The client uses Tailwind tokens defined in `tailwind.config.ts` — see [DESIGN.md](DESIGN.md) for the visual system. Don't hardcode hex colors in components.
- Comments encode WHY, not WHAT — well-named identifiers handle WHAT.
- Avoid Codex/Wave provenance prefixes in comments (`Codex H4`, `Wave U BLOCKER fix`, etc) — keep the rationale, strip the label.

### Testing

- Add unit tests for new logic (`npm test`).
- Manually verify in `devvit playtest <test-subreddit>` before requesting review.
- Do not commit fixtures containing real Reddit user data.

### Changelog

- Add an entry under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md).
- Use the Keep a Changelog headings (Added / Changed / Deprecated / Removed / Fixed / Security).

### AI-tone scan

- Run `./scripts/check-ai-tone.sh --strict` on any docs you change.
- The CI workflow runs it as a soft check on every push.

## Devvit-specific gotchas

The Devvit platform is opinionated. Things that have bitten us:

- **Redis primitives are constrained** — no Lists, no Sets. Use strings, hashes, sorted sets, plus the supported transactions + bitfield primitives where needed. Design ring buffers as ZSETs (`events:recent` pattern).
- **At-least-once trigger delivery** — every trigger handler must be idempotent. We use `cm:proc:{thingId}` 24h NX SETNX for trigger-level + `cm:action:pending:{hash}` 5m + `cm:action:done:{hash}` 7d for per-action.
- **CSP blocks runtime code-string evaluation** — libraries that use it (e.g., older Framer Motion) won't work. Stick to CSS keyframes.
- **HTTP fetch policy** — outbound HTTP needs domain allowlisting. Reddit-owned hosts (`i.redd.it`, `preview.redd.it`, `external-preview.redd.it`, `external-i.redd.it`) are in the global allowlist. Other domains need explicit Reddit approval (up to 4 business days). AI provider domains are locked to OpenAI + Gemini as of `reddit/devvit-docs` PR #96 (2026-05-08).
- **`splash` parameter is deprecated June 2026** — use `entry` + `textFallback` in `submitCustomPost`.
- **Custom-post webview iframe needs Vite `base: './'`** — relative asset paths or the bundle 404s.

## Review process

- A maintainer will review within ~7 days.
- All CI checks must pass: type-check + lint + 481+ vitest tests + Playwright E2E (chromium on PRs, +firefox/webkit on main) + axe-core a11y + AI-tone soft scan + CodeQL SAST + Semgrep OWASP + dependency-cruiser.
- At least one approving review is required before merge.
- Security-sensitive paths (auth, idem, rate-limit, breaker, OpenAI integration) require `@StephenSook` review per `.github/CODEOWNERS`.
- Squash-merge is the default merge strategy — squashed commits inherit the PR title.

### Sub-agent review chain (heavyweight changes)

WAVE-class changes (anything touching `src/lib/*`, `src/core/*`, auth, idem, or external HTTP) get a 4-agent parallel review before tagging:

- `codex:codex-rescue` — adversarial pass on risky paths
- `pr-review-toolkit:silent-failure-hunter` — error-handling + fallback audit
- `pr-review-toolkit:type-design-analyzer` — discriminated unions + invariant expression
- `cc-gemini-plugin:gemini-agent` — architecture sweep at large-context scope

Findings get integrated as follow-up commits before the release tag. See `CHANGELOG.md` Wave W + X entries for the pattern in practice.

## Phase scope (for context)

Active work is tracked on the [FoxxMD/ContextMod Devvit project board](https://github.com/users/FoxxMD/projects/6). Cards are tagged `[P1]` through `[P6]` for phase grouping:

- **P1** — Core engine: `handleActivity`, `runRun`, `runCheck`, `runRule`, filters, named rules, template, config store
- **P2** — Action handlers + trigger routes
- **P3** — Dashboard wire-up to live data
- **P4** — Stretch rules (history, attribution, recentActivity, repost). `mhs` is cut per Reddit PR #96
- **P5** — Demo + submission
- **P6** — Ship + post-hackathon

If you're picking up a card, comment on the GitHub Issue (or the kanban card body) before starting so we don't dup work.

## License

By contributing, you agree your contributions will be licensed under the MIT License (see [LICENSE](LICENSE)).
