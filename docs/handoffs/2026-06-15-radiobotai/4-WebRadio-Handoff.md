# PORTABLE HAND-OFF — 666SOUNDsDESIGn WEBRADIO / 666 STREAM PLAYER
# Zweck: Weitergabe an anderen Chat / Agent / Codex / Entwickler
# Priorität: Fehlerlage, bisherige Änderungen, offene Änderungen, Architektur-Schutz
# Stand: aktuelle Repo-Basis vom Nutzer hochgeladen und als maßgebend gesetzt
# Wichtig: KEIN BLINDPATCH, KEINE SECRETS, KEINE REPO-VERMÜLLUNG

────────────────────────────────
0. KURZFAZIT
────────────────────────────────

Das Projekt ist ein komplexer WebRadio-/StreamPlayer mit PC-, iPhone-/Mobile- und Worker-/Fallback-Struktur.

Aktuelles Hauptproblem:
Der Player hat weiterhin Aussetzer, die sich anfühlen wie zusätzliches Buffern oder Neu-Laden des Streams.

Wichtigster technischer Verdacht:
Mehrere Audio-/Recovery-/Selfheal-Layer greifen auf dasselbe Audioelement oder dieselbe Streamlogik zu.
Dadurch können load(), src-Reset, reconnect oder play()-Versuche parallel passieren.
Das erzeugt gefühltes Zusatz-Buffering.

Aktuelle Aufgabe:
Nicht einfach neuen Layer bauen.
Erst vorhandene Layer inventarisieren, Owner festlegen, doppelte Recovery verhindern, dann gezielt reparieren.

────────────────────────────────
1. AKTUELLE MASSGEBENDE REPO-BASIS
────────────────────────────────

Aktuelle Repo-Quelle:
WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn (2).zip

Status:
AUTHORITATIVE_REPO_BASE / MASSGEBEND

Befund:
- 473 Dateien
- 54 Ordner
- ca. 32.589.317 Bytes unkomprimierte Nutzdaten
- enthält aktuell einen Wrapper-Ordner
- als Quell-/Auditbasis maßgebend
- für Deploy muss daraus eine Safe-Root-ZIP ohne Wrapper gebaut werden

Repo-Root soll direkt so aussehen:

666SOUNDsDESIGn/
CHAOS_ENGINE/
Scriptable/Scripts/
assets/
config/
core/
css/
docs/
external-workers/
js/
renderer-resources/
worker-addons/

.dev.vars.example
README.md
chaos-matrix-control.html
index.html
package-manifest.full-integration.json
site.webmanifest
worker.js
wrangler.jsonc
wrangler.secrets.required.example.json

Wichtig:
Für Deploy-ZIP müssen index.html, worker.js, css/, js/, assets/, core/, config/ usw. direkt im ZIP-Root liegen.
Kein äußerer Wrapper-Ordner.

────────────────────────────────
2. ZWEI GETRENNTE ZIP-ARTEN
────────────────────────────────

Für dieses Radio-Projekt gibt es zwei getrennte ZIP-Typen.

A) REPO-DEPLOY-ZIP

Zweck:
Für Scriptable / GitHub / Repo Root Replace / Live-Repo.

Inhalt:
Nur echte Repo-Dateien.

Muss enthalten:
- index.html direkt im ZIP-Root
- worker.js direkt im ZIP-Root
- css/
- js/
- assets/
- core/
- config/
- worker-addons/
- docs/
- external-workers/
- renderer-resources/
- Scriptable/Scripts/
- 666SOUNDsDESIGn/
- CHAOS_ENGINE/
- wrangler.jsonc
- wrangler.secrets.required.example.json
- .dev.vars.example
- README.md
- site.webmanifest
- package-manifest.full-integration.json
- chaos-matrix-control.html

Darf NICHT enthalten:
- Wrapper-Ordner
- innere ZIPs
- Recovery-Koffer
- Backup-Systemordner
- Systemregister-Koffer
- __MACOSX
- ._ Dateien

B) FULL-BACKUP-ZIP / RECOVERY-KOFFER

Zweck:
Vollständige Sicherung / Recovery / Audit / Handoff.

Darf enthalten:
- Repo-Deploy-ZIP als Artefakt
- Register
- Layer-Inventar
- Funktionsinventar
- Orchester-Index
- Guard-Index
- Manifest
- Changelog
- SHA256SUMS
- Artifact-Inventory
- Recovery-Handoff
- Schutzsystem-Dateien
- Auditberichte

