# 666SOUNDsDESIGn Handoff Paket

Enthalten:

- `MASTER_HANDOFF.md`  
  Gemeinsamer Handoff für Codebau, Repo-Struktur, Backend/Broker, Discord-Shooter, 666 RadioBotAI und Dashboard.

- `.env.example`  
  Sichere ENV-Vorlage mit Platzhaltern. Keine echten Secrets enthalten.

Wichtig:

- Echte Discord-Webhooks, Bot-Tokens, Admin-Tokens und GitHub-Tokens niemals ins Repo schreiben.
- Echte Werte in Cloudflare Worker Secrets, lokaler `.env`, iPhone Keychain oder privatem Secret Store speichern.
- Finaler Upload erfolgt zentral über die WebRadio-Repo-Struktur, nicht aus mehreren Chats parallel.

- `MASTER_HANDOFF.md` enthält jetzt zusätzlich Radioadressen, Hauptstream, Backup-Stream, Domainstream, MyIDJ/SonicPanel, TuneIn, GitHub Pages, Discord-Shooter-URLs und Brand-Schreibweisen.
- `.env.example` enthält passende URL-Keys und Brand-Keys mit öffentlichen URLs/Platzhaltern.
