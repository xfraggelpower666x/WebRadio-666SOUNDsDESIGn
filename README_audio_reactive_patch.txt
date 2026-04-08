Patched complete radio package based on the user's original project.

What was added:
- js/audio-reactive-engine.js
- css/audio-reactive-engine.css
- overlay canvases in index.html
- original js/app.js backed up to js/app.original-backup.js

Worker target:
https://666soundsdesign-radio-worker.fraggelpower666.workers.dev/api/radio

Endpoints used by the audio-reactive engine:
- /stream
- /metadata
- /history

Notes:
- This package keeps the original project structure and assets.
- The new engine runs in the browser and does not require a new worker.
