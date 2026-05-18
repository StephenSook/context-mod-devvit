#!/usr/bin/env bash
# Z4-X65 — convert assets/social-preview.svg → PNG and upload as GitHub
# social-preview image. Requires librsvg2-bin (rsvg-convert) or
# ImageMagick (convert). Stephen runs this manually once.
#
# Usage: ./scripts/set-social-preview.sh

set -euo pipefail

SVG=assets/social-preview.svg
PNG=assets/social-preview.png

if [ ! -f "$SVG" ]; then
  echo "ERR: $SVG not found"
  exit 1
fi

if command -v rsvg-convert > /dev/null 2>&1; then
  rsvg-convert -w 1280 -h 640 "$SVG" -o "$PNG"
elif command -v convert > /dev/null 2>&1; then
  convert -background none -resize 1280x640 "$SVG" "$PNG"
else
  echo "ERR: neither rsvg-convert nor convert (ImageMagick) found"
  echo "Install one of:"
  echo "  brew install librsvg"
  echo "  brew install imagemagick"
  exit 1
fi

echo "==> generated $PNG"

if command -v gh > /dev/null 2>&1; then
  echo "==> uploading to GitHub repo social-preview..."
  gh api -X PATCH /repos/StephenSook/context-mod-devvit \
    -F "social_preview=@$PNG" || {
      echo "Note: GitHub API doesn't accept this via gh — upload manually at:"
      echo "https://github.com/StephenSook/context-mod-devvit/settings"
      echo "(Social preview section — drag $PNG into the upload zone)"
    }
else
  echo "==> gh CLI not found. Upload manually at:"
  echo "https://github.com/StephenSook/context-mod-devvit/settings"
fi
