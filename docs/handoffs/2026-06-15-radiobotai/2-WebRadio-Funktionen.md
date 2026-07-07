# KOMPLETTES FUNKTIONS-HANDOUT
# Projekt: 666SOUNDsDESIGn WebRadio / 666 Stream Player
# Zweck: Übersicht aller bekannten Funktionen, Layer, Module, Probleme, Zuständigkeiten und offener Arbeiten
# Basis: aktuelle maßgebende Repo-ZIP „WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn (2).zip“
# Status: Handout / keine Codeänderung / kein Repack / kein Freeze

────────────────────────────────
0. KURZSTATUS
────────────────────────────────

Aktuelle Repo-Basis:
WebRadio-666SOUNDsDESIGn-WebRadio-666SOUNDsDESIGn (2).zip

Repo-Status:
MASSGEBEND / AUTHORITATIVE_REPO_BASE

Befund:
- 473 Dateien
- 54 Ordner
- ca. 32.589.317 Bytes unkomprimierte Nutzdaten
- ZIP enthält Wrapper-Ordner
- als Quelle/Basis OK
- für Deploy muss Safe-Root-ZIP ohne Wrapper gebaut werden

Hauptproblem:
Der Player hat weiterhin Aussetzer / gefühltes zusätzliches Buffering.

Wichtigster technischer Verdacht:
Mehrere Audio-, Recovery- und Selfheal-Layer arbeiten parallel oder greifen auf denselben Audio-/Streamzustand zu.

Wichtigste Regel:
Nicht noch mehr Layer obendrauf klatschen.
Erst Inventar, Owner, Zentralisierung, dann gezielte Reparatur.

────────────────────────────────
1. HAUPTFUNKTIONEN DES SYSTEMS
────────────────────────────────

Das System besteht funktional aus:

1. WebRadio-Hauptplayer
2. PC-Cockpit-Player
3. iPhone-/Mobile-Player
4. interner Worker-Notfallplayer
5. Streamproxy / Worker-Fallback
6. Hauptstream / Backupstream / Backup-Alt
7. Domain-/TuneIn-/External-Link-Anbindung
8. Metadaten / Now Playing
9. History / zuletzt gespielte Titel
10. Listener-/Bitrate-/DJ-/Statusanzeigen
11. Play / Pause / Stop
12. Reconnect
13. Main-/Backup-Umschaltung
14. EQ / Sound-Menü
15. Booster
16. Levelmeter / Visualizer
17. Broadcast-/Message-System
18. Discord-Posting / Discord-Status
19. Admin-Menü / Config / Rollback
20. Dashboard-/Control-Vorbereitung
21. Scriptable GitHub Upload / Root Replace
22. GOVEE-FX / Scene-Sync Add-on
23. Chaos Engine / Track-System Zusatzbereich
24. External Workers für Chaos/Suno
25. Backup-/Audit-/Recovery-Schutzsystem

────────────────────────────────
2. AKTUELLE STREAM-PRESETS
────────────────────────────────

Diese Daten sind bekannt und sollen zentral als Presets geführt werden.

────────────────
MAIN / HAUPTSTREAM
────────────────

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

Switchable:
ja

────────────────
BACKUP / BACKSTREAM
────────────────

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

Switchable:
ja

────────────────
BACKUP ALT
────────────────

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

Switchable:
ja / optional fallback

────────────────
DOMAIN
────────────────

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

Switchable:
nein

────────────────
DOMAIN STREAM
────────────────

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

Switchable:
ja

────────────────
TUNEIN
────────────────

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

Switchable:
nein

────────────────
HEALING
────────────────

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

Hinweis:
Healing kann später echter Stream oder Modus sein.

────────────────
THE BACK
────────────────

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

Hinweis:
The Back kann später echter Stream oder Modus sein.

────────────────────────────────
3. GEWÜNSCHTE STREAM-STEUERUNG
────────────────────────────────

Streams sollen später ohne Codeänderung geändert werden können.

