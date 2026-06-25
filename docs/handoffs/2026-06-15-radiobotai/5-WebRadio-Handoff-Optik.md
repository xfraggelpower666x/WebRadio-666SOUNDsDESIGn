HANDOUT — SYSTEMPANEL-LEDs / FARBLOGIK / PLAYER-LAYOUT / METER / VERSION / LOGO

Projekt: 666SOUNDsDESIGn WebRadio / 666 Stream Player

Zweck: Übergabe der geplanten Systempanel-, LED-, Layout- und Meter-Arbeiten

Status: Planung / Anforderungen / kein Codepatch

Wichtig: Aktueller Stand ist nicht ausreichend

────────────────────────────────

1. KURZFAZIT
    ────────────────────────────────

Der aktuelle optische Stand des Players ist nicht ausreichend.

Geplant war ein sauber geordnetes Systempanel mit klarer LED-Farblogik, Tooltip-/Mouseover-Funktionen, Schalter-LEDs, Streamdiagnose, Messenger-/Broadcast-Bereich, korrekter Versionsanzeige, besserem Logo, korrekt positionierter Copyright-Zeile und symmetrischen Levelmetern.

Besonders wichtig:

* Streamrelevante LEDs nach oben über den Equalizer.
* Listener, Bitrate und DJ-Status nach links schieben.
* Rechts daneben die Stream-/Systempanel-LEDs.
* Unten eher Messenger, Discord, Admin, Sound, Zusatzsysteme.
* PC und iPhone müssen logisch gleich sortiert sein.
* iPhone darf kompakter umbrechen, aber nicht anders sortieren.
* Keine Panels dürfen aus Begrenzungslinien laufen.
* Kein Layout darf bei kleineren Bildschirmformaten verschachteln oder unbrauchbar werden.

────────────────────────────────
2. SYSTEMPANEL-LED-GRUNDREGEL
────────────────────────────────

PC und iPhone müssen dieselbe logische LED-Struktur haben.

Nicht erlaubt:

* PC anders sortiert als iPhone
* iPhone abgespeckt
* LEDs ohne Tooltip
* LEDs ohne Farblogik
* Stream-LEDs unten verstreut
* Schalter ohne Statusanzeige
* Statusanzeige ohne Funktion, wenn Schalter geplant war

Erlaubt:

* PC breit nebeneinander
* iPhone in 1–2 Zeilen
* gleiche Reihenfolge
* gleiche Kürzel
* gleiche Bedeutung
* gleiche zentrale Statuslogik
* anderes Layout nur wegen Bildschirmgröße

────────────────────────────────
3. GEPLANTE LED-LEISTEN
────────────────────────────────

LEISTE 1 — STREAM / VERBINDUNG / AUDIOFLUSS

Diese LEDs sollen nach oben, über bzw. im Bereich über dem Equalizer.

Reihenfolge:

H
Hauptstream / LED + Schalter + Tooltip

B
Backupstream / LED + Schalter + Tooltip

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
Reconnect / LED + Schalter

MTR
Meter / Audio-Level

────────────────

LEISTE 2 — AKTIONEN / KOMMUNIKATION / ZUSATZSYSTEME

Diese LEDs können unten oder in einem zweiten Bereich liegen.

Reihenfolge:

EQ
Equalizer / Sound

DSC
Discord

MSG
Broadcast / Messenger / Nachrichten

ADM
Admin

GOV
GOVEE / FX

CHA
Chaos / System

────────────────────────────────
4. LED-FARLOGIK GLOBAL
────────────────────────────────

Grün:
OK / stabil / erfolgreich / aktiv und gesund

Türkis:
arbeitet / verbunden / normal aktiv / bereit

Pink:
Warnung / Übergang / sendet / buffert / reconnecting / hoher Bereich

Rot:
Fehler / kritisch / offline / fehlgeschlagen / blockiert

Leer / Grau:
aus / inaktiv / nicht verfügbar / noch nicht konfiguriert

────────────────────────────────
5. SPEZIELLE LED-FARLOGIK
────────────────────────────────

H — HAUPTSTREAM

Grün:
Hauptstream aktiv und spielt stabil

Türkis:
Hauptstream verfügbar / auswählbar

Pink:
Umschaltung auf Hauptstream läuft

