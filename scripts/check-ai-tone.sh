#!/usr/bin/env bash
#
# AI-tone blocklist scanner for submission-day docs + README.
#
# Background:
# u/Watchful1 publicly flagged AI-style replies in r/Devvit as "minus points"
# during the hackathon period. Submission text that reads AI-generated is
# a credibility hit. This script catches the obvious tells before commit
# or before final submission.
#
# Usage:
#   ./scripts/check-ai-tone.sh                          # default scan: README + docs/submission/
#   ./scripts/check-ai-tone.sh <file> [<file>...]       # scan specific files
#   ./scripts/check-ai-tone.sh --strict                 # exit non-zero on any hit
#
# Default mode is "warning" — prints hits and exits 0 so CI doesn't block.
# Strict mode is for pre-submission gates.
#
# False-positive handling:
# Lines containing the literal blocklist words AS examples (in voice-rule
# instructions, scan-instructions, etc.) are skipped via the AITONE_IGNORE
# marker. Add `<!-- AITONE_IGNORE -->` on the same line to whitelist.

set -u

# Blocklist — alphabetical, word-boundary matched
BLOCKLIST=(
  amazing
  cutting-edge
  delve
  effortlessly
  elevate
  empower
  easily
  intuitive
  leverage
  powerful
  revolutionary
  robust
  seamless
  simply
  sophisticated
  streamline
  transform
)

# Build alternation regex
pattern="\\b($(IFS='|'; echo "${BLOCKLIST[*]}"))\\b"

STRICT=0
declare -a FILES=()

for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    *) FILES+=("$arg") ;;
  esac
done

# Default scan targets
if [ ${#FILES[@]} -eq 0 ]; then
  FILES=(
    README.md
    docs/submission
  )
fi

# Collect all .md files under the targets
declare -a SCAN_PATHS=()
for f in "${FILES[@]}"; do
  if [ -d "$f" ]; then
    while IFS= read -r mdf; do
      SCAN_PATHS+=("$mdf")
    done < <(find "$f" -type f -name '*.md')
  elif [ -f "$f" ]; then
    SCAN_PATHS+=("$f")
  fi
done

if [ ${#SCAN_PATHS[@]} -eq 0 ]; then
  echo "no files to scan"
  exit 0
fi

# Run the scan, skip AITONE_IGNORE lines
hits=0
for p in "${SCAN_PATHS[@]}"; do
  while IFS= read -r line; do
    # line format: filename:N:content
    # Tighten: only the literal HTML-comment marker form counts as an escape.
    # Substring "AITONE_IGNORE" in documentation/instruction prose does NOT bypass.
    if echo "$line" | grep -qF '<!-- AITONE_IGNORE -->'; then
      continue
    fi
    echo "$line"
    hits=$((hits + 1))
  done < <(grep -niE "$pattern" "$p" 2>/dev/null || true)
done

echo ""
if [ "$hits" -eq 0 ]; then
  echo "✓ no AI-tone blocklist hits across ${#SCAN_PATHS[@]} file(s)"
  exit 0
fi

echo "⚠ ${hits} AI-tone blocklist hit(s) across ${#SCAN_PATHS[@]} file(s)"
echo ""
echo "  Blocklist: ${BLOCKLIST[*]}"
echo ""
echo "  False-positive escape: add '<!-- AITONE_IGNORE -->' on the same line."

if [ "$STRICT" -eq 1 ]; then
  exit 1
fi
exit 0