Vorgesehene Steuerwege:

1. ENV / Worker Secrets
2. Config
3. Admin-Menü
4. Dashboard
5. später Slash-Befehl

Vorgesehene Befehle:

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

Wichtige Regel:
Nicht überall einzelne URLs hardcoden.
Zentrale Preset-Registry einführen oder vorhandene zentrale Struktur erweitern.

────────────────────────────────
4. BEDIENFUNKTIONEN
────────────────────────────────

Basis-Transport:

PLAY
Startet aktiven Stream / aktives Preset.

PAUSE
Pausiert Wiedergabe.

STOP
Stoppt Player sauber.

RECONNECT
Verbindet aktuellen Stream kontrolliert neu.

RESET
Setzt Player-/Streamstatus zurück, ohne Config, Secrets oder Repo-Daten zu löschen.

MAIN / H
Schaltet auf Hauptstream.

BACKUP / B
Schaltet auf Backupstream.

NEXT / SKIP
Soll vorhandene Skip-/Next-/AutoDJ-Worker- oder Remote-Funktion nutzen.
Vorher vorhandene Worker/Routen auditieren.

VOLUME UP
Lautstärke erhöhen.

VOLUME DOWN
Lautstärke senken.

MUTE
Stummschaltung.

VOLUME SLIDER
Optional, aber vorbereitet.

────────────────────────────────
5. PLAYER-FLÄCHEN UND GERÄTE
────────────────────────────────

PC-Player:
- breiter Cockpit-Player
- Stream-Info links
- System-/Stream-LEDs rechts
- Sound-Menü
- Admin-Menü
- Booster vermutlich ON/OFF ausreichend
- Meter / Visualizer
- History / Discord / Message / Broadcast

iPhone-Player:
- ganze Player-Seite
- kein horizontaler Scroll
- kein vertikaler Scroll
- kein manuelles Herauszoomen nach Overlay
- Stream-/Verbindungs-LED-Leisten kompakt
- grafischer EQ-Klick öffnet 9-Band-EQ-Overlay
- Booster mit 5 Stufen
- Warnhinweise bei Stufe 4 und 5 müssen bleiben
- Admin-Menü muss erreichbar sein

Android / Mobile:
- funktional wie iPhone vorbereiten
- keine abgespeckte Funktionalität
- mobile Darstellung erlaubt

Geräte-Parity-Regel:
Gleiche Funktion, gerätegerechte Darstellung.

────────────────────────────────
6. SYSTEMPANEL / LED-FUNKTIONEN
────────────────────────────────

PC und iPhone müssen dieselbe logische Sortierung haben.

LEISTE 1 — STREAM / VERBINDUNG / AUDIOFLUSS

H
Hauptstream / Schalter / LED / Tooltip

B
Backupstream / Schalter / LED / Tooltip

STR
Stream aktiv

SB
Stream Buffering

SRC
Source / Quelle

MET
Metadaten

WRK
Worker

AUD
Audio-Core / Audio-Healing

WCH
Watchdog / Healing

RCN
Reconnect

MTR
Meter / Audio-Level

LEISTE 2 — AKTIONEN / KOMMUNIKATION / ZUSATZSYSTEME

EQ
Equalizer / Sound

DSC
Discord

MSG
Broadcast / Nachricht

ADM
Admin

GOV
GOVEE / FX

CHA
Chaos / System

────────────────────────────────
7. SB / STREAM BUFFERING
────────────────────────────────

Neue gewünschte Diagnose-LED:

Label:
SB

Bedeutung:
Stream Buffering

Tooltip:
Stream Buffering — zeigt, ob der Player stabil läuft, normal puffert, unterpuffert oder hart hängt.

Farblogik:

Grün:
No Buffering / stabil

Türkis:
Normales kurzes Buffering / Netzwerk arbeitet

Pink:
Under Buffering / Buffer-Risiko / waiting / stalled

Rot:
Hard Buffering / Stream hängt / Recovery fehlgeschlagen

