# 666 Chaos AI Track System v1.0.1

Separater Cloudflare-Worker für Chaos-/Fraggle-/Track-Prompt-Generierung.

## Reparaturstand

- keine Wildcard-CORS-Freigabe
- Origin-Allowlist über `ALLOWED_ORIGINS`
- begrenzte JSON-Bodies und klare 400/413/415-Antworten
- Auth- und Provider-Timeouts
- geschützter Debug-Endpunkt
- Story-Export-/Archiv-Gerüste melden ausdrücklich 501 statt False Success

## Einrichtung

`.dev.vars.example` kopieren, Werte lokal beziehungsweise als Cloudflare-Secrets setzen und `wrangler.jsonc` prüfen. Echte Secrets niemals committen.
