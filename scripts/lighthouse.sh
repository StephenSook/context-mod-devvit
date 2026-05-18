#!/usr/bin/env bash
# Z3-X52 Lighthouse — local manual run for the Observatory dashboard.
# Requires the dev:web mock server running on port 5173 (binds 127.0.0.1).
#
# Usage:
#   1. Terminal 1: npm run dev:web
#   2. Terminal 2: ./scripts/lighthouse.sh
#
# Output: ./lighthouse-report.html — open in browser to inspect Performance,
# Accessibility, Best Practices, SEO scores.

set -euo pipefail

if ! command -v npx > /dev/null 2>&1; then
  echo "ERR: npx not found"
  exit 1
fi

if ! curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5173/ | grep -q '^200$'; then
  echo "ERR: dev server not responding on http://127.0.0.1:5173 — run 'npm run dev:web' in another terminal first"
  exit 1
fi

OUT=lighthouse-report.html
echo "==> running Lighthouse against http://127.0.0.1:5173/?demo=1"
npx --yes lighthouse http://127.0.0.1:5173/?demo=1 \
  --output html \
  --output-path "$OUT" \
  --chrome-flags='--headless --no-sandbox' \
  --only-categories=performance,accessibility,best-practices,seo

echo "==> report: $OUT — open in browser"
