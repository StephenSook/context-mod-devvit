## Description

<!-- What does this PR do? Link any related issue with "Fixes #123". -->

## Motivation

<!-- Why is this change needed? What's the use case or moderation pain point? -->

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactor / chore
- [ ] Test-only

## Phase scope

<!-- Which phase does this work belong to? See README "What's ported" for context. -->

- [ ] Phase 1 — core engine (handleActivity, runRule, runCheck, runRun, filters, namedRules, template, configStore)
- [ ] Phase 2 — action handlers + trigger routes
- [ ] Phase 3 — dashboard wire-up
- [ ] Phase 4 — stretch rules (history / attribution / recentActivity / repost)
- [ ] Phase 5+ — post-hackathon
- [ ] Not phase-tagged (docs, infra, tooling)

## How has this been tested?

<!-- Describe the tests you ran and how to reproduce. -->

- [ ] Unit tests pass (`npm test`)
- [ ] Type-check passes (`npm run type-check`)
- [ ] Lint passes (`npm run lint`)
- [ ] Manually tested in Devvit playtest (`devvit playtest <test-subreddit>`)
- [ ] Tested against the App Directory build (`devvit upload`)

## Checklist

- [ ] My code follows the project style (`npm run lint`)
- [ ] I have performed a self-review of my code
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally
- [ ] I have updated `CHANGELOG.md` under `## [Unreleased]`
- [ ] I have updated documentation where needed (README, DESIGN.md, etc.)
- [ ] My commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] I ran `./scripts/check-ai-tone.sh --strict` on any docs I changed
- [ ] No secrets, tokens, or `.env` files in the diff
- [ ] No hardcoded subreddit names or real Reddit user data in tests / fixtures
