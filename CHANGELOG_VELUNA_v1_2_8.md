# CHANGELOG VELUNA v1.2.8

**Release:** `FULLVERSION_VELUNA_CENTRAL_BRANDING_RESPONSIVE_PLAYERS_v1.2.8`  
**Datum:** 2026-07-08

## Umbenennung und Routing
- Der eigenständige AMARIS-Miniplayer wurde kanonisch zu **VELUNA** umbenannt.
- Neuer Hauptendpunkt: `/veluna` und `/VELUNA`.
- Alte `/amaris`- und `/AMARIS`-Aufrufe bleiben ausschließlich als 308-Kompatibilitätsredirect auf `/veluna/` erhalten.
- Worker-Routing und Diagnoseausgaben wurden auf VELUNA umgestellt.

## Zentrale Assets ohne Kopienlawine
- Eine zentrale Registry unter `config/veluna-assets.js` steuert Hintergrund, Header, Stream-Fallback, App-Icons, Bottom-Banner und Splash-Animation.
- Alle Laufzeitassets liegen einmal kanonisch unter `assets/veluna/` und einmal als erforderlicher bytegleicher Cloudflare-Public-Spiegel unter `public/assets/veluna/`.
- Originaldateien bleiben zusätzlich als eindeutig benannte `*-original.*`-Quellen erhalten.

## Neue Bildzuordnung
- Gemeinsamer Hintergrund für Hauptplayer, VELUNA und Internal-Player.
- Breite responsive Headergrafik in reiner Player-/Panelbreite.
- Neues VELUNA-Stream-Fallbackbild.
- Einheitliches VELUNA-App-/Browser-/PWA-/Apple-/Android-Icon-Pack.
- Responsives VELUNA-Bottom-Banner: Desktop unter Haupt-/VELUNA-Player, mobil ausschließlich im VELUNA-Panel.
- Original-MP4 als interner animierter Ladebildschirm bei jedem Player-Aufruf; kein separater öffentlicher Landing-Screen.

- Konventionelle Favicon-Aliase (`favicon-16x16.png`, `favicon-32x32.png`) liegen im zentralen VELUNA-Icon-Pack.

## Layout
- iPhone-Viewport bleibt fest auf `100dvw × 100dvh`; Overlays verändern die Playergeometrie nicht.
- Eingabefelder bleiben bei 16 px, um Safari-Autozoom zu verhindern.
- Landscape-Touch zeigt ausschließlich das gemeinsame Hintergrundbild.
- PC-Layouts besitzen Mindest-/Maximalgrenzen und definierte Breakpoints statt unkontrolliertem Zusammenziehen oder Auseinanderziehen.

## Farbsystem
- Grüne Rahmen wurden durch Neon-Laserblau ersetzt.
- Türkis wurde zentral auf Neon-Laserblau umgebogen.
- Lila bleibt als Neon-Lila-Sekundärakzent.
- Pink bleibt Neon-Pink.
- Panelinnenflächen sind neutrales Dunkelgrau ohne Grün-/Türkisstich.

## Erhalten
- Hauptplayer, Internal-/Notfallplayer, Audio-Failover, Auth-Hardlock, Auto-DJ-Skip, Discord-Shooter, Booster, 5-Band-EQ, Levelmeter, Ticker- und Media-Session-Logik bleiben erhalten.
