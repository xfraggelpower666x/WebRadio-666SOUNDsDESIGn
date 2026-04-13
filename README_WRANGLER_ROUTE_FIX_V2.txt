WRANGLER ROUTE FIX V2

Ziel:
- nur Routing in Wrangler korrigieren
- keine Worker-Logik anfassen
- keine Frontend-Dateien anfassen

Fix:
- Custom Domain Pattern jetzt mit /*
  webradio.666soundsdesign-broadcaster.com/*

Wichtig:
- enthält absichtlich KEIN worker.js
- nur wrangler.jsonc für GitHub/Cloudflare Deploy