Rot:
Hauptstream Fehler / nicht erreichbar

Tooltip:
Hauptstream — Klick schaltet sofort auf Hauptstream.

Funktion:
Schalter + Status-LED

────────────────

B — BACKUPSTREAM

Grün:
Backupstream aktiv und spielt stabil

Türkis:
Backupstream verfügbar / auswählbar

Pink:
Umschaltung auf Backupstream läuft

Rot:
Backupstream Fehler / nicht erreichbar

Tooltip:
Backupstream — Klick schaltet sofort auf Backupstream.

Funktion:
Schalter + Status-LED

────────────────

SB — STREAM BUFFERING

Grün:
No Buffering / stabil

Türkis:
Normales kurzes Buffering / Netzwerk arbeitet

Pink:
Under Buffering / Buffer-Risiko / waiting / stalled

Rot:
Hard Buffering / Stream hängt / Recovery fehlgeschlagen

Tooltip:
Stream Buffering — zeigt, ob der Player stabil läuft, normal puffert, unterpuffert oder hart hängt.

Wichtig:
SB ist nur Diagnose.
SB darf nicht selbst recovern.

────────────────

RCN — RECONNECT

Grün:
Reconnect nicht nötig / stabil

Türkis:
Reconnect bereit

Pink:
Reconnect läuft

Rot:
Reconnect fehlgeschlagen

Tooltip:
Reconnect — aktuellen Stream kontrolliert neu verbinden.

Funktion:
Schalter + Status-LED

────────────────

DSC — DISCORD

Grün:
Discord erfolgreich / verbunden

Türkis:
bereit

Pink:
sendet / cooldown

Rot:
Fehler / Webhook fehlt / Sendung fehlgeschlagen

Tooltip:
Discord-Status — zeigt Senden, Erfolg, Fehler oder Bereitschaft.

────────────────

MSG — MESSENGER / BROADCAST

Grün:
Nachricht erfolgreich gesendet

Türkis:
bereit / Empfangsmodus

Pink:
sendet / wartet / in Bearbeitung

Rot:
fehlgeschlagen

Tooltip:
Broadcast-/Messenger-Status — Nachricht senden, Erfolg, Fehler oder Empfangsstatus.

────────────────

MTR — METER

Grün:
Meter aktiv / Signal stabil

Türkis:
Meter arbeitet

Pink:
Signal auffällig / Pegel hoch / Übergang

Rot:
Meterfehler / kein Signal / Übersteuerung möglich

Tooltip:
Audio-Level / Meterstatus

────────────────────────────────
6. TOOLTIP / MOUSEOVER / LONGPRESS
────────────────────────────────

Jede LED braucht:

* Kürzel
* Klartext-Titel
* Tooltip / Mouseover
* auf iPhone Longpress oder Tap-Hinweis
* Farblogik
* optional Klickfunktion, wenn es ein Schalter ist

Beispiel:

Kürzel:
SB

Tooltip:
Stream Buffering — Grün stabil, Türkis normaler Buffer, Pink Unterpufferung, Rot harter Stream-Stall.

Beispiel für Schalter:

Kürzel:
B

Tooltip:
Backupstream — Klick schaltet sofort auf Backupstream.

────────────────────────────────
7. PC-LAYOUT — GEPLANTE ANORDNUNG
────────────────────────────────

Oben links:

Listener-Panel
So groß wie nötig, ganz nach links schieben.

Streamqualität / Bitrate
Direkt rechts neben Listener, so groß wie nötig.

Aktueller DJ / DJ-Status
Direkt rechts neben Streamqualität, Größe beibehalten.

Danach rechts daneben:

Streamrelevante Systempanel-LEDs:

H B STR SB SRC MET WRK AUD WCH RCN MTR

Diese LEDs gehören nach oben, über den Equalizer bzw. in den oberen Stream-/Verbindungsbereich.

────────────────

Unten:

Nicht-streambezogene Funktionen:

EQ DSC MSG ADM GOV CHA

Dazu:
Messenger-/Broadcast-Bereich größer und sauber angeordnet.

────────────────────────────────
8. iPHONE-LAYOUT — GEPLANTE ANORDNUNG
────────────────────────────────

iPhone muss die gleiche logische Sortierung haben wie PC.

