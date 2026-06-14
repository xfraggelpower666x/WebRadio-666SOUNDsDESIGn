# Audio-Only MP3 Mastering System

This package is stripped down to audio pipeline parts only.

## Included
- Render Flask backend
- `/master` audio mastering
- `/analyze` audio analysis via `ffprobe`, `loudnorm`, `volumedetect`
- `/situate` mastering recommendation endpoint
- Cloudflare Worker bridge for `/master`, `/analyze`, `/situate`, `/transcribe`

## Not included
- lyrics frameworks
- UI dashboard
- job/session orchestration
- backup/web3/radio workers

## Render
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn src.server:app`

## Important
Runtime needs both `ffmpeg` and `ffprobe` available.
