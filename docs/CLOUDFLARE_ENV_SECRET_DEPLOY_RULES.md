# CLOUDFLARE ENV / SECRET DEPLOY RULES

## Aktive Sicherheitseinstellung

Die aktive `wrangler.jsonc` nutzt:

```json
{
  "keep_vars": true
}
```

Das schützt dashboard-/extern verwaltete Variablen beim Deploy.

## Warum `secrets.required` NICHT aktiv ist

Cloudflare kann `secrets.required` beim Deploy validieren. Wenn `SUNO_API_KEY` oder `SUNO_API_BASE` noch nicht in Cloudflare gesetzt sind, kann der Auto-Deploy fehlschlagen.

Darum liegt die Required-Secrets-Variante nur als Beispiel hier:

```text
wrangler.secrets.required.example.jsonc
```

## Erwartete Secrets für später

```text
SUNO_API_KEY
SUNO_API_BASE
```

## Wichtig

- Keine Secret-Werte im Repo.
- Keine vorhandenen Secrets werden gelöscht.
- Kein `wrangler secret delete`.
- `/api/suno-generate` ist aktuell Safe/Dry-Run und erzeugt keine echten Provider-Kosten.
- `/api/suno-test` zeigt nur Boolean-Status, niemals echte Werte.

## Test-URLs nach Deploy

```text
https://webradio.666soundsdesign-broadcaster.com/chaos-system
https://webradio.666soundsdesign-broadcaster.com/api/suno-test
```
