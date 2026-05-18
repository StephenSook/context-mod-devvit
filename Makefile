# X46 Makefile — common dev tasks. Wraps the npm scripts in package.json
# for muscle-memory + IDE-friendly target invocation. Keeps the
# canonical implementations in package.json (single source of truth).
#
# Usage: `make <target>`. `make help` lists everything.

.DEFAULT_GOAL := help
.PHONY: help install dev test test-watch type-check lint prettier coverage \
        preflight build clean ship e2e e2e-headed audit ai-tone full-check

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install:  ## npm ci — clean reproducible install
	npm ci

dev:  ## devvit playtest <subreddit> — set CM_PLAYTEST_SUB env or pass SUB=foo
	@if [ -z "$(SUB)" ]; then echo "usage: make dev SUB=<subreddit>" && exit 1; fi
	npx devvit playtest $(SUB)

test:  ## vitest run — 461+ tests, fast
	npm test

test-watch:  ## vitest --watch
	npm run test:watch

type-check:  ## tsc --build
	npm run type-check

lint:  ## eslint src/
	npm run lint

prettier:  ## prettier --write across whole repo
	npm run prettier

coverage:  ## vitest --coverage — outputs to ./coverage
	npx vitest run --coverage --config vitest.config.ts

preflight:  ## ./scripts/preflight.sh — dev env sanity check
	./scripts/preflight.sh

build:  ## vite build — server + client bundle into dist/
	npm run build

clean:  ## remove dist/ + coverage/ + playwright-report/ + test-results/
	rm -rf dist coverage playwright-report test-results .devvit

e2e:  ## npx playwright test — chromium headless
	npx playwright test

e2e-headed:  ## npx playwright test --headed — debug w/ visible browser
	npx playwright test --headed

audit:  ## npm audit + npm outdated
	npm audit --production
	npm outdated

ai-tone:  ## ./scripts/check-ai-tone.sh — soft AI-tone scan
	./scripts/check-ai-tone.sh

full-check: type-check lint test ai-tone  ## type-check + lint + test + ai-tone — pre-commit gate
	@echo "==> full-check passed ✓"

ship: full-check build  ## full-check + build, ready to push
	@echo "==> ready to push. Run: git push origin main"