Wichtig:
Full-Backup-ZIP niemals direkt in die Repo hochladen.
Repo-Deploy-ZIP sauber halten.

────────────────────────────────
3. BISHERIGE WICHTIGE ÄNDERUNGEN / PATCHES
────────────────────────────────

3.1 Correct Safe Root Repack

Es wurde früher eine korrekte Safe-Root-ZIP gebaut:
WebRadio-666SOUNDsDESIGn_CORRECT_SAFE_ROOT_REPACK_473_20260609.zip

Befund damals:
- 473 Dateien
- 54 Ordner
- keine fehlenden Dateien
- keine extra Dateien
- keine geänderten Dateiinhalte
- kein Wrapper
- keine inneren ZIPs
- kein __MACOSX / ._

Wichtig:
Dieser Stand war ein sauberer Repack, aber aktuell gilt die neu hochgeladene Repo-ZIP als maßgebende Quelle.

3.2 Scriptable Uploader

Ein Scriptable-Script wurde bereitgestellt:
666_GitHub_Uploader_v3_3_SAFE_ROOT_REPLACE_COMPLETE_FIXED.js

Funktionen:
- Append-only Upload
- Safe Root Replace
- Root-Check
- keine ZIPs / __MACOSX / ._ / .DS_Store / .git / node_modules / .env
- Vorschau vor Replace
- Textbestätigung REPLACE ROOT

Befund:
Das Script muss nicht zwingend geändert werden.
Es prüft bereits, ob index.html, worker.js, css/ und js/ direkt im gewählten Ordner liegen.
Optional sinnvoll wäre später:
SCRIPTABLE_WRAPPER_AUTO_ROOT_DETECT_PATCH

3.3 Audio Core Authority Patch

Patch:
WebRadio-666SOUNDsDESIGn_AUDIO_CORE_AUTHORITY_PATCH_1FILE_20260610.zip

Ziel:
Audio-Recovery-Layer teilweise entwirren.
Nur eine Datei geändert:
js/phase10-stability-iphone-panel-hud.js

Ergebnis:
Nicht ausreichend. Aussetzer blieben.

3.4 iOS Audio Focus Resume Patch

Patch:
WebRadio-666SOUNDsDESIGn_IOS_AUDIO_FOCUS_RESUME_PATCH_20260610.zip

Ziel:
iPhone Audio-Focus / App-Wechsel / Resume besser behandeln.

Ergebnis:
Nicht ausreichend. Aussetzer blieben.

3.5 iOS PC Audio Recovery Escalation Patch A

Patch:
WebRadio-666SOUNDsDESIGn_IOS_PC_AUDIO_RECOVERY_ESCALATION_PATCH_A_20260610.zip

Ziel:
Recovery weniger aggressiv machen und PC/iPhone berücksichtigen.

Ergebnis:
Nicht ausreichend. Aussetzer blieben.

3.6 PC iPhone Android Audio Healing Orchestra Patch 1

Patch:
WebRadio-666SOUNDsDESIGn_PC_IPHONE_ANDROID_AUDIO_HEALING_ORCHESTRA_PATCH_1_20260611.zip

Ziel:
Gemeinsame Audio-Healing-Entscheidung für PC/iPhone/Android.
Sensoren melden, Orchester entscheidet.
Kein einzelnes Gerät soll eigene Recovery-Logik fahren.

Geändert:
js/phase10-stability-iphone-panel-hud.js

Ergebnis:
Nicht ausreichend. User meldete weiterhin Aussetzer, als würde zusätzlich gebuffert.

3.7 INDEX_MFF_SELFHEAL_AUTHORITY_PATCH

Patch:
WebRadio-666SOUNDsDESIGn_INDEX_MFF_SELFHEAL_AUTHORITY_PATCH_20260611.zip

Ziel:
MFF-Selfheal in index.html an Audio-Healing-Orchester binden.

Problem vorher:
recoverMffInterruptedAudio() durfte:
- markMffAudioDirty()
- prepareMffAudioForPlay()
- pause()
- removeAttribute("src")
- load()
- setAttribute("src")
- load()
- play()

Das konnte zusätzliches Buffering erzeugen.

Patch-Ziel:
Wenn Audio-Healing-Orchester aktiv ist:
- MFF meldet nur noch Sensorstatus
- kein prepareMffAudioForPlay()
- kein src-reset
- kein load()
- kein eigenes play()

