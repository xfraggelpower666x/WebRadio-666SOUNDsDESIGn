666SOUNDsDESIGn — FINAL MERGED PROJECT

This package uses the Neocities host project as the base and adds:
- SoundLab as a menu item (soundlab.html)
- API bridge + local fallback
- Cloudflare Worker for SongLab endpoints
- Lyrics archive data files
- extracted framework sources for reference
- source/workspace archives and package zips

Main runtime entry points:
- index.html
- soundlab.html
- js/sd-system.js
- js/soundlab-api.js
- js/soundlab-page.js
- worker/songlab-api-worker.js

Data files:
- data/lyrics_archive_database_clean.txt
- data/lyrics_archive_index_clean.csv
- data/duplicate_clean_report.txt

Security note:
- js/config.js has adminPassword cleared.
- Set secrets in the Worker instead.
