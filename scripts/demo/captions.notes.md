# Captions — usage notes

Two pre-baked SRTs ship in this directory:

- `captions-live-data.srt` — for the live-data demo path (Phase 1+2+3 backend shipped). 8 cue blocks. No truth caption.
- `captions-synthetic-fallback.srt` — for the synthetic-data fallback path (Phase 1/2/3 not fully shipped by 5/17). 9 cue blocks — same 8 VO cues + cue #6 which is the truth caption ("Dashboard rendered with ?demo=1 synthetic data. Phase 1 live-trigger wiring lands post-hackathon.") rendered concurrently with cue #5 from 36s→50s.

## Pre-baked text is APPROXIMATE — swap after recording

The cue text is pulled from `docs/submission/demo-video-script.md` beat-by-beat. Stephen's actual VO will paraphrase ~10-30% (per the outreach-paraphrase-pattern observation). After recording, **transcribe the actual VO** and replace each cue's text. The timestamps should already be close — the script enforces beat boundaries.

Workflow:

1. Open `captions-{live-data,synthetic-fallback}.srt` in any text editor
2. Play the recorded VO mp3/wav alongside
3. Replace each cue's text with what Stephen actually said
4. Keep timestamps as-is unless a beat overruns its boundary (then nudge by ≤200ms)
5. Save + run `stitch.sh` per below

## Stitch via `stitch.sh`

```bash
# Synthetic-data path
bash scripts/demo/stitch.sh --synthetic

# Live-data path
bash scripts/demo/stitch.sh --live
```

Inputs `stitch.sh` expects in `raw-obs/` + `raw-vo/`:

| Beat | OBS raw | VO raw |
|------|---------|--------|
| Cold open (0-8s) | `raw-obs/cold-open.mkv` | `raw-vo/vo-cold-open.wav` |
| History (8-22s) | `raw-obs/history.mkv` | `raw-vo/vo-history.wav` |
| Install (22-29s) | `raw-obs/install.mkv` | `raw-vo/vo-install.wav` |
| Wiki (29-36s) | `raw-obs/wiki.mkv` | `raw-vo/vo-wiki.wav` |
| Trigger (36-43s) | `raw-obs/trigger.mkv` | `raw-vo/vo-trigger.wav` |
| Dashboard (43-50s) | `raw-obs/dashboard.mkv` | `raw-vo/vo-dashboard.wav` |
| Wedge (50-58s) | `raw-obs/wedge.mkv` (or auto-drawtext) | `raw-vo/vo-wedge.wav` |
| Close (58-60s) | `raw-obs/close.mkv` (or auto-drawtext) | `raw-vo/vo-close.wav` |

Output: `beats/final.mp4` — captions baked in, ready for YouTube upload.

## Notes on ffmpeg subtitles filter

The synthetic-fallback SRT has cue #5 + cue #6 overlapping at 36s-43s (VO + truth caption). libass (the renderer behind ffmpeg's `subtitles=` filter) stacks them vertically. If they collide visually:

- Move cue #6 (truth caption) to drawtext filter instead — gives explicit positioning + style
- Reference: `docs/submission/demo-video-runbook.md` Caption-as-truth-telling section

## Font

`subtitles=` filter respects libass styling. Default font may render as Times-style. To force Geist Mono (project font):

```bash
ffmpeg -i input.mp4 \
  -vf "subtitles=captions.srt:force_style='FontName=Geist Mono,FontSize=22,PrimaryColour=&Hf5f5f4,Outline=1.5,Shadow=0.5'" \
  -c:a copy output.mp4
```

Geist Mono must be installed system-wide for libass to find it. Verify with `fc-list | grep -i geist` (after `brew install fontconfig` if needed).