Status:
Patch erstellt.
Live-Endergebnis danach noch nicht endgültig bestätigt.
User meldet weiterhin Buffering-Gefühl / Aussetzer als Hauptproblem.

────────────────────────────────
4. AKTUELLES HAUPTPROBLEM
────────────────────────────────

Problem:
Player hat Aussetzer.
Es fühlt sich an, als würde er zwischendurch zusätzlich buffern.

Symptom:
- iPhone: Player stoppt/unterbricht nach einigen Minuten oder nach Audio-Focus-Ereignissen.
- PC: nach einigen Minuten Aussetzer, manchmal wirkt Seite beim Zurückkehren kurz eingefroren.
- TuneIn und externe App laufen mit gleichem Stream stabiler.

Interpretation:
Der Stream selbst ist vermutlich nicht Hauptursache.
Wahrscheinlicher sind Client-/Player-Layer:
- Audioelement wird mehrfach gesteuert
- Recovery-Logik feuert parallel
- load()/src-reset passiert zu oft
- MFF / Player-Core / Phase10 / Audio-Healing greifen noch nicht sauber zentralisiert
- PC- und iPhone-Verhalten sind ähnlich betroffen

Hauptverdacht:
Mehrere Layer behandeln denselben Fehler gleichzeitig.

────────────────────────────────
5. WICHTIGE CODEBEFUNDE
────────────────────────────────

5.1 index.html

Rolle:
Haupt-HTML, PC-UI, Mobile-/MFF-UI, Panels, Boost, Streambuttons, Mobile-Logik.

Gefundene wichtige Funktionen:
- getAudio()
- markMffAudioDirty()
- resetMffAudioGraph()
- prepareMffAudioForPlay()
- recoverMffInterruptedAudio()
- ensureAudioGraph()
- applyBoostRamp()
- resumeAudioGraph()
- play()
- pause()
- stop()
- boost()
- installMffAudioSelfHealEvents()
- setManualStreamTarget()
- updateStreamSwitchButtons()
- bindStreamSwitch()
- setPanelLed()
- setPanelLedTip()
- fetchMeta()
- applyMeta()
- tickMeta()
- startMeta()

Governance:
ACTIVE / HIGH RISK / PARTLY OVERLOADED

Problem:
index.html enthält nicht nur Struktur, sondern aktive Mobile-Audio-, Boost-, Meta-, LED- und Streamlogik.

5.2 js/player-core.js

Rolle:
PC/Root Audio-Transport, Streamumschaltung, Metadaten, History, Booster, Status-LEDs, Watchdog/Selfheal.

Gefundene wichtige Funktionen:
- recoverInterruptedAudio()
- prepareAudioElementForFreshPlay()
- markAudioSelfHealDirty()
- updateStreamPanelLeds()
- setActivePanelLeds()
- setStoppedPanelLeds()
- syncStreamLedFromStatus()
- setSource()
- fetchMetadata()
- stopPlayback()
- playCurrent()
- healthPing()
- applyBoost()
- setBoostStage()
- audioWatchdog()

Governance:
ACTIVE / HIGH RISK / TRANSPORT OWNER

Problem:
Transport- und Recovery-Logik.
Kann Play/Stop-Loops, Buffering oder Audio-Ausfall erzeugen.

5.3 js/phase10-stability-iphone-panel-hud.js

Rolle:
iPhone-Stabilität, Mobile-HUD, PC/iPhone-Parity, Audio-Recovery, Audio-Healing-Orchester, Side-Meter, Viewport-/Panel-Logik.

Gefundene wichtige Funktionen:
- s666CentralAudioAuthorityActive()
- s666AudioAuthorityHandoff()
- installAudioRecovery()
- recoverAudio()
- installAudioFocusGuard()
- installPcMainBackupGuard()
- phase10RelocatePcPanels()
- iphonePcParityV1()
- parityOpenSound()
- parityOpenAdmin()
- parityLockViewport()
- iphoneAudioV2Recover()
- centralAudioGuardV2Recover()
- s666AudioOrchestra()

Governance:
ACTIVE / HIGH RISK / ORCHESTRA OWNER CANDIDATE

Problem:
Hier sitzt zentrale Audio-Healing-/Parity-Logik.
Dieser Layer darf nicht weiter mit neuen Neben-Watchdogs überstapelt werden.

