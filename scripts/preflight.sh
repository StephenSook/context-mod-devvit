#!/usr/bin/env bash
# X47 preflight — verify the dev env is ready BEFORE running anything destructive
# (devvit playtest, devvit upload, etc). Run via `./scripts/preflight.sh` or
# wire into a Makefile target.

set -euo pipefail

ok=true
fail() { echo "  ❌ $1"; ok=false; }
warn() { echo "  ⚠  $1"; }
pass() { echo "  ✓ $1"; }

echo "==> preflight: context-mod-devvit"

# Node
if command -v node > /dev/null 2>&1; then
  node_v=$(node --version)
  case "$node_v" in
    v22.*|v23.*|v24.*) pass "node $node_v" ;;
    *) fail "node $node_v — need v22+ (see .nvmrc)" ;;
  esac
else
  fail "node not found"
fi

# npm
if command -v npm > /dev/null 2>&1; then
  pass "npm $(npm --version)"
else
  fail "npm not found"
fi

# Devvit CLI
if command -v devvit > /dev/null 2>&1; then
  pass "devvit $(devvit --version 2>&1 | head -1)"
elif command -v npx > /dev/null 2>&1; then
  warn "devvit CLI not on PATH — npx devvit will work but slower"
else
  fail "no devvit CLI + no npx"
fi

# gh
if command -v gh > /dev/null 2>&1; then
  if gh auth status > /dev/null 2>&1; then
    pass "gh authenticated"
  else
    warn "gh present but not authenticated (run: gh auth login)"
  fi
else
  warn "gh CLI not found — won't be able to manage GitHub releases locally"
fi

# node_modules
if [ -d node_modules ]; then
  pass "node_modules present"
else
  warn "node_modules missing — run: npm ci"
fi

# Dev server port
if lsof -i :5173 > /dev/null 2>&1; then
  warn "port 5173 in use — vite dev server will fail. kill: lsof -ti :5173 | xargs kill -9"
else
  pass "port 5173 free"
fi

# Git tree
if [ -d .git ]; then
  pass "git repo"
  if [ -n "$(git status --porcelain)" ]; then
    warn "working tree dirty — commit or stash before deploy"
  fi
else
  fail "not a git repo"
fi

echo ""
if [ "$ok" = true ]; then
  echo "==> preflight ok ✓"
  exit 0
else
  echo "==> preflight FAILED ❌  — fix the issues above before deploy"
  exit 1
fi
