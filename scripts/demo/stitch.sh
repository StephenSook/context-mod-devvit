#!/usr/bin/env bash
set -euo pipefail

# Demo stitch script — concat per-beat raw OBS clips, mux VO, bake captions, output final mp4.
#
# Usage:
#   bash scripts/demo/stitch.sh --live        # Phase 1+2+3 backend shipped, real trigger demo
#   bash scripts/demo/stitch.sh --synthetic   # Phase 1 slipped, ?demo=1 fallback path
#
# Reads from:    raw-obs/{beat}.mkv  +  raw-vo/vo-{beat}.wav
# Writes to:     beats/concat-raw.mp4  +  beats/final.mp4
# Captions src:  scripts/demo/captions-{live-data,synthetic-fallback}.srt

MODE="${1:---live}"
case "$MODE" in
  --live)       SRT="scripts/demo/captions-live-data.srt" ;;
  --synthetic)  SRT="scripts/demo/captions-synthetic-fallback.srt" ;;
  *)            echo "Usage: $0 [--live|--synthetic]"; exit 2 ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

mkdir -p beats raw-obs raw-vo

BEATS=(cold-open history install wiki trigger dashboard wedge close)
declare -A BEAT_DURATIONS=(
  [cold-open]=8 [history]=14 [install]=7 [wiki]=7
  [trigger]=7 [dashboard]=7 [wedge]=8 [close]=2
)

echo "[stitch] mode=$MODE  srt=$SRT"
echo "[stitch] beats: ${BEATS[*]}"

# 1. Per-beat: mux OBS video + VO audio, trim to exact beat length, force 1920x1080 30fps.
for beat in "${BEATS[@]}"; do
  obs="raw-obs/${beat}.mkv"
  vo="raw-vo/vo-${beat}.wav"
  out="beats/${beat}.mp4"
  dur="${BEAT_DURATIONS[$beat]}"

  if [[ ! -f "$obs" ]]; then
    echo "[stitch] WARN: $obs missing — skipping beat $beat (will fail at concat)"
    continue
  fi
  if [[ ! -f "$vo" ]]; then
    echo "[stitch] WARN: $vo missing — using silence track for beat $beat"
    ffmpeg -y -i "$obs" -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=48000" \
      -t "$dur" -vf "scale=1920:1080,fps=30" -c:v libx264 -preset slow -crf 18 \
      -c:a aac -b:a 192k -shortest "$out"
  else
    ffmpeg -y -i "$obs" -i "$vo" \
      -t "$dur" -vf "scale=1920:1080,fps=30" -c:v libx264 -preset slow -crf 18 \
      -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest "$out"
  fi
done

# 2. Concat per-beat clips into single raw mp4.
:> beats/list.txt
for beat in "${BEATS[@]}"; do
  if [[ -f "beats/${beat}.mp4" ]]; then
    echo "file '${beat}.mp4'" >> beats/list.txt
  fi
done

ffmpeg -y -f concat -safe 0 -i beats/list.txt -c copy beats/concat-raw.mp4

# 3. Bake captions via libass. Geist Mono if installed; falls back to default.
# Synthetic mode: overlay the truth caption via drawtext, persisting 36s-50s.
# Position: TOP-right so it doesn't collide with the bottom-margin SRT subtitle
# stack (libass uses MarginV=40 from the bottom).
# Font path discovery is portable: try a list of known free-or-system fonts and
# pick the first that exists. Drop the fontfile arg if none found — ffmpeg's
# default font handles ASCII fine, just less-pretty.
if [[ "$MODE" == "--synthetic" ]]; then
  TRUTH_FONT=""
  for fp in \
    "/System/Library/Fonts/Geneva.ttc" \
    "/System/Library/Fonts/SFNS.ttf" \
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" \
    "/usr/share/fonts/dejavu/DejaVuSans.ttf"; do
    if [[ -f "$fp" ]]; then TRUTH_FONT="fontfile=$fp:"; break; fi
  done
  TRUTH_OVERLAY=",drawtext=text='Dashboard rendered with ?demo=1 synthetic data.\nPhase 1 live-trigger wiring lands post-hackathon.':${TRUTH_FONT}fontsize=18:fontcolor=white@0.85:box=1:boxcolor=black@0.55:boxborderw=10:x=w-text_w-32:y=32:enable='between(t\,36\,50)'"
else
  TRUTH_OVERLAY=""
fi

ffmpeg -y -i beats/concat-raw.mp4 \
  -vf "subtitles=${SRT}:force_style='FontName=Geist Mono,FontSize=22,PrimaryColour=&Hf5f5f4,Outline=1.5,Shadow=0.5,MarginV=40'${TRUTH_OVERLAY}" \
  -c:v libx264 -preset slow -crf 18 \
  -c:a copy \
  beats/final.mp4

# 4. Final-check duration. Devpost 60s hard cap — check fractional + non-numeric.
# `dur_raw=$(ffprobe ...)` under `set -e` aborts script on non-zero ffprobe exit,
# so we can't capture rc via $? — wrap in `|| handle` instead.
dur_raw=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 beats/final.mp4 2>/dev/null) || {
  echo "[stitch] ERROR: ffprobe failed — beats/final.mp4 missing or unreadable"
  exit 1
}
if [[ -z "$dur_raw" || "$dur_raw" == "N/A" ]]; then
  echo "[stitch] ERROR: ffprobe returned empty/N-A duration: '$dur_raw'"
  exit 1
fi
# Reject non-numeric. awk treats "abc" as 0 silently — explicit check first.
if ! awk -v d="$dur_raw" 'BEGIN { if (d == "0" || d+0 != 0) { exit 0 } exit 1 }'; then
  echo "[stitch] ERROR: ffprobe returned non-numeric duration: '$dur_raw'"
  exit 1
fi
echo "[stitch] final duration: ${dur_raw}s (Devpost cap 60.0)"
if awk -v d="$dur_raw" 'BEGIN { exit !(d+0 > 60.0) }'; then
  echo "[stitch] WARN: final ${dur_raw}s exceeds 60.0s hard cap — trim a beat or speed up VO"
  exit 1
fi

echo "[stitch] ✅ beats/final.mp4 ready for YouTube upload (unlisted)"