5.4 js/equalizer.js

Rolle:
WebAudio EQ, Meter, Visualizer, Mobile-HUD-Levelvars, Boost-Meter-Kopplung.

Gefundene wichtige Funktionen:
- createRealEqNodes()
- applyRealEqToNodes()
- bindRealEqPanel()
- createBars()
- applyMeters()
- startVisualizer()
- setBoostStage()
- renderFallback()

Governance:
ACTIVE / MEDIUM-HIGH RISK

Regel:
Meter darf messen und anzeigen.
Meter darf nicht recovern.
Meter darf nicht audio.src ändern.
Meter darf nicht play/load auslösen.

5.5 js/shared-status.js

Rolle:
Statuschip-Klassen / Farblogik-Basis.

Gefundene Funktion:
- applyStatusChip()

Governance:
ACTIVE / CENTRALIZATION CANDIDATE

Kandidat für:
Central LED State Engine
SB/AUD/WCH/RCN Farblogik

5.6 js/player-admin-overlay.js

Rolle:
Admin Overlay, Auth-Check, Config, Rollback, Statuschecks, Broadcast-/Discord-Admin-Checks.

Gefundene Funktionen:
- openAdminOverlay()
- closeAdminOverlay()
- checkApi()
- loadConfig()
- listBackups()
- previewConfig()
- commitConfig()
- rollbackLatest()
- checkAllLayers()
- checkBroadcastStatus()
- testBroadcast()
- setDiscordLed()
- sendDiscordAdmin()
- statusDiscordAdmin()

Governance:
ACTIVE / ADMIN_CONTROL_ORCHESTRA_OWNER

5.7 js/sound-control-overlay-v1.js

Rolle:
Sound Overlay, EQ-State, Boost-Steuerung, Presets, Overlay Open/Close.

Gefundene Funktionen:
- open()
- requestClose()
- readEqFromDom()
- applyEqToDom()
- readBoostStage()
- setBoostStage()
- applyDraft()
- savePresetSlot()
- loadPresetSlot()
- updateLed()
- mountButton()
- mountTriggers()
- boot()

Governance:
ACTIVE / PARITY-RELEVANT

5.8 js/broadcast-message-history.js

Rolle:
Broadcast-/Message-History Overlay, PC/Mobile Buttons, Editor Button.

Gefundene Funktionen:
- ensureOverlay()
- renderList()
- loadHistory()
- openOverlay()
- closeOverlay()
- installPcButton()
- installMobileButton()
- installEditorButton()
- boot()

Governance:
ACTIVE / COMMUNICATION-LAYER

5.9 js/addons/discord-player-addon-v3.js

Rolle:
Discord Panel, Status, Webhook Posting, Gate Overlay, Track Watcher.

Gefundene Funktionen:
- setLed()
- checkStatus()
- manualPost()
- messagePost()
- postTrackIfChanged()
- startTrackWatcher()
- createPanel()
- mountAll()
- installClickBridge()

Governance:
ACTIVE / COMMUNICATION-LAYER

5.10 worker.js

Rolle:
Streamproxy, Fallback, Health/Debug, Admin, Broadcast, Discord, Chaos, Assets, interner Notfallplayer.

Relevante Funktionen:
- proxyStream()
- proxyStreamFailover()
- proxyFallbackStream()
- handlePlayerAlertV152()
- s666RouteTable()
- s666ModuleStatus()
- s666LiveHealth()
- s666LiveDebug()

Wichtige Routen:
- /stream
- /fallback-stream
- /api/admin/*
- /api/player-alert/*
- /api/discord/*
- /api/nowplaying
- /health
- /debug
- /debug/routes
- /debug/modules
- /internal
- /internal/
- /?player=internal

Governance:
ACTIVE / HIGH RISK / NOT PRIMARY BUFFERING SUSPECT

Warum nicht primär:
TuneIn und externe App laufen stabiler mit gleichem Stream.
Trotzdem darf worker.js nicht blind angefasst werden.

────────────────────────────────
6. INTERNER NOTFALLPLAYER IM WORKER
────────────────────────────────

worker.js enthält einen internen Notfall-/Fallback-Player.

Rolle:
ACTIVE / INTERNAL FALLBACK / DO_NOT_TOUCH_BLIND

Normaler Hauptplayer:
Root/externer Player.

Notfallplayer:
interner Worker-Player.

Erreichbar über:
- /internal
- /internal/
- /?player=internal

Der interne Notfallplayer enthält eigene eingebettete Bestandteile:
- HTML
- CSS
- APP_JS
- CONFIG_JS

Eigene interne Routen:
- /css/main.css?v=...
- /js/app.js?v=...
- /config/stream.config.js?v=...

Kann:
- Play
- Pause
- Stop
- Reconnect
- Mute
- MAIN
- BACK
- History
- Metadata
- Listeners
- Bitrate
- DJ / Status

Interne Stream-Konfig:
- stream_url: /stream
- fallback_stream_url: /fallback-stream
- metadata_url: /api/nowplaying
- primary_upstream: https://my.idjstream.com/666soundsdesign/stream
- fallback_upstream: https://my.idjstream.com:8686/stream

Wichtig:
Nicht löschen.
Nicht überschreiben.
Nicht mit Hauptplayer verwechseln.
Bei Stream-Preset-Zentralisierung prüfen, ob CONFIG_JS ebenfalls zentrale Registry / ENV / Config nutzen soll.

────────────────────────────────
7. BEKANNTE STREAMDATEN
────────────────────────────────

Diese Daten sollen als Presets eingetragen werden, aber zentral änderbar bleiben.

1. MAIN / HAUPTSTREAM

ID:
main

Label:
Hauptstream

URL:
https://my.idjstream.com/666soundsdesign/stream

ENV:
STREAM_MAIN_URL

Typ:
audio

2. BACKUP / BACKSTREAM

ID:
backup

Label:
Backupstream / Backstream

URL:
https://my.idjstream.com:8686/stream

ENV:
STREAM_BACKUP_URL

Typ:
audio

3. BACKUP ALT

ID:
backup_alt

Label:
Backupstream Alt

URL:
https://my.idjstream.com/8686/stream

ENV:
STREAM_BACKUP_ALT_URL

Typ:
audio

4. DOMAIN

ID:
domain

Label:
Domain

URL:
https://webradio.666soundsdesign-broadcaster.com/

ENV:
STREAM_DOMAIN_URL

Typ:
link

5. DOMAIN STREAM

ID:
domain_stream

Label:
Domain Stream

URL:
https://webradio.666soundsdesign-broadcaster.com/stream

ENV:
STREAM_DOMAIN_STREAM_URL

Typ:
audio

6. TUNEIN

ID:
tunein

Label:
TuneIn Seite

URL:
https://tunein.com/radio/s357001

ENV:
STREAM_TUNEIN_URL

Typ:
external_link

7. HEALING

ID:
healing

Label:
Healing

URL:
PLACEHOLDER

ENV:
STREAM_HEALING_URL

Alternativ:
MODE_HEALING

Typ:
placeholder_or_mode

8. THE BACK

ID:
the_back

Label:
The Back

URL:
PLACEHOLDER

ENV:
STREAM_THE_BACK_URL

Alternativ:
MODE_THE_BACK

Typ:
placeholder_or_mode

Wichtig:
Healing und The Back nicht blockieren, wenn echte URLs noch fehlen.
Als Presets/Modi vorbereiten.

────────────────────────────────
8. GEWÜNSCHTE STREAM-ÄNDERBARKEIT
────────────────────────────────

Streams sollen später ohne Codeänderung geändert werden können.

Mögliche Slash-/Admin-/Dashboard-Befehle:

666 STREAM SET MAIN <url>
666 STREAM SET BACKUP <url>
666 STREAM SET BACKUP_ALT <url>
666 STREAM SET DOMAIN <url>
666 STREAM SET DOMAIN_STREAM <url>
666 STREAM SET HEALING <url>
666 STREAM SET THE_BACK <url>

666 STREAM LIST
666 STREAM ACTIVE MAIN
666 STREAM ACTIVE BACKUP
666 STREAM ACTIVE DOMAIN_STREAM
666 STREAM ACTIVE HEALING
666 STREAM ACTIVE THE_BACK
666 STREAM RESET DEFAULTS

Wenn Slash-Befehle noch nicht existieren:
Struktur trotzdem vorbereiten:
- zentrale Preset-Registry
- Config-Objekt
- ENV-Fallbacks
- Admin-Update-Funktion
- Dashboard-Anbindung
- Worker-/API-Routen erst nach Audit

────────────────────────────────
9. REMOTE-CONTROL / WORKER / SKIP
────────────────────────────────

Bekannt:
Es gibt bereits mehrere Worker-/Remote-Control-Bausteine.

User-Hinweis:
- ein Worker / eine Remote-Funktion für Skip / nächstes Lied
- mindestens ein weiterer Worker / Remote-Control-Baustein
- genaue Zuständigkeit des zweiten Workers ist noch unklar

Pflicht:
Vor neuer Control-Logik vorhandene Worker/Routen auditieren.

Zu prüfen:
- worker.js
- external-workers/
- worker-addons/
- Scriptable/Scripts/
- vorhandene Skip-/Next-/AutoDJ-Funktionen
- vorhandene Dashboard-/Admin-/Control-Endpunkte
- vorhandene SonicPanel-/MyIDJ-Ansteuerung
- ENV-/Secret-Namen

Regel:
Keine neuen Worker bauen, wenn vorhandene Worker/Routen erweitert werden können.

────────────────────────────────
10. GEWÜNSCHTE RADIO-CONTROL-FUNKTIONEN
────────────────────────────────

Benötigt:

PLAY
- startet aktiven Stream / aktives Preset

STOP
- stoppt Player sauber

NEXT / SKIP
- vorhandenen Skip-/Next-Worker oder vorhandene Route nutzen
- keine neue Skip-Logik bauen, bevor vorhandene geprüft ist

RESET
- setzt Player-/Streamstatus zurück
- löscht keine Config
- löscht keine Secrets
- zerstört keine Repo-Daten

RECONNECT
- verbindet aktuellen Stream kontrolliert neu
- soll über Audio-Healing-/Reconnect-Owner laufen
- kein weiterer paralleler Watchdog

VOLUME UP
- Lautstärke erhöhen

VOLUME DOWN
- Lautstärke senken

MUTE
- stumm schalten

VOLUME SLIDER
- optional, aber vorbereiten

────────────────────────────────
11. SYSTEMPANEL / LED-LOGIK
────────────────────────────────

PC und iPhone müssen dieselbe logische LED-Sortierung haben.

Leiste 1:
Stream / Verbindung / Audiofluss

Reihenfolge:
H
B
STR
SB
SRC
MET
WRK
AUD
WCH
RCN
MTR

Leiste 2:
Aktionen / Kommunikation / Zusatzsysteme

Reihenfolge:
EQ
DSC
MSG
ADM
GOV
CHA

PC:
breit nebeneinander möglich.

iPhone:
in 1–2 Zeilen umbrechen erlaubt.
Sortierung bleibt gleich.

H und B:
Nicht nur LED, sondern LED + Tooltip + Schalter.

SB:
Stream Buffering Diagnose.

SB-Farblogik:
Grün = No Buffering / stabil
Türkis = normales kurzes Buffering / Netzwerk arbeitet
Pink = Under Buffering / Buffer-Risiko / waiting / stalled
Rot = Hard Buffering / Stream hängt / Recovery fehlgeschlagen

SB darf nicht recovern.
Nur anzeigen.

────────────────────────────────
12. PC / iPHONE / ANDROID PARITY
────────────────────────────────

Alle wichtigen Funktionen müssen auf PC und iPhone vorhanden sein.

PC:
- breiter Cockpit-Player
- Stream-Info links
- Stream-/Diagnose-LEDs rechts
- Sound-Menü vorhanden
- Admin-Menü vorhanden
- Booster vermutlich ON/OFF ausreichend

iPhone:
- ganze Player-Seite
- kein horizontaler Scroll
- kein vertikaler Scroll
- keine manuelle Zoom-Reparatur nach Overlays
- Stream-/Diagnose-LEDs kompakt
- grafischer EQ-Klick öffnet 9-Band-EQ-Overlay
- Booster mit 5 Stufen
- Warnhinweise bei Stufe 4 und 5 bleiben
- Admin-Menü erreichbar

Android:
- mobile Logik ähnlich iPhone vorbereiten
- keine schlechtere Funktionalität

Geräteunterschiede erlaubt, wenn funktional gleichwertig.

────────────────────────────────
13. ADMIN-MENÜ
────────────────────────────────

Admin-Menü muss auf PC und iPhone funktional gleichwertig sein.

Gewünschte Admin-Bereiche:
- Streamsteuerung
- Presetstatus
- Worker-Health
- Metadatenprüfung
- Buffering/SB-Diagnose
- Audio-Healing-Status
- Reconnect
- Discord/Message-Status
- Build-/Version-/Freeze-Status
- Fehlerdiagnose / Auditbereich

Admin-Schutz:
- keine gefährliche Aktion ohne Bestätigung
- kein versehentliches Löschen
- keine Secrets anzeigen
- kein hartes Überschreiben
- keine Worker-Routen ändern ohne Freigabe

────────────────────────────────
14. SOUND / EQ / BOOSTER
────────────────────────────────

PC:
- Sound-Menü bleibt vorhanden
- Booster vermutlich ON/OFF ausreichend

iPhone:
- Klick auf grafischen Equalizer öffnet Overlay
- Overlay enthält manuellen 9-Band-EQ
- Booster hat 5 Stufen
- Warnhinweise bei Stufe 4 und 5 bleiben zwingend erhalten
- Booster braucht saubere Farblogik

Booster-Farblogik:
0 = leer / aus
1 = grün / leichter Boost
2 = türkis / aktiver Boost
3 = pink / stark
4 = pink warnend / hoher Bereich
5 = rot / maximaler Bereich

────────────────────────────────
15. AKTIVE SCHUTZ-/ORCHESTER-SYSTEME
────────────────────────────────

Führende Schutzreferenz:
GENERAL_AUDIT_RECOVERY_FULLVERSION_HANDOFF_v1_1_3_REPAIR_FULLVERSION.md

Aktive Prinzipien:
- keine Mini-Backups als Fullversion
- keine kleinen Ersatz-ZIPs
- keine leeren Kofferordner
- keine Register-/Orchester-Logik nur im Hauptdokument ohne portable Dateien
- kein Freeze ohne Artifact-Inventory
- keine ZIP-Freigabe nur nach komprimierter Größe
- keine stille Kürzung
- keine stille Architekturwechsel
- keine Patch-Datei als angebliche Vollversion

Wichtige Orchester / Guards:
- Grand Code Preservation Orchestra
- Grand Layer Governance Orchestra
- Central Module Authority Orchestra
- Central Extraction / Player Refactor Orchestra
- System Register Layer
- Grand Visual Meter Orchestra
- Panel LED Orchestra
- Player Feature Parity Orchestra
- Admin Control Orchestra
- Audio Healing Orchestra
- Portable Backup Builder Orchestra
- File Output Quality & Quantity Assurance Orchestra
- Grand Meta Orchestra Commander
- General Audit Recovery v1.1.3 Protection Reference

────────────────────────────────
16. WICHTIGSTE PROBLEME / RISIKEN
────────────────────────────────

Priorität 1:
Audio-Aussetzer / gefühltes Zusatz-Buffering

Wahrscheinliche Ursache:
mehrere Audio-/Recovery-/Selfheal-Layer.

Zu prüfen:
- index.html MFF
- js/player-core.js
- js/phase10-stability-iphone-panel-hud.js
- eventuell interner Notfallplayer nur sekundär
- currentTime-/buffered-/readyState-/networkState-Logik
- src/load/play/pause mehrfach

Priorität 2:
Layer-Chaos / zu viele gewachsene Systeme

Problem:
Viele Layer existieren parallel.
Nicht alle sind Müll.
Aber Zuständigkeiten sind unklar.

Lösung:
PLAYER_LAYER_INVENTORY_AND_GOVERNANCE_AUDIT weiterführen und in Register sichern.

Priorität 3:
Stream-/Preset-Werte sind verstreut

Problem:
main/backup/domain/internal worker config können an mehreren Stellen stehen.

Lösung:
zentrale Stream-Preset-Registry.
Worker, Hauptplayer und Notfallplayer daran anbinden.

Priorität 4:
PC/iPhone Feature-Parity

Problem:
Sound, Admin, Booster, EQ, LED-Leisten und Menüs müssen auf PC und iPhone funktional gleichwertig sein.

Lösung:
PLAYER_FEATURE_PARITY_AND_ADMIN_AUDIT.

Priorität 5:
Dashboard-/Radio-Control darf keine neue Parallelwelt bauen

Problem:
Wenn einfach neues Dashboard oder neue Worker gebaut werden, entsteht Müll.

Lösung:
Vorhandene Dashboard-/Admin-/Worker-Struktur prüfen und erweitern.

Priorität 6:
Repo-Deploy und Full-Backup dürfen nicht vermischt werden

Problem:
Backup-Koffer darf nicht in Repo hochgeladen werden.

Lösung:
Dual-ZIP-Regel strikt einhalten.

────────────────────────────────
17. WAS NICHT PASSIEREN DARF
────────────────────────────────

Nicht:
- neuen Audio-Watchdog drüberklatschen
- Notfallplayer löschen
- worker.js blind umbauen
- Player-Core blind kürzen
- index.html aufräumen ohne Funktionsaudit
- CSS „verschönern“ und Layout brechen
- neue Worker bauen ohne alte zu prüfen
- Stream-URLs überall hardcoden
- Secrets in Code schreiben
- Full-Backup-ZIP in Repo deployen
- Repo-Deploy-ZIP mit Recovery-Koffer zumüllen
- PC/iPhone auseinanderlaufen lassen
- iPhone Overlays so bauen, dass nach Schließen Zoom/Scroll kaputt ist

────────────────────────────────
18. NÄCHSTE OFFENE AUFGABEN
────────────────────────────────

A) PLAYER_FUNCTION_INVENTORY_AND_CENTRALIZATION_AUDIT

Ziel:
Funktionen exakt zuordnen:
- zentralisieren
- lokal behalten
- sensor-only
- wrapper-to-central
- do-not-touch

B) RESPONSIVE_STAGE_AND_PANEL_LED_AUDIT

Ziel:
- PC Topbar
- iPhone Stage
- LED-Leisten
- Proportionen
- Breakpoints
- No Scroll / No Zoom
- Overlay-Close-Reset

C) PLAYER_FEATURE_PARITY_AND_ADMIN_AUDIT

Ziel:
- PC/iPhone/Admin/Sound/EQ/Booster/Farblogik/Funktionen vergleichen

D) WORKER_ROUTE_AND_REMOTE_CONTROL_AUDIT

Ziel:
- Skip-/Next-Worker finden
- zweiten Worker identifizieren
- Remote-Control-Routen prüfen
- Dashboard-/Admin-Endpunkte prüfen

E) RADIO_CONTROL_PRESET_DASHBOARD_PATCH_PLAN

Ziel:
- konkrete Dateien
- konkrete Funktionen
- konkrete Routen
- keine neue Parallelstruktur

F) SAFE_ROOT_DEPLOY_REPACK

Ziel:
Aus maßgebender Wrapper-ZIP eine deploybare Root-ZIP ohne Wrapper bauen.

G) FULL_BACKUP_ZIP

Ziel:
Separates vollständiges Recovery-/Audit-/Register-/Handoff-Backup bauen.

────────────────────────────────
19. EMPFOHLENE PATCH-REIHENFOLGE
────────────────────────────────

1. Kein Patch.
2. PLAYER_FUNCTION_INVENTORY_AND_CENTRALIZATION_AUDIT.
3. WORKER_ROUTE_AND_REMOTE_CONTROL_AUDIT.
4. RESPONSIVE_STAGE_AND_PANEL_LED_AUDIT.
5. PLAYER_FEATURE_PARITY_AND_ADMIN_AUDIT.
6. Patch-Plan für zentrale Stream-Preset-Registry.
7. Kleine Implementierung:
   - keine Audio-Recovery-Änderung
   - nur Preset-Registry / Diagnose / Dashboard-Vorbereitung
8. Re-Audit.
9. Safe-Root-Deploy-ZIP bauen.
10. Separates Full-Backup-ZIP bauen.

────────────────────────────────
20. ABSCHLUSS
────────────────────────────────

Der nächste Agent soll nicht raten.

Wichtigste Arbeitsregel:
CODEBEFUND VOR PATCH.

Wichtigstes Problem:
Audio-Aussetzer / Buffering durch mögliche parallele Recovery-Layer.

Wichtigste Architekturregel:
Problem auf dem zuständigen Layer reparieren, nicht neue Layer drüberwerfen.

Wichtigste Backup-Regel:
Repo-Deploy-ZIP und Full-Backup-ZIP strikt getrennt halten.

Wichtigste Stream-Regel:
Streamdaten zentral als Presets halten und später ohne Codeänderung per Admin/Dashboard/Slash ändern können.

Wichtigster Worker-Hinweis:
Der interne Notfallplayer im worker.js ist ein aktiver Fallback-Layer und darf nicht gelöscht oder überschrieben werden.