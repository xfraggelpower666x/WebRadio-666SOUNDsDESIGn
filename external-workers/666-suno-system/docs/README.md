# 666 Suno System v1.0.1

Separater Cloudflare-Worker mit konfigurierbarem REST-Provideradapter.

## Reparaturstand

- keine erfundenen lokalen Job-Erfolge
- Create/Status/Result werden an den konfigurierten Provider weitergeleitet
- optional persistente Jobliste über `SUNO_JOBS_KV`
- keine Wildcard-CORS-Freigabe
- Origin-Allowlist über `ALLOWED_ORIGINS`
- begrenzte JSON-Bodies, Timeouts und bereinigte Providerfehler
- Debug-Endpunkt geschützt

## Voraussetzung

Ein realer API-Provider muss über `SUNO_API_BASE_URL`, Pfade, Auth-Header/-Schema und Job-ID-Feld passend konfiguriert werden. Ohne Providerkonfiguration antwortet der Worker ehrlich mit `503 provider_not_configured`.
