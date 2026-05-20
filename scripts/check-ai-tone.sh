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

set -eo pipefail
set -u

# Blocklist (alphabetical)
BLOCKLIST=(
  amazing
  comprehensive
  cutting-edge
  delve
  ecosystem
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
  unlocked
)

# Em-dash detection (locked 2026-05-20 per no-em-dash-in-copy memory).
# U+2014 in prose is the single most reliable AI-tone tell. Default mode prints
# hits as a separate section so the word-blocklist scan stays unchanged; strict
# mode counts em-dash hits toward exit-1 just like blocklist hits.
EMDASH_CHAR=$'\xe2\x80\x94'

# Build alternation. We use BSD-compatible word-edge anchors instead of \b
# (which is POSIX-undefined and varies between GNU/BSD grep). [[:<:]] / [[:>:]]
# work on both BSD (macOS) and GNU when grep is invoked with -E.
pattern="[[:<:]]($(IFS='|'; echo "${BLOCKLIST[*]}"))[[:>:]]"

# GNU grep (Ubuntu CI runner) doesn't recognize [[:<:]] in ERE. Detect.
if ! echo "test" | grep -E "[[:<:]]test[[:>:]]" >/dev/null 2>&1; then
  # GNU grep fallback: \< and \> word boundaries (supported by both BRE + ERE
  # on GNU; not on BSD, but BSD already took the [[:<:]] branch above).
  pattern="\\<($(IFS='|'; echo "${BLOCKLIST[*]}"))\\>"
fi

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

# Run the scan, skip AITONE_IGNORE lines.
# Distinguish grep exit codes: 0=match, 1=no match (both OK), >=2=real error
# (permission denied, binary file, file vanished). Real errors count as hits
# so a broken docs file in CI can't silently green the build.
hits=0
for p in "${SCAN_PATHS[@]}"; do
  set +e
  out=$(grep -niE "$pattern" "$p" 2>&1)
  rc=$?
  set -e
  case $rc in
    0) ;;                # match
    1) continue ;;       # no match — next file
    *)
      echo "ERROR scanning $p (rc=$rc): $out" >&2
      hits=$((hits + 1))
      continue
      ;;
  esac
  # Process substitution (avoids `<<<` here-string temp-file dependency
  # that silently false-negatives in sandboxed environments where /tmp
  # is unwritable — Codex caught this Day 3).
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    # Only the literal HTML-comment marker counts as an escape.
    # Substring mentions of "AITONE_IGNORE" in prose do NOT bypass.
    if echo "$line" | grep -qF '<!-- AITONE_IGNORE -->'; then
      continue
    fi
    echo "$line"
    hits=$((hits + 1))
  done < <(printf '%s\n' "$out")
done

# Em-dash pass (separate from word blocklist so output stays readable).
emdash_hits=0
for p in "${SCAN_PATHS[@]}"; do
  set +e
  out=$(grep -nF "$EMDASH_CHAR" "$p" 2>&1)
  rc=$?
  set -e
  case $rc in
    0) ;;
    1) continue ;;
    *)
      echo "ERROR (em-dash scan) scanning $p (rc=$rc): $out" >&2
      emdash_hits=$((emdash_hits + 1))
      continue
      ;;
  esac
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    if echo "$line" | grep -qF '<!-- AITONE_IGNORE -->'; then
      continue
    fi
    echo "[em-dash] $line"
    emdash_hits=$((emdash_hits + 1))
  done < <(printf '%s\n' "$out")
done

echo ""
if [ "$hits" -eq 0 ] && [ "$emdash_hits" -eq 0 ]; then
  echo "✓ no AI-tone hits across ${#SCAN_PATHS[@]} file(s) (blocklist + em-dash both clean)"
  exit 0
fi

if [ "$hits" -gt 0 ]; then
  echo "⚠ ${hits} AI-tone blocklist hit(s) across ${#SCAN_PATHS[@]} file(s)"
  echo "  Blocklist: ${BLOCKLIST[*]}"
fi
if [ "$emdash_hits" -gt 0 ]; then
  echo "⚠ ${emdash_hits} em-dash (U+2014) hit(s) across ${#SCAN_PATHS[@]} file(s)"
  echo "  Substitutes: period, colon, comma, parens, hyphen, or restructure. See [[no-em-dash-in-copy]] memory."
fi
echo ""
echo "  False-positive escape: add '<!-- AITONE_IGNORE -->' on the same line."

if [ "$STRICT" -eq 1 ]; then
  exit 1
fi
exit 0