Streamleiste:

H B STR SB SRC MET
WRK AUD WCH RCN MTR

Falls zu eng:

Zeile 1:
H B STR SB SRC

Zeile 2:
MET WRK AUD WCH RCN MTR

Zweite Leiste:

EQ DSC MSG ADM GOV CHA

Wichtig:

* kein horizontaler Scroll
* kein vertikaler Scroll
* ganze Player-Seite
* keine Panels über Begrenzungslinien
* keine manuelle Zoom-Reparatur nach Overlay
* Overlay schließen muss Player wieder vollständig anzeigen

────────────────────────────────
9. MESSENGER-/BROADCAST-SYSTEM
────────────────────────────────

Der aktuelle Messenger-/Broadcast-Bereich ist nicht ausreichend.

Geplant:

* unten größeres Fenster
* sauberer geordnet
* besser lesbar
* klare Status-LED MSG
* Verlauf / History der letzten Nachrichten
* Senden / Erfolg / Fehler sichtbar
* PC und iPhone erreichbar
* keine Überlagerung mit Stream-LEDs

MSG-Farblogik:

Grün:
erfolgreich gesendet

Türkis:
bereit / Empfangsmodus

Pink:
sendet / wartet

Rot:
fehlgeschlagen

Messenger-Fenster soll nicht winzig oder versteckt sein, sondern als eigener klarer Bereich erscheinen.

────────────────────────────────
10. VERSIONSNUMMER
────────────────────────────────

Die Versionsnummer muss immer korrekt sein.

Regeln:

* keine falsche alte Versionsnummer anzeigen
* keine doppelte Versionsanzeige
* Versionsnummer muss zum tatsächlichen Build/Patch passen
* bei jedem Patch prüfen
* PC und iPhone gleiche Versionsbasis
* wenn kein neuer Codepatch: Versionsnummer nicht künstlich erhöhen

Version sollte im UI klar sichtbar sein, ohne andere Controls zu stören.

────────────────────────────────
11. LEVELMETER LINKS / RECHTS
────────────────────────────────

Geplantes Meter-Design:

* links und rechts Levelmeter
* äußere Meter größer
* nach innen hin kleiner werdend
* Treppenform
* linke Seite muss nach rechts gespiegelt werden
* rechte Seite ist Spiegel der linken Seite
* Bewegung sichtbar und lebendig
* nicht statisch
* keine Überlagerung mit Playerflächen
* keine abgeschnittenen Meter
* Proportionen je Bildschirmformat schützen

Bildlogik:

Links:
Außen groß → innen kleiner

Rechts:
Innen kleiner ← außen groß

Also:
Die Seiten müssen symmetrisch wirken.

Wichtig:
Meter darf anzeigen.
Meter darf nicht Audio recovern.
Meter darf nicht src/load/play auslösen.

────────────────────────────────
12. COPYRIGHT-ZEILE
────────────────────────────────

Geplant:

* Copyright-Zeile weiter nach oben
* unter das Logo
* nicht zu tief im Player
* sauber lesbar
* nicht mit Controls oder LEDs kollidieren
* PC und iPhone angepasst

Beispielposition:
Logo oben
darunter Copyright
darunter Stream-/Statusbereiche

────────────────────────────────
13. LOGO
────────────────────────────────

Das Logo oben soll vernünftig ausgetauscht werden.

Regeln:

* altes/falsches Logo ersetzen
* neues Logo sauber skalieren
* keine Verzerrung
* kein abgeschnittener Glow
* kein unsauberer Rand
* PC und iPhone korrekt
* Logo darf keine Buttons überdecken
* Copyright-Zeile darunter einplanen

────────────────────────────────
14. EQUALIZER-BEREICH
────────────────────────────────

Stream-LEDs sollen über den Equalizer wandern.

Geplante Struktur:

Oben:
Listener / Bitrate / DJ-Status / Stream-LEDs

Darunter:
grafischer Equalizer

Dann:
Hauptplayer-/Control-Bereich

iPhone:
Klick auf grafischen Equalizer soll Sound-/EQ-Overlay öffnen.

iPhone EQ:
manueller 9-Band-EQ im Overlay.

────────────────────────────────
15. RESPONSIVE-GUARDS
────────────────────────────────