Wichtig:
SB ist Diagnose.
SB darf nicht selbst recovern.
Recovery bleibt beim Audio-Healing-/Watchdog-System.

────────────────────────────────
8. AUDIO / RECOVERY / SELFHEAL
────────────────────────────────

Aktive/erkannte Audio- und Recovery-Bereiche:

index.html:
- Mobile/MFF Audio
- getAudio()
- prepareMffAudioForPlay()
- recoverMffInterruptedAudio()
- installMffAudioSelfHealEvents()
- play()
- pause()
- stop()
- boost()
- ensureAudioGraph()
- resumeAudioGraph()

js/player-core.js:
- PC/Root Audio-Transport
- prepareAudioElementForFreshPlay()
- recoverInterruptedAudio()
- playCurrent()
- stopPlayback()
- healthPing()
- audioWatchdog()
- setSource()
- setStatus()

js/phase10-stability-iphone-panel-hud.js:
- Audio-Healing-Orchester
- iPhone-Audio-Stabilität
- CentralAudioGuardV2
- AudioFocusGuard
- PC/iPhone-Parity
- Viewport-/Panel-Logik

Problem:
Mehrere Layer können Audiozustand, Recovery oder Streamstatus beeinflussen.

Bisheriger wichtiger Patch:
INDEX_MFF_SELFHEAL_AUTHORITY_PATCH

Ziel dieses Patches:
MFF Selfheal soll bei aktivem Audio-Healing-Orchester nur noch melden und nicht selbst src/load/play ausführen.

Status:
Patch erstellt, Live-Endergebnis weiter offen.

Wichtig:
Kein neuer Audio-Watchdog.
Erst vollständige Layer- und Funktionsinventur.

────────────────────────────────
9. EQ / SOUND / BOOSTER
────────────────────────────────

Sound-Menü:
js/sound-control-overlay-v1.js

Funktionen:
- Sound Overlay öffnen/schließen
- EQ lesen/schreiben
- Boost-Stufe lesen/schreiben
- Presets speichern/laden
- LED aktualisieren
- Trigger mounten

Equalizer:
js/equalizer.js

Funktionen:
- WebAudio EQ
- real EQ nodes
- Meter / Visualizer
- Fallback-Visualisierung
- Mobile HUD Level Vars
- Boost-Meter-Kopplung

Booster:
core/audio/boost-core.js
index.html
js/player-core.js
js/sound-control-overlay-v1.js

iPhone:
- 5 Booster-Stufen Pflicht
- Warnhinweise bei Stufe 4 und 5 bleiben
- Farblogik fehlt/verbessern

PC:
- Booster vermutlich ON/OFF ausreichend

Booster-Farblogik:
0 = leer / aus
1 = grün / leichter Boost
2 = türkis / aktiver Boost
3 = pink / stark
4 = pink warnend / hoher Bereich
5 = rot / maximaler Bereich

Risiko:
EQ/WebAudio nicht blind ändern.
Booster nicht vereinfachen, wenn iPhone-Funktion verloren geht.

────────────────────────────────
10. METADATEN / HISTORY / DJ / LISTENER
────────────────────────────────

Metadaten-Funktionen:

index.html:
- fetchMeta()
- applyMeta()
- tickMeta()
- startMeta()
- normalizeMeta()
- mobileMetaText()
- normalizeDj()
- invalidMetaText()

js/player-core.js:
- fetchMetadata()
- parseMetadata()
- startMetadataLoop()
- stopMetadataLoop()
- updateNowCover()
- updateHistory()
- normalizeDjName()
- normalizeMetadataTitleV22()
- cleanNowPlayingText()

worker.js:
- fetchMetadata()
- startMetadataLoop()
- stopMetadataLoop()
- /api/nowplaying

History:

index.html:
- fetchHistory()
- renderHistory()
- pushLocalHistory()
- toggleHistory()
- bindHistoryModalV17()

js/broadcast-message-history.js:
- Broadcast-/Message-History Overlay

