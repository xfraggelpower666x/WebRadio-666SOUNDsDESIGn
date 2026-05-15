# SETUP — CHAOS MATRIX CONTROL

## Cloudflare Secrets setzen

Dashboard:

```text
Worker → Settings → Variables and Secrets
```

Anlegen:

```text
SUNO_API_KEY
SUNO_API_BASE
```

Oder per Wrangler:

```bash
wrangler secret put SUNO_API_KEY
wrangler secret put SUNO_API_BASE
```

## Nach Deploy testen

```text
https://webradio.666soundsdesign-broadcaster.com/chaos-system
https://webradio.666soundsdesign-broadcaster.com/api/suno-test
```

## Erwartung

`/chaos-system` öffnet die HTML-Seite.

`/api/suno-test` zeigt, ob ENV/Secrets vorhanden sind, ohne deren Werte auszugeben.


## Auto-Deploy / Wrangler JSONC Secret Declaration

Für den GitHub → Cloudflare Auto-Deploy Workflow ist zusätzlich vorgesehen:

```json
{
  "keep_vars": true,
  "secrets": {
    "required": ["SUNO_API_KEY", "SUNO_API_BASE"]
  }
}
```

Das deklariert nur die Namen der Secrets. Die echten Werte bleiben in Cloudflare und werden nicht ins Repo geschrieben.


## Deploy-Safe Wrangler Config

Aktiv ist bewusst nur:

```json
{
  "keep_vars": true
}
```

Die harten Secret-Pflichten `secrets.required` sind **nicht aktiv**, damit dein GitHub → Cloudflare Auto-Deploy nicht fehlschlägt, falls die SUNO-Secrets noch fehlen.

Die optionale Vorlage liegt in:

```text
wrangler.secrets.required.example.jsonc
```