Wichtig:

Wenn sich Bildschirmformat ändert, darf der Player nicht kaputtgehen.

Regeln:

* keine Verschachtelung
* kein Quetschen
* keine überlappenden Panels
* keine abgeschnittenen LEDs
* kein horizontaler Scroll
* kein vertikaler Scroll auf iPhone
* PC schmal darf auf Mobile-Optik wechseln
* iPhone bleibt immer ganze Player-Seite
* Overlays müssen nach dem Schließen Viewport resetten

PC:
Breit = PC-Cockpit

PC zu schmal:
auf kompakte Mobile-/iPhone-Optik wechseln

iPhone:
immer Fullscreen-Player-Seite

────────────────────────────────
16. GEPLANTE ORCHESTER / GUARDS FÜR DIESE ARBEIT
────────────────────────────────

Grand Visual Meter Orchestra

Zweck:
Optischen Playerzustand schützen, Meter, Panels, LED-Leisten, Logo, Copyright, Proportionen und Responsive-Verhalten steuern.

Panel LED Orchestra

Zweck:
LEDs logisch sortieren, PC/iPhone gleich halten, Farblogik und Tooltips verwalten.

Grand Meter Orchestra

Zweck:
Meter-Treppenform, Spiegelung, Bewegung und Grenzen schützen.

Responsive Stage Orchestra

Zweck:
PC/iPhone/Android Layout stabil halten.

iPhone Overlay Viewport Orchestra

Zweck:
Overlay-Zoom-Problem auf iPhone verhindern.

Feature Parity Orchestra

Zweck:
PC und iPhone funktional gleichwertig halten.

Code Preservation Guard

Zweck:
Keine Verschönerung, Kürzung oder stille Vereinfachung mit Funktionsverlust.

Layer Governance Guard

Zweck:
Keine neuen Layer über alte Probleme klatschen; zuständigen Layer reparieren.

────────────────────────────────
17. DATEIEN, DIE WAHRSCHEINLICH BETROFFEN SIND
────────────────────────────────

Vor jedem Patch prüfen:

index.html
PC- und iPhone-Struktur, LED-Container, Logo, Copyright, Streampanels, MFF-Leisten.

