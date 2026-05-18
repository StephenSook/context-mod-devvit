#!/usr/bin/env bash
# X65 / X66 — generate or upload the GitHub repo social-preview image.
#
# Two assets exist in this repo:
#   assets/social-preview.png   (May 13 — your hand-designed PNG)
#   assets/social-preview.svg   (May 18 — Wave Z auto-gen SVG w/ stat cards)
#
# Usage:
#   ./scripts/set-social-preview.sh           — show both options + upload URL
#   ./scripts/set-social-preview.sh --regen   — convert SVG → social-preview-wave-z.png
#                                              (does NOT overwrite the May 13 PNG)

set -euo pipefail

SVG=assets/social-preview.svg
OLD_PNG=assets/social-preview.png
NEW_PNG=assets/social-preview-wave-z.png

if [ "${1:-}" = '--regen' ]; then
  if ! command -v rsvg-convert > /dev/null 2>&1 && ! command -v convert > /dev/null 2>&1; then
    echo "ERR: install librsvg ('brew install librsvg') or ImageMagick ('brew install imagemagick') first"
    exit 1
  fi
  if command -v rsvg-convert > /dev/null 2>&1; then
    rsvg-convert -w 1280 -h 640 "$SVG" -o "$NEW_PNG"
  else
    convert -background none -resize 1280x640 "$SVG" "$NEW_PNG"
  fi
  echo "==> generated $NEW_PNG (Wave-Z SVG variant — distinct from your May 13 $OLD_PNG)"
  exit 0
fi

cat <<EOF
==> Social preview options:

  1. $OLD_PNG    (May 13 — your hand-designed)
  2. $SVG     (May 18 — Wave Z auto-gen SVG, run --regen to convert to PNG)

==> Upload one of them via GitHub UI:
    https://github.com/StephenSook/context-mod-devvit/settings
    -> scroll to "Social preview" -> upload the PNG of choice.

==> Or regenerate the Wave Z PNG variant first:
    ./scripts/set-social-preview.sh --regen
    # produces assets/social-preview-wave-z.png alongside the May 13 PNG

==> CLI upload is not exposed by gh — manual repo-settings upload is the only path today.
EOF
