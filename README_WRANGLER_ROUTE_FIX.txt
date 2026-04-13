WRANGLER ROUTE FIX ONLY

Ziel:
- keine Worker-Logik anfassen
- nur Domain/Routing in Wrangler festziehen
- GitHub/Cloudflare Deploy soll die Custom Domain direkt mitnehmen

WICHTIG:
- Diese Datei setzt NUR die Custom Domain:
  webradio.666soundsdesign-broadcaster.com

- Die grobe Alt-Route
  666soundsdesign-broadcaster.com/*
  gehört NICHT in diese Wrangler-Datei.

- Dieses Paket enthält absichtlich KEIN worker.js,
  damit der funktionierende Worker-Code nicht überschrieben wird.

Upload:
1. ZIP entpacken
2. nur den enthaltenen Ordnerinhalt hochladen
3. Scriptable → GitHub
4. Deploy abwarten