css/*
Layout, Meter, Panels, Responsive, Logo, Copyright.

js/shared-status.js
Statuschip-/Farblogik-Basis.

js/player-core.js
Stream-LEDs, Status, Meter-/Streamstatus.

js/phase10-stability-iphone-panel-hud.js
iPhone-HUD, PC/iPhone-Parity, Viewport, Panel-Relocation.

js/equalizer.js
Meter/Visualizer.

js/sound-control-overlay-v1.js
EQ-/Sound-Overlay.

js/broadcast-message-history.js
Messenger-/History-Fenster.

js/addons/player-broadcast-alert-v148.js
Broadcast-Sendestatus.

js/addons/discord-player-addon-v3.js
Discord-LED/Status.

Nicht blind anfassen:
worker.js, Audio play/load/src, EQ WebAudio Graph, Admin-Config, Secrets.

────────────────────────────────
18. WAS NOCH FEHLT
────────────────────────────────

Noch offen:

1. Systempanel-LEDs vollständig planen und einbauen.
2. Farblogik zentralisieren.
3. SB-LED ergänzen.
4. RCN-LED ergänzen.
5. H/B als LED + Schalter absichern.
6. Stream-LEDs nach oben verschieben.
7. Listener, Bitrate, DJ-Status links korrekt anordnen.
8. Messenger unten größer und sauberer anordnen.
9. Versionsnummer korrekt und stabil machen.
10. Levelmeter links/rechts als Treppe bauen.
11. Linkes Meter nach rechts spiegeln.
12. Copyright-Zeile unter Logo nach oben.
13. Logo sauber ersetzen.
14. iPhone-Layout mit gleicher LED-Sortierung.
15. iPhone No-Scroll/No-Zoom sichern.
16. Responsive Breakpoints schützen.
17. Codeaudits vor Patch durchführen.

────────────────────────────────
19. PATCH-REIHENFOLGE EMPFOHLEN
────────────────────────────────

1. RESPONSIVE_STAGE_AND_PANEL_LED_AUDIT
2. SYSTEMPANEL_LED_STRUCTURE_PATCH_PLAN
3. GRAND_METER_ORCHESTRA_LAYOUT_AUDIT
4. LOGO_COPYRIGHT_HEADER_AUDIT
5. MESSENGER_PANEL_LAYOUT_AUDIT
6. kleine Patch-Serie:
    A) LED-Struktur
    B) Farblogik
    C) Meter-Treppe
    D) Logo/Copyright
    E) Messenger unten
7. Re-Audit
8. Safe-Root-Deploy-ZIP
9. separates Full-Backup-ZIP

────────────────────────────────
20. ENDREGEL FÜR AGENT / CODEBAU
────────────────────────────────

Nicht sofort alles umbauen.

Erst prüfen:

* Wo sitzen aktuelle LED-Container?
* Welche IDs haben sie?
* Welche CSS-Klassen steuern sie?
* Welche JS-Funktionen setzen Status?
* Welche LEDs sind bereits vorhanden?
* Welche sind geplant, aber fehlen?
* Welche Buttons sind Schalter?
* Was ist PC?
* Was ist iPhone?
* Was ist gemeinsam?
* Was darf zentralisiert werden?

Dann Patchplan.
Dann Go.
Dann minimaler Patch.
Dann Re-Audit.



HANDOUT — FRAGGLE-DNA SYSTEMPANELS / AUDIOREAKTIVE LED / HAUPTNAME / BEWEGTE SIDE-PANELS

Projekt: 666SOUNDsDESIGn WebRadio / 666 Stream Player

Zweck: Übergabe der geplanten bewegten Systempanel- und Fraggle-DNA-Visual-Elemente

Status: Konzept-/Anforderungs-Handoff, kein Codepatch

Hinweis: Exakte historische Namen müssen im Code/Altstand noch geprüft werden

────────────────────────────────

1. KURZFAZIT
    ────────────────────────────────

Zusätzlich zu den normalen Systempanel-LEDs waren spezielle bewegte Visual-Panels geplant.

Diese Elemente sind nicht nur einfache Status-LEDs, sondern Teil der visuellen 666SOUNDsDESIGn / Fraggle-DNA-Identität.

Geplant waren:

* links ein vertikales bewegtes Systempanel
* rechts ein vertikales bewegtes Systempanel
* beide Seiten gespiegelt
* beide Seiten audioreaktiv oder pseudo-audioreaktiv
* Treppenform der Levelmeter von außen groß nach innen kleiner
* oben eine audioreaktive LED / ein reaktiver Hauptindikator
* ein angemessener Hauptname / Titel für den Player
* optische Verknüpfung mit Fraggle-DNA / 666SOUNDsDESIGn / CyberStream-Cockpit-Identität

────────────────────────────────
2. WICHTIGER STATUS ZU DEN ALTEN NAMEN
────────────────────────────────

Die exakten früher geplanten Namen sind in diesem Chatverlauf nicht sicher genug als Codebefund belegt.

Deshalb gilt:

STATUS:
NAMEN MÜSSEN NOCH PER CODE-/ALTSTAND-AUDIT GEPRÜFT WERDEN

Nicht einfach neue Namen erfinden und als historisch behaupten.

Vor Umsetzung prüfen:

* index.html
* css/*
* js/phase10-stability-iphone-panel-hud.js
* js/equalizer.js
* alte Preview-/Header-Dateien
* Bild-/Logo-Dateien
* ältere ZIP-Stände
* CSS-Klassen für left/right panels
* IDs für audio reactive LEDs
* Header-/Logo-/Title-Bereiche

────────────────────────────────
3. VORGESCHLAGENE NAMENSLOGIK
────────────────────────────────

Falls die alten Namen nicht mehr sauber auffindbar sind, soll die neue Namenslogik zur bestehenden Projektidentität passen.

Hauptfamilie:

FRAGGLE DNA
666SOUNDsDESIGn
CyberStream Cockpit
Audio-Reactive DNA
Pulse Rails
Reactor Rails
Signal Rails

────────────────────────────────
4. HAUPTNAME DES PLAYERS
────────────────────────────────

Der Player braucht einen angemessenen Hauptnamen.

Empfohlene Hauptnamen:

Option A:
666SOUNDsDESIGn CyberStream Cockpit

Option B:
666 CyberStream Cockpit

Option C:
666SOUNDsDESIGn Stream Reactor

Option D:
Fraggle DNA Stream Cockpit

Empfehlung:
666SOUNDsDESIGn CyberStream Cockpit

Warum:

* verbindet Radio
* verbindet Cyber-Optik
* verbindet Cockpit-UI
* klingt nach Steuerzentrum
* passt zu Stream, Panels, LEDs, Worker, Admin, Dashboard

Der Hauptname soll im oberen Playerbereich sitzen und mit Logo/Header zusammenspielen.

────────────────────────────────
5. BEWEGTE VERTIKALE SYSTEMPANELS LINKS / RECHTS
────────────────────────────────

Geplant:

Links:
vertikales bewegtes Panel

Rechts:
vertikales bewegtes Panel

Beide:
gespiegelt
audioreaktiv oder pseudo-audioreaktiv
visuell wie lebendige Energiekanäle
nicht nur statische Balken

Mögliche Namen:

LEFT_FRAGGLE_DNA_RAIL
RIGHT_FRAGGLE_DNA_RAIL

oder deutsch:

LINKE_FRAGGLE_DNA_SCHIENE
RECHTE_FRAGGLE_DNA_SCHIENE

Bessere UI-Namen:

Fraggle DNA Left Pulse Rail
Fraggle DNA Right Pulse Rail

Kurzlabel intern:

FDL
FDR

Alternativ:

DNA Rail L
DNA Rail R

────────────────────────────────
6. TREPPEN-METER-LOGIK
────────────────────────────────

Die Levelmeter links und rechts sollen eine Treppe bilden.

Regel:

Außen:
größer / länger / dominanter

Nach innen:
immer kleiner

Links:
von außen links nach innen rechts kleiner werdend

Rechts:
gespiegelt
von innen links nach außen rechts größer werdend

Visuelles Ziel:

Linke Seite:
groß → mittel → klein

Rechte Seite:
klein → mittel → groß

Die rechte Seite muss optisch die linke Seite spiegeln.

Nicht erlaubt:

* beide Seiten gleich herum
* rechts nicht gespiegelt
* Meter aus Begrenzungslinien heraus
* statische Meter ohne Bewegung
* Meter verdecken Buttons
* Meter verschieben Playerlayout

────────────────────────────────
7. AUDIOREAKTIVE LED OBEN
────────────────────────────────

Oben war eine audioreaktive LED / ein audioreaktiver Indikator geplant.

Funktion:

* reagiert auf Audiopegel / Meter / Playback
* zeigt, ob Stream lebt
* visuelles Herzstück im oberen Bereich
* soll mit Fraggle-DNA verbunden sein

Mögliche Namen:

FRAGGLE_DNA_PULSE_LED
AUDIO_REACTIVE_DNA_LED
DNA_HEARTBEAT_LED
STREAM_REACTOR_LED
FRAGGLE_PULSE_BEACON

Empfohlener Name:

FRAGGLE_DNA_PULSE_BEACON

Kurzlabel:

DNA

Tooltip:
Fraggle DNA Pulse — reagiert auf Audio-/Stream-Aktivität.

Farblogik:

Grün:
Stream stabil / Audio aktiv

Türkis:
Audio aktiv / normales Signal

Pink:
starker Puls / hoher Energiezustand

Rot:
Audiofehler / kein Signal / kritischer Zustand

Leer/Grau:
inaktiv / kein Stream / Audio nicht gestartet

Wichtig:
Diese LED darf nur anzeigen.
Sie darf keine Recovery-Logik auslösen.
Sie darf kein play/load/src ausführen.

────────────────────────────────
8. FRAGGLE-DNA-VERKNÜPFUNG
────────────────────────────────

Diese Panels gehören nicht in die normale Funktions-LED-Leiste.

Sie sind Visual-/Identity-Elemente.

Bedeutung:

* Fraggle-DNA = kreative Signatur
* lebendiger Audio-Puls
* Stream als Energiekanal
* Cockpit als Steuerzentrale
* linke/rechte Rails als DNA-/Signal-Schienen
* obere LED als Pulse Beacon / Herzsignal

Sie dürfen optisch stärker wirken als normale kleine Statuschips, aber sie dürfen keine Bedienung blockieren.

────────────────────────────────
9. UNTERSCHEIDUNG ZWISCHEN STATUS-LEDs UND FRAGGLE-DNA-PANELS
────────────────────────────────

Normale Systempanel-LEDs:

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
EQ
DSC
MSG
ADM
GOV
CHA

Diese sind:

* Status
* Tooltip
* teilweise Schalter
* kompakt
* funktional

Fraggle-DNA-Panels:

LEFT_FRAGGLE_DNA_RAIL
RIGHT_FRAGGLE_DNA_RAIL
FRAGGLE_DNA_PULSE_BEACON

Diese sind:

* visuell
* audioreaktiv
* DNA-/Branding-Element
* Meter-/Pulse-orientiert
* keine normalen Schalter

────────────────────────────────
10. GEPLANTE POSITIONEN
────────────────────────────────

Oben:

Logo / Hauptname
Copyright darunter
Fraggle DNA Pulse Beacon im oberen Bereich
Stream-Info / Listener / Bitrate / DJ-Status
Stream-System-LEDs

Links:

Fraggle DNA Left Pulse Rail
Levelmeter-Treppe
außen groß, innen kleiner

Rechts:

Fraggle DNA Right Pulse Rail
gespiegelte Levelmeter-Treppe
innen kleiner, außen groß

Mitte:

Logo / Visualizer / Equalizer / Hauptplayerbereich

Unten:

Messenger / Broadcast größer
Discord / Admin / Sound / Zusatzsysteme
Aktion-LEDs

────────────────────────────────
11. PC-ANFORDERUNG
────────────────────────────────

PC darf breiter und stärker nach Cockpit aussehen.

PC-Aufbau:

* linker DNA-Rail außen
* rechter DNA-Rail außen
* oben Logo/Hauptname/Copyright/Pulse-Beacon
* Streampanels oben über Equalizer
* Listener / Bitrate / DJ links
* LEDs rechts daneben
* Messenger unten größer
* Admin/Sound/Discord unten geordnet

Wichtig:
Wenn PC-Fenster zu klein wird, nicht quetschen.
Dann auf Mobile-/iPhone-Layout wechseln.

────────────────────────────────
12. iPHONE-ANFORDERUNG
────────────────────────────────

iPhone muss gleiche Logik behalten, aber kompakt.

Möglich:

* DNA-Rails verkleinert oder schmaler
* Pulse Beacon oben kleiner
* LED-Leisten in 1–2 Reihen
* keine horizontale Breite überschreiten
* kein Scrollen
* kein Zoom nach Overlay
* Panels dürfen keine Controls überdecken

iPhone bleibt:
ganze Player-Seite

Nicht erlaubt:

* nach Overlay manuell rauszoomen müssen
* links/rechts scrollen
* vertikal scrollen
* DNA-Rails über Buttons
* LED-Leisten außerhalb des Rahmens

────────────────────────────────
13. MESSENGER-UNTEN
────────────────────────────────

Das Messenger-/Broadcast-System soll unten mehr Raum bekommen.

Geplant:

* größeres Fenster
* bessere Ordnung
* History sichtbar
* Senden klar
* Status MSG klar
* kein Zusammenquetschen mit Stream-LEDs
* nicht in der oberen Streamleiste

MSG bleibt in Aktion-/Kommunikationsleiste.

────────────────────────────────
14. LOGO / COPYRIGHT / HAUPTNAME
────────────────────────────────

Logo:

* oben sauber austauschen
* korrekt skalieren
* Glow nicht verlieren
* nicht abgeschnitten
* kein falscher Rand
* PC/iPhone passend

Hauptname:

Empfohlen:
666SOUNDsDESIGn CyberStream Cockpit

Copyright:

* weiter nach oben
* unter das Logo / unter den Hauptnamen
* sauber lesbar
* nicht im unteren Chaosbereich
* nicht mit Controls kollidieren

────────────────────────────────
15. CODE-PRÜFUNG VOR PATCH
────────────────────────────────

Vor Umsetzung prüfen:

index.html

* Header
* Logo
* Copyright
* LED-Container
* Meter-Container
* Mobile-/PC-Struktur

css/*

* Side panels
* Levelmeter
* Header
* Logo
* Copyright
* Responsive
* Mobile layout

js/equalizer.js

* Meterbewegung
* Visualizer
* Audio-Level
* fallback render

js/phase10-stability-iphone-panel-hud.js

* iPhone HUD
* PC/iPhone Parity
* Side-meter relocation
* viewport guard

js/shared-status.js

* Farblogik

js/player-core.js

* Streamstatus
* active/stopped LEDs
* meter status

Nicht blind anfassen:

worker.js
Audio play/pause/load/src
Admin config
Discord webhooks
Stream proxy
EQ WebAudio Graph

────────────────────────────────
16. NAMENREGISTER — VORSCHLAG
────────────────────────────────

Hauptname:
666SOUNDsDESIGn CyberStream Cockpit

Linkes Bewegpanel:
Fraggle DNA Left Pulse Rail

Rechtes Bewegpanel:
Fraggle DNA Right Pulse Rail

Obere audioreaktive LED:
Fraggle DNA Pulse Beacon

Interne IDs, falls neu nötig:

s666FraggleDnaLeftRail
s666FraggleDnaRightRail
s666FraggleDnaPulseBeacon

CSS-Klassen:

.s666-fraggle-dna-rail
.s666-fraggle-dna-rail-left
.s666-fraggle-dna-rail-right
.s666-fraggle-dna-pulse-beacon
.s666-dna-meter-step
.s666-dna-meter-step-left
.s666-dna-meter-step-right

Wichtig:
Vor Benennung im Code zuerst prüfen, ob alte IDs/Klassen schon existieren.

────────────────────────────────
17. WAS NICHT PASSIEREN DARF
────────────────────────────────

Nicht:

* alte geplante Namen blind ersetzen
* neue Namen als historische Wahrheit behaupten
* Side-Panels einfach löschen
* Meter nur optisch hübsch, aber nicht gespiegelt
* rechten Meter gleich wie linken statt gespiegelt
* Pulse Beacon als Recovery-Schalter missbrauchen
* Fraggle-DNA-Panels mit normalen System-LEDs vermischen
* iPhone dadurch breiter machen
* Logo austauschen und Glow verlieren
* Copyright zu tief lassen
* Messenger weiter zu klein lassen

────────────────────────────────
18. OFFENE AUFGABEN
────────────────────────────────

1. Altstand/Code nach alten Panel-Namen durchsuchen.
2. Aktuelle Side-Panel-IDs/Klassen prüfen.
3. Aktuelle Meter-Struktur prüfen.
4. Aktuelle Header-/Logo-Struktur prüfen.
5. Aktuelle Copyright-Position prüfen.
6. Audioreaktive obere LED suchen.
7. Falls alte Namen gefunden: übernehmen.
8. Falls nicht gefunden: Namensregister aus diesem Handout verwenden.
9. Meter-Treppenform planen.
10. Spiegelung rechts absichern.
11. iPhone-Proportion auditieren.
12. Messenger unten größer planen.
13. Stream-LEDs oben über Equalizer verschieben.
14. Re-Audit.

────────────────────────────────
19. EMPFOHLENER NÄCHSTER AUDIT
────────────────────────────────

FRAGGLE_DNA_VISUAL_PANEL_AND_METER_AUDIT

Ziel:

* alte Namen finden
* vorhandene IDs/Klassen finden
* Side-Panels lokalisieren
* audioreaktive LED oben lokalisieren
* Hauptnamen/Header prüfen
* Meter-Treppenlogik prüfen
* PC/iPhone-Proportionen prüfen
* Patch-Scope festlegen

Danach:

FRAGGLE_DNA_VISUAL_PANEL_PATCH_PLAN

Erst danach Codepatch.

────────────────────────────────
20. ENDREGEL
────────────────────────────────

Fraggle-DNA-Visuals sind Identitätselemente, keine normalen Statuschips.

Sie müssen:

* sichtbar
* audioreaktiv
* gespiegelt
* proportional
* sauber benannt
* mit Logo/Hauptname/Copyright verbunden
* PC und iPhone stabil

sein.

Sie dürfen nicht:

* Player-Funktionen stören
* Audio-Recovery auslösen
* Layout sprengen
* normale System-LEDs ersetzen
* ohne Codebefund umbenannt oder gelöscht werden.