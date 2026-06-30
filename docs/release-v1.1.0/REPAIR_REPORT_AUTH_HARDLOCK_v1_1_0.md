# Reparaturbericht — 666SOUNDsDESIGn WebRadio v1.1.0

## Quelle

```text
666WebRadio-666SOUNDsDESIGn.zip
```

Die Original-ZIP wurde nicht überschrieben. Sie wird im Full-Backup als unveränderte Referenz mitgeführt.

## Ausgangsbefund

```text
ZIP-Einträge:                 1263
Dateien:                       965
Ordner:                        298
Unkomprimierte Nutzdaten: 142544945 Bytes
Wrapper-Ebene:                 keine
```

Die Quelle enthielt lokale Git- und Wrangler-Zustände (`.git/`, `.wrangler/`). Diese sind für ein Deploy-Paket ungeeignet und wurden ausschließlich aus der reparierten Deploy-Version ausgeschlossen, nicht aus der Originalreferenz gelöscht.

## Kritische Auth-Probleme im Ausgangsstand

- Login-Ziel teilweise auf den Auth-Worker statt auf den Passwort-Worker gerichtet
- mehrere Browser-Auth-Wege und Legacy-Gates
- Passwortheader an Funktionsrouten
- unvollständige Issuer-/Scope-/Audience-Prüfung
- fehlende klare Service-zu-Service-Trennung
- Health-/Reachability-Logik konnte mit Auth-Status vermischt werden
- Discord- und Skip-Funktionen hatten abweichende Schutzwege
- Renderer-Service besaß einen separaten Browser-Passwortweg

## Reparierter Zielzustand

```text
Passwort-Worker /login
→ Token-Aussteller

Auth-Worker /verify
→ Token-Prüfer

WebRadio-Worker
→ Same-Origin-Broker und requireStrictAdmin()-Gate

Browser
→ genau ein window.S666AdminAuth
→ Bearer-Token nur für die aktuelle Sitzung
```

## Reparierte Funktionsbereiche

1. WebRadio Same-Origin Login Broker
2. sofortige Token-Verifikation nach Login
3. strikte Bearer-Verifikation vor jeder geschützten Aktion
4. Config Current/Backups/Update/Rollback
5. Skip / Next Track
6. Discord Write/Test/Debug
7. geschützter Service-Health-Überblick
8. Admin Overlay
9. Player Stage Skip/Admin-Zugriff
10. Discord Player Add-on
11. Renderer-Prozessroute als Service-to-Service
12. Root-/Public-/Legacy-Worker-Mirror-Parität
13. zentrale Versionsanzeige
14. Release-Strukturprüfung

## Nicht veränderte Kernbereiche

Die Reparatur hat keine pauschale Neugestaltung oder Kürzung vorgenommen. Insbesondere wurden Player-Audio-Transport, Streamproxy, interner Notfallplayer, Equalizer-WebAudio-Graph, GOVEE, Broadcast-History und visuelle Cockpit-Systeme nicht durch neue Parallelarchitekturen ersetzt.

## Wahrheitsgrenze

Lokal geprüft wurden Code, Routenvertrag, Origin-/Service-Token-Logik, Claim-Prüfung, Mirrors, Syntax und Paketstruktur. Nicht lokal beweisbar sind:

- Live-Code der externen Passwort- und Auth-Worker
- Gleichheit der real gesetzten Secrets
- reale achtstündige Tokenlaufzeit
- DNS und Custom Domains
- Cloudflare Bindings/KV/Secrets
- echte GitHub-, Render-, SHOUTcast-/SonicPanel- und Discord-Zugänge
- realer Produktionsdeploy

Diese Punkte bleiben End-to-End-Release-Gates.
