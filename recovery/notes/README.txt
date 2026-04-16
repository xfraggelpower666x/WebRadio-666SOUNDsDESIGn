666SOUNDsDESIGn Recovery System

Purpose:
This directory protects the currently working live worker system.

Structure:
- last-known-good/
  Contains the current verified working worker.

- snapshots/
  Contains historical backups before changes.

- notes/
  Contains recovery instructions.

Rules:
- NEVER deploy without backup.
- ALWAYS keep a known-good worker copy.
- The active live worker files must remain mirrored:
  - /worker.js
  - /workers/webradio-666soundsdesign-worker/worker.js

Restore:
1. Take the file from:
   /recovery/last-known-good/666SOUNDsDESIGn_worker.js
2. Copy that exact content back into:
   - /worker.js
   - /workers/webradio-666soundsdesign-worker/worker.js
3. Deploy again.

Policy:
- ADD ONLY
- NO DELETE
- NO SILENT REPLACE
- KEEP THE WORKING SYSTEM PROTECTED