UI-Anzeigen:
- Titel / Now Playing
- DJ / Status
- Listener
- Bitrate / Streamqualität
- Source / active stream
- History-Liste

Offen:
Listener-Panel, Streamqualität und aktueller DJ sollen oben links sauber neu angeordnet werden.

────────────────────────────────
11. DISCORD / BROADCAST / MESSAGE
────────────────────────────────

Discord Player Addon:
js/addons/discord-player-addon-v3.js

Funktionen:
- Discord Panel
- Status-LED
- manuelles Posten
- Message Post
- Track Watcher
- Gate Overlay
- Click Bridge
- Metadata Payload

Statuslogik:
- idle
- sending
- ok
- cooldown
- error

Worker Discord Addon:
worker-addons/discord-notify-addon-v3.js

Funktionen:
- Webhook-Auswahl
- Now Playing Payload
- Manual Payload
- Message Payload
- Private Track Webhook
- Gate/Auth
- Admin/Gate-Check

Broadcast Alert Addon:
js/addons/player-broadcast-alert-v148.js

Funktionen:
- Message Composer
- Listener Overlay
- Sendestatus
- Polling
- Cooldown
- PC Inline Send
- Mobile Mount

Statuslogik:
- ready
- sent
- failed

Gewünschte zentrale LED-Spiegelung:
DSC = Discord
MSG = Broadcast / Nachricht

Wichtig:
Discord/Message nicht mit Audio-Debug vermischen.
Später in Central Communication Status Engine spiegeln.

────────────────────────────────
12. ADMIN-FUNKTIONEN
────────────────────────────────

Datei:
js/player-admin-overlay.js

Funktionen:
- Admin Overlay öffnen/schließen
- Auth prüfen
- API checken
- Config laden
- Backups listen
- Config Preview
- Config Commit
- Rollback
- Layer Checks
- Broadcast Status
- Broadcast Test
- Discord Admin LED
- Discord Admin Send
- Discord Admin Status
- All Layers Check

Worker Admin Addon:
worker-addons/radio-admin-config-addon.js

Funktionen:
- Admin Auth
- Required ENV
- GitHub API
- Config current
- Backups
- Update
- Rollback
- Payload Validation
- Handler für Radio Admin Config

Gewünschtes Admin-Control-Orchester:
- Admin Safety Guard
- Admin Parity Guard
- Admin Audit Guard
- Admin No-Destructive-Action Guard

Admin-Menü soll auf PC und iPhone funktional gleichwertig sein.

────────────────────────────────
13. WORKER / ROUTEN / STREAMPROXY
────────────────────────────────

Datei:
worker.js

Hauptfunktionen:
- Streamproxy
- Primary/Fallback/Backup-Alt
- Notfallplayer
- External Player
- Asset Proxy
- Metadata Proxy
- Health/Debug
- Admin
- Discord
- Broadcast
- Chaos Engine Static
- Route Table
- Module Status

