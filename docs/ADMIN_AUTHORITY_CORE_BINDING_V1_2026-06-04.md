# ADMIN AUTHORITY CORE BINDING V1 — 2026-06-04

## Zweck

Admin-Menü auf PC und iPhone wieder sicher erreichbar machen und an die reparierten Authority-Core-Worker anbinden.

## Authority Core

```text
PW Worker Login:
https://666-system-pw.666soundsdesign-broadcaster.com/login

AUTH Worker Verify:
https://666-system-auth.666soundsdesign-broadcaster.com/verify

PW Health:
https://666-system-pw.666soundsdesign-broadcaster.com/health

AUTH Health:
https://666-system-auth.666soundsdesign-broadcaster.com/health
```

## Änderungen

```text
- falscher Login-Endpunkt korrigiert: Login liegt beim PW Worker, nicht beim Auth Worker
- Auth Verify URL ergänzt
- Admin-Overlay-Opener als globaler S666AdminOverlay.open() abgesichert
- iPhone Mobile Hub ADMIN an Admin-Overlay gebunden
- fehlender Admin-Button wird defensiv ergänzt
- PC + iPhone Overlay-Größe abgesichert
```

## Nicht geändert

```text
- keine Stream-Routen
- keine Discord-Secrets
- keine Worker-Routes
- keine Cloudflare Deploy-Route
```

Build: `v2026.06.04-admin-auth-fix-v1`
Cache: `admin-auth-fix-v1-20260604`