Wichtige Routen:
- /
- /index.html
- /stream
- /fallback-stream
- /api/nowplaying
- /health
- /debug
- /debug/routes
- /debug/modules
- /internal
- /internal/
- /?player=internal
- /api/admin/*
- /api/player-alert/*
- /api/discord/*

Streamproxy:
- proxyStream()
- proxyStreamFailover()
- proxyFallbackStream()

Wichtig:
worker.js ist High-Risk.
Nicht blind ändern.
Erst WORKER_ROUTE_AND_REMOTE_CONTROL_AUDIT.

────────────────────────────────
14. INTERNER WORKER-NOTFALLPLAYER
────────────────────────────────

Rolle:
ACTIVE / INTERNAL FALLBACK / DO_NOT_TOUCH_BLIND

Erreichbar:
- /internal
- /internal/
- /?player=internal

Enthält im Worker:
- HTML
- CSS
- APP_JS
- CONFIG_JS

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

Nutzt:
- /stream
- /fallback-stream
- /api/nowplaying

Wichtig:
Nicht löschen.
Nicht mit Hauptplayer verwechseln.
Nicht durch neues Dashboard überschreiben.
Bei zentraler Stream-Preset-Registry berücksichtigen.

────────────────────────────────
15. DASHBOARD / RADIO CONTROL
────────────────────────────────

Gewünschte Dashboard-Control-Funktionen:
- aktiven Stream anzeigen
- Presets anzeigen
- Hauptstream wählen
- Backupstream wählen
- Domainstream wählen
- Healing/The Back als Platzhalter anzeigen
- Play
- Stop
- Reconnect
- Reset
- Skip / Next, wenn vorhandener Worker/Endpoint gefunden
- Volume Up / Down / Mute
- Status-LEDs anzeigen
- Worker Health
- Metadata Status
- Buffering / SB
- Audio-Healing Status

Regel:
Vorhandene Dashboard-/Admin-/Worker-Struktur nutzen.
Keine zweite Dashboard-Welt bauen.

────────────────────────────────
16. SCRIPTABLE / GITHUB UPLOAD
────────────────────────────────

Script:
666_GitHub_Uploader_v3_3_SAFE_ROOT_REPLACE_COMPLETE_FIXED.js

Funktionen:
- Folder Upload
- Safe Root Replace
- Root Check
- Wrapper-Gefahr erkennen
- ZIP/Archiv-Dateien ignorieren/blockieren
- Remote-Dateiliste holen
- Löschliste anzeigen
- Bestätigung REPLACE ROOT
- Token lokal in iPhone Keychain

Muss nicht zwingend geändert werden.

Optional:
SCRIPTABLE_WRAPPER_AUTO_ROOT_DETECT_PATCH

────────────────────────────────
17. GOVEE / FX / SCENE SYNC
────────────────────────────────

Dateien:
js/system-extra/govee/govee-bridge-client.js
js/system-extra/govee/govee-fx-control-hooks.js
js/system-extra/govee/govee-scene-sync.js
js/system-extra/govee/govee-sync-config.js
GOVEE_FX_SCENE_SYNC_ADDON.zip

Funktionen:
- Govee Bridge Client
- Enable/Disable
- Mode setzen
- Audio/Szene senden
- Test On/Off/Color
- Scene-to-mode mapping
- Analyzer Mapping
- FX Control Hooks

Status:
Zusatzsystem / GOVEE-FX
Nicht mit Audio-Buffering-Debug vermischen.

────────────────────────────────
18. CHAOS ENGINE / EXTERNAL WORKERS
────────────────────────────────

CHAOS_ENGINE/
- Chaos Engine UI
- Track Factory
- Fraggle Detlef System
- Suno Renderer Integration
- API Provider Daten
- Master Handoff Daten

external-workers/666-chaos-ai-track-system/
- AI Client
- Auth
- Prompt Compiler
- Responses
- Validator
- Worker

external-workers/666-suno-system/
- Auth
- Jobs
- Responses
- Suno Adapter
- Validator
- Worker

Status:
Externe Zusatzsysteme.
Nicht in Player-Audio-Patch hineinziehen.

────────────────────────────────
19. CODE-LEVEL FUNKTIONSINVENTAR — WICHTIGE DATEIEN
────────────────────────────────

index.html
Zentrale Funktionsgruppen:
- MFF/Mobile Audio
- Mobile UI
- Stream Buttons
- Meta
- History
- Panel LEDs
- Boost
- EQ Mini-Graph
- Ticker
- Artwork
- Transport Buttons

Wichtige Funktionen:
getAudio()
markMffAudioDirty()
resetMffAudioGraph()
prepareMffAudioForPlay()
recoverMffInterruptedAudio()
ensureAudioGraph()
applyBoostRamp()
resumeAudioGraph()
play()
pause()
stop()
boost()
installMffAudioSelfHealEvents()
getStreamUrlForTarget()
setManualStreamTarget()
updateStreamSwitchButtons()
bindStreamSwitch()
setPanelLed()
setPanelLedTip()
fetchMeta()
applyMeta()
tickMeta()
startMeta()

js/player-core.js
Zentrale Funktionsgruppen:
- PC Audio Transport
- Metadata
- History
- Stream LEDs
- Booster
- Watchdog
- Health

Wichtige Funktionen:
markAudioSelfHealDirty()
prepareAudioElementForFreshPlay()
recoverInterruptedAudio()
updateBoostDiagnosticLabel()
setBoostStage()
changeBoostStage()
updateStreamPanelLeds()
setActivePanelLeds()
setStoppedPanelLeds()
syncStreamLedFromStatus()
setStatus()
setSource()
fetchMetadata()
startMetadataLoop()
stopPlayback()
playCurrent()
healthPing()
applyBoost()
audioWatchdog()

js/phase10-stability-iphone-panel-hud.js
Zentrale Funktionsgruppen:
- Audio Authority
- iPhone Stability
- PC/iPhone Parity
- Bottom Safe Hub
- Audio Focus
- Main/Backup Guard
- Side Meter
- Central Audio Guard

Wichtige Funktionen:
s666CentralAudioAuthorityActive()
s666AudioAuthorityHandoff()
installAudioRecovery()
recoverAudio()
installAudioFocusGuard()
installPcMainBackupGuard()
phase10RelocatePcPanels()
parityOpenSound()
parityOpenAdmin()
parityLockViewport()
iphoneAudioV2Recover()
centralAudioGuardV2Recover()
s666AudioOrchestra()

js/equalizer.js
Wichtige Funktionen:
createRealEqNodes()
applyRealEqToNodes()
bindRealEqPanel()
createBars()
applyMeters()
startVisualizer()
renderFallback()
setBoostStage()

js/player-admin-overlay.js
Wichtige Funktionen:
openAdminOverlay()
closeAdminOverlay()
checkApi()
loadConfig()
listBackups()
previewConfig()
commitConfig()
rollbackLatest()
checkAllLayers()
checkBroadcastStatus()
testBroadcast()
setDiscordLed()
sendDiscordAdmin()
statusDiscordAdmin()

js/sound-control-overlay-v1.js
Wichtige Funktionen:
readEqFromDom()
applyEqToDom()
readBoostStage()
setBoostStage()
applyDraft()
open()
requestClose()
savePresetSlot()
loadPresetSlot()
updateLed()
mountButton()
mountTriggers()
boot()

js/addons/discord-player-addon-v3.js
Wichtige Funktionen:
setLed()
checkStatus()
manualPost()
messagePost()
postTrackIfChanged()
startTrackWatcher()
createPanel()
mountAll()

js/addons/player-broadcast-alert-v148.js
Wichtige Funktionen:
setLed()
ensureListenerOverlay()
ensureComposer()
openComposer()
postMessage()
sendFromComposer()
sendFromPcInline()
mountPc()
mountMobile()
poll()

worker.js
Wichtige Funktionen:
checkExternal()
proxyStream()
proxyStreamFailover()
proxyFallbackStream()
serveExternalIndex()
handlePlayerAlertV152()
s666RouteTable()
s666ModuleStatus()
s666LiveHealth()
s666LiveDebug()

worker-addons/discord-notify-addon-v3.js
Wichtige Funktionen:
getDiscordWebhook()
getPrivateTrackWebhook()
sendDiscordToWebhook()
sendDiscord()
sendPrivateNowPlayingIfConfigured()
handleDiscordNotifyV3()

worker-addons/radio-admin-config-addon.js
Wichtige Funktionen:
verifyAdminAuth()
githubGetFile()
githubPutFile()
githubListDir()
validatePayload()
current()
backups()
update()
rollback()
handleRadioAdminConfigAddon()

core/audio/boost-core.js
Wichtige Funktionen:
getStageInfo()
getGain()
getLabel()
isDanger()
loadStage()
saveStage()
publish()

core/overlay/overlay-core.js
Wichtige Funktionen:
lock()
unlock()
register()
open()
close()
withLock()
protectTextFields()
boot()

────────────────────────────────
20. AKTIVE SCHUTZSYSTEME / ORCHESTER
────────────────────────────────

Führende Schutzreferenz:
GENERAL_AUDIT_RECOVERY_FULLVERSION_HANDOFF_v1_1_3_REPAIR_FULLVERSION.md

Aktive Schutzlogiken:
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

Kernregeln:
- keine Mini-Backups als Fullversion
- keine kleinen Ersatz-ZIPs
- kein Freeze ohne Artifact-Inventory
- keine stille Kürzung
- keine stille Architekturwechsel
- keine Patch-Datei als angebliche Vollversion
- Codebefund vor Patch
- Problem auf zuständigem Layer reparieren
- keine Layer-Stapelung
- zentrale Logik zentral entwickeln
- PC/iPhone/Android funktional gleichwertig halten

────────────────────────────────
21. BISHER GEMACHTE ÄNDERUNGEN / PATCHES
────────────────────────────────

1. Safe Root Repack 473
Status:
früher erstellt, sauberer Repack ohne Wrapper.

2. Scriptable Safe Root Replace Script
Status:
bereitgestellt, Root-Check aktiv.

3. AUDIO_CORE_AUTHORITY_PATCH_1FILE
Ziel:
Audio-Authority in Phase10 teilweise reparieren.
Ergebnis:
Nicht ausreichend.

4. IOS_AUDIO_FOCUS_RESUME_PATCH
Ziel:
iPhone Audio Focus / Resume.
Ergebnis:
Nicht ausreichend.

5. IOS_PC_AUDIO_RECOVERY_ESCALATION_PATCH_A
Ziel:
Recovery-Eskalation PC/iPhone besser steuern.
Ergebnis:
Nicht ausreichend.

6. PC_IPHONE_ANDROID_AUDIO_HEALING_ORCHESTRA_PATCH_1
Ziel:
zentrale Audio-Healing-Entscheidung.
Ergebnis:
Nicht ausreichend.

7. INDEX_MFF_SELFHEAL_AUTHORITY_PATCH
Ziel:
MFF Selfheal in index.html bei aktivem Orchester Sensor-only machen.
Ergebnis:
Patch erstellt, finale Live-Bestätigung offen.

8. General Audit Recovery v1.1.3 Adoption
Ziel:
Schutz-/Audit-/Recovery-System als führende Referenz setzen.
Ergebnis:
Aktiv als Schutzreferenz, keine Player-Codeänderung.

9. Layer Inventory Audit
Ziel:
Layer im Player identifizieren.
Ergebnis:
passiver Befund, keine Änderung.

────────────────────────────────
22. OFFENE ÄNDERUNGEN
────────────────────────────────

A) Player Function Inventory and Centralization Audit
Muss als nächstes kommen.

Ziel:
Jede wichtige Funktion bekommt Status:
- CENTRALIZE_NOW
- CENTRALIZE_LATER
- LOCAL_KEEP
- SENSOR_ONLY
- WRAPPER_TO_CENTRAL
- DO_NOT_TOUCH
- UNKNOWN

B) Worker Route and Remote Control Audit
Ziel:
Skip-/Next-Worker finden, zweiten Worker identifizieren, vorhandene Routen prüfen.

C) Responsive Stage and Panel LED Audit
Ziel:
PC Topbar, iPhone Stage, LED-Leisten, Proportionen, Breakpoints, No Scroll / No Zoom.

D) Player Feature Parity and Admin Audit
Ziel:
PC/iPhone/Admin/Sound/EQ/Booster/Farblogik/Funktionen vergleichen.

E) Stream Preset Registry
Ziel:
main/backup/domain/domain_stream/tunein/healing/the_back zentral verwalten.

F) Dashboard / Radio Control Patch Plan
Ziel:
Radio-Control vorbereiten, ohne zweite Dashboard-Welt.

G) SB / Buffering Diagnose
Ziel:
sichtbare Buffering-LED als Diagnose, ohne Recovery-Funktion.

H) Safe Root Deploy Repack
Ziel:
maßgebende Wrapper-ZIP in deploybare Root-ZIP ohne Wrapper verwandeln.

I) Full Backup ZIP
Ziel:
separates Vollbackup mit Repo-Deploy-ZIP + Register + Audits + Orchester + Manifest + SHA256SUMS.

────────────────────────────────
23. WICHTIGSTE PROBLEME
────────────────────────────────

Problem 1:
Audio-Aussetzer / Buffering-Gefühl

Priorität:
SEHR HOCH

Vermutung nach Codebefund:
Parallele Audio-/Recovery-Layer.

Nicht tun:
weiteren Watchdog bauen.

Tun:
Funktionen inventarisieren, Owner setzen, doppelte Recovery abschalten.

Problem 2:
index.html ist überladen

Priorität:
HOCH

Grund:
HTML enthält Mobile-Audio, Meta, Boost, Streamswitch, LEDs, History, Ticker.

Nicht tun:
aufräumen/kürzen.

Tun:
Funktionsinventar und schrittweise Zentralisierung.

Problem 3:
worker.js enthält viele Rollen

Priorität:
HOCH

Grund:
Streamproxy, Notfallplayer, Admin, Discord, Broadcast, Assets.

Nicht tun:
blind ändern.

Tun:
Worker Route and Remote Control Audit.

Problem 4:
PC/iPhone Feature-Parity unvollständig geprüft

Priorität:
MITTEL-HOCH

Betroffen:
Sound, Admin, Booster, EQ-Klick, LED-Leisten.

Problem 5:
Streamdaten mehrfach vorhanden

Priorität:
MITTEL-HOCH

Lösung:
zentrale Preset-Registry.

Problem 6:
Repo-Deploy und Full-Backup dürfen nicht vermischt werden

Priorität:
HOCH

Lösung:
Dual-ZIP-Regel.

────────────────────────────────
24. NICHT ANFASSEN OHNE EXTRA AUDIT
────────────────────────────────

Nicht blind anfassen:

worker.js Streamproxy
interner Notfallplayer
Audio play/pause/load/src
EQ WebAudio Graph
iPhone Fullscreen / Viewport
Admin Config Commit / Rollback
Discord Webhook Logic
Broadcast Message Backend
Scriptable Root Replace
SonicPanel-/MyIDJ-Ansteuerung
Secrets / ENV / Tokens

────────────────────────────────
25. EMPFOHLENE NÄCHSTE REIHENFOLGE
────────────────────────────────

1. PLAYER_FUNCTION_INVENTORY_AND_CENTRALIZATION_AUDIT
2. WORKER_ROUTE_AND_REMOTE_CONTROL_AUDIT
3. RESPONSIVE_STAGE_AND_PANEL_LED_AUDIT
4. PLAYER_FEATURE_PARITY_AND_ADMIN_AUDIT
5. STREAM_PRESET_REGISTRY_PATCH_PLAN
6. RADIO_CONTROL_DASHBOARD_PATCH_PLAN
7. Kleine Implementierung nur nach Audit
8. Re-Audit
9. Safe-Root-Deploy-ZIP bauen
10. separates Full-Backup-ZIP bauen

────────────────────────────────
26. ENDREGEL FÜR DEN NÄCHSTEN AGENTEN
────────────────────────────────

Nicht raten.
Nicht verschönern.
Nicht kürzen.
Nicht neue Layer drüberlegen.
Nicht Worker blind ändern.
Nicht Notfallplayer löschen.
Nicht Streamdaten verstreuen.
Nicht Full-Backup in Repo packen.

Erst Codebefund.
Dann Patchplan.
Dann Go.
Dann minimaler Patch.
Dann Re-Audit.
Dann getrennte Deploy-/Backup-ZIPs.