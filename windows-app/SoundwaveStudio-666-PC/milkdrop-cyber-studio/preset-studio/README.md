# 666SOUNDsDESIGn — MilkDrop Preset Studio v0.4.0

## Vollautomatischer Windows-Start

1. ZIP vollstaendig in einen beschreibbaren Ordner entpacken (nicht direkt aus dem ZIP starten).
2. **START_STUDIO.bat** doppelklicken. Der Bootstrap prueft Python 3.10–3.14 inklusive Tkinter, richtet `.venv` ein und aktualisiert dort pip und optional tkinterdnd2.
3. Ohne Python installiert er automatisiert Python 3.13 fuer den aktuellen Benutzer: zuerst Windows winget (falls vorhanden), andernfalls signaturgepruefter offizieller Python.org-x64-Installer. Hierfuer wird Internet benoetigt. Es wird nichts kostenpflichtig gekauft.
4. **MAKE_EXE.bat** prueft zusaetzlich PyInstaller, fuehrt die Tests aus und erzeugt eine eigenstaendige `dist\666SD_Preset_Studio.exe` (Onefile). Keine Python-Installation auf dem Ziel-PC notwendig. Windows muss zu Windows passen: EXE unter Windows x64 erstellen.
5. **CHECK_TOOLS.bat** prueft Installation und Versionen *ohne etwas zu installieren*.

Logs: `logs\bootstrap_ACTION_DATUM_UHRZEIT.log` und `logs\LATEST.log`; Konsolenfehler bleiben sichtbar. Fehler beim GUI-Start landen im Bootstrap-Log, soweit sie ueber stdout/stderr gemeldet werden; native Windows-Abstuerze nicht zwingend.

### Update-Regeln / Sicherheit

- Bestehendes globales Python wird **nicht** aktualisiert, um andere Projekte nicht zu zerstoeren. Bei vorhandenem kompatiblen Python erfolgt nur ein Update der isolierten Projekt-Pakete (`.venv`).
- Fehlt Python, wird es automatisch aus offizieller Quelle eingerichtet (winget oder python.org; offizieller Installer wird vor Ausfuehrung auf Authenticode/PSF-Signatur geprueft). Bei Problemen bricht der Bootstrap mit Log ab; es werden keine dubiosen Mirror-Downloads versucht.
- Bereits installierte Pakete werden online auf neue kompatible Versionen geprueft. Offline wird eine vorhandene Version weiterverwendet, wenn moeglich. PyInstaller ist nur fuer den EXE-Build notwendig. Drag & Drop (`tkinterdnd2`) ist optional.
- Vorhandene `.milk`-Dateien bleiben unveraendert. Import/Export und Erzeugung verhindern Ueberschreiben. Keine Hintergrund-Updates und keine Systemdienst-Installation.
- EXE speichert `library` und `gui_settings.json` neben der EXE. Fuer portable Verwendung den EXE-Ordner beschreibbar halten (nicht `Program Files`). Die im ZIP enthaltenen 15 Presets bleiben im Paket und koennen in die EXE-Bibliothek importiert werden.
- `dist\666SD_Preset_Studio.exe` wird nicht still ueberschrieben; bei bestehender EXE bitte manuell sichern/umbenennen.
- Die EXE ist **nicht** digital code-signiert. SmartScreen/AV koennen reagieren.
- Verifizierte Tests hier: Python-Unit-Tests auf Linux; Batch-Installation, Windows-Build und tatsaechliche MilkDrop-GPU-Anzeige muessen noch auf Windows ausgefuehrt werden.

## Vorhandene Funktionen (v0.1.0 bis v0.3.0, erhalten)

- Deterministische `.milk`-Generierung: 6 Stile, 5 Varianten, Audio-gesteuerte Frame-/Vertex-Gleichungen.
- Bytegenauer `.milk`-/Ordner-/ZIP-Import mit Sicherheitspruefungen, SHA-256, kollisionssicherer Ordnerstruktur.
- ZIP-Export ganzer Sammlungen oder Auswahl.
- Tkinter-GUI mit Bibliothek, Inspektor, Generierung, optionalem Drag & Drop; noch **keine** echte GPU-Live-Vorschau.
- Original-Presets werden nicht angetastet.

## Technische Quellen

- https://milkdrop.org/resources/preset-authoring#a-per-frame-equations
- https://www.python.org/downloads/windows/
- https://pypi.org/project/tkinterdnd2/

## Manuelle Entwicklung / Tests

`py -3 -m unittest discover -s tests -v`

`py -3 src\generator.py --help`


## v0.6.0 — Cyber Studio (additiv)
- Neues Neon-UI (pink/lila/cyan + Akzentideen orange/grün), vier Tabs: Preset Library, Asset File Manager, Preset/Image Editor, Renderer.
- Import mehrerer Files, Ordner, ZIPs in separaten Non-Overwrite-Batches; Assets: Presets (.milk, .milk2, .milk3), Textures, Sprites, Waves, Shapes. Asset-ZIP-Export mit SHA256-Manifest.
- Drag & Drop: vorhandene .milk/.zip/Ordner-Logik im Preset-Tab und Bilddateien in aktuell ausgewählte Asset-Kategorie; Datei-Manager mit Öffnen im Explorer.
- Editor für vorhandene .milk als neue Datei (Save As, kein Overwrite); Bildkonvertierung via optional Pillow als Kopie, max. Seitenlänge einstellbar (Standard 512). PNG-Alpha bleibt erhalten; JPEG verliert Alpha.
- Externer Windows-MilkDrop-Renderer: EXE-Pfad speichern, Start nur nach ausdrücklichem Dialog. Keine Original-EXE oder Bibliothek aus dem Upload automatisch gestartet oder in dieses Paket eingebettet.
- GPU-Auswahl, transparentes Overlay, echtes Live-Rendering, Shader/Texture Runtime-Tuning: **OFFEN** — die hochgeladene MilkDrop3-C++-Quelle liefert keine nachgewiesene Python-Runtime-API. Die sichtbare Quality-Einstellung ist eine gespeicherte Voreinstellung, kein Renderer-Override.
- Eingangsformat .milk2/.milk3 wird als Asset gespeichert, aber nicht als vollständig kompatibles Standard-.milk geprüft oder stillschweigend konvertiert. Der Ausdruck 2077 ist kein durch die gelieferten Dateien nachgewiesener Formatstandard.
- Batch-Installationsroutine erweitert: optionales Pillow in der projektlokalen .venv; PyInstaller nimmt PIL bei erfolgreichem Build mit. Windows-EXE-Build bleibt auf Windows praktisch zu testen.

### Quellen aus dem Nutzer-Upload
- `MilkDrop3-main (2).zip`: C++-Projekt mit Visual-Studio-Solution, DirectX/HLSL-Ressourcen und Windows-Debug-EXE; wird **nicht** als Programm in die ZIP kopiert oder ohne Freigabe ausgeführt.
- `sprites.ini` und `messages.ini`: dokumentieren die externen Sprite-/Nachrichtenformate; ihre vorhandenen Inhalte werden nicht überschrieben.
- `Eingefügter Text(20261106-195705).txt`: ältere Anleitung mit konkreter Per-Frame-/Per-Pixel-Mathematik.
- Andere Ressourcen (Cursor/CRT/CERTIFICATE) bleiben unverändert; keine ungeprüfte Integration von Binärdaten.


## v0.6.0 – Settings / Audio Source Routing / Display Profiles

Neu: zentrales SETTINGS / HELP Menü mit atomarem JSON-Speichern und Eingabevalidierung. Fenstergröße per Zahl oder Auflösungs-Preset, Monitornummer, Geometrie, Display-Modus, FPS-/Mesh-/Shader-/Texture-Qualitätspräferenzen, Overlay-Präferenzen, Sprache und Hilfelevel.

Audio-Source-Routing kann gespeichert werden: off, Eingabegerät, System-Loopback, Prozess-Loopback, einzelner Browser-Tab (Edge/Chrome/Firefox/Safari). Die Oberfläche weist je Quelle den **tatsächlich verfügbaren Status** aus: nur Eingabegeräte-Enumeration über optionales `sounddevice` implementiert; die Capture- und MilkDrop-Bridge bleibt offen. Die Größen-Testfläche ist ausdrücklich kein GPU-Renderer.

Native q1..q32 / t1..t8-Flows gemäß hochgeladenem Originaldiagramm sind im Hilfeabschnitt erklärt. Es werden keine fremden Variablenpools vereinheitlicht.

Die Windows-App muss für echten Renderer-Einsatz vom Nutzer mit einer kompatiblen externen MilkDrop-Installation verknüpft werden. Der hochgeladene MilkDrop3-Lizenztext verbietet kommerzielle/professionelle Nutzung ohne weitere Lizenz. Keine Renderer-Binaries in dieser Distribution.

Noch nicht realisiert: Windows WASAPI Capture (system/process), Browser-Tab-Erweiterung + Bridge, GPU-Umschaltung, Rendering-Qualitätssteuerung im Renderer, echtes transparentes GPU-Overlay, End-to-End Windows GPU-Test.


## v0.6.1: Optionaler Microsoft DirectX SDK Manager

Das vom Nutzer bereitgestellte Original-Microsoft-Paket `DXSDK_Jun10.exe` (June 2010 SDK, ~571.7 MB) ist als Download-Option eingebunden, **nicht** als gepacktes Installationsmedium und **nicht** als automatisch bei jedem Start ausgeführtes Setup.

- `CHECK_DIRECTX_SDK.bat`: read-only SDK-Nachweis via Header/Library und ggf. Signatur eines vorhandenen Downloads.
- `DOWNLOAD_DIRECTX_SDK.bat`: Download ausschließlich von `download.microsoft.com`, atomare `.partial`-Datei, Größenprüfung, Microsoft-Authenticode-Signatur, SHA-256 im Log, vorhandenes signiertes Paket wiederverwenden.
- `INSTALL_DIRECTX_SDK.bat`: bei fehlendem SDK zunächst sicherer Download, danach signaturgeprüftes **interaktives** Microsoft-Setup. UAC/Installationsentscheidung liegt beim Benutzer. Keine stillen Deinstallationen anderer Systemkomponenten.
- Protokolle: `logs/directx_ACTION_TIMESTAMP.log`, `logs/LATEST_DIRECTX.log`.
- GUI: Settings → Render Quality → DirectX SDK Manager startet den read-only Check. Download und Installation erfolgen über die gesonderten Batch-Dateien.
- EXE-Build enthält **keine** Microsoft-SDK-Binaries; die drei Batch-Dateien und das PowerShell-Skript müssen für deren Funktion neben der EXE im Projektpaket verfügbar bleiben.

**ACHTUNG** Microsoft deklariert dieses SDK als Legacy/EOL. Auf modernen Windows-Versionen kann der Installer wegen .NET 3.5 / Visual C++ 2010 SP1 (S1023) scheitern. `DirectX SDK` ist für das bloße Abspielen von MilkDrop-Presets nicht gleichbedeutend mit DirectX End-User Runtime (June 2010). Das Setup wird nicht als technische Voraussetzung für den normalen Preset-Studio-Start erzwungen.

Offizielle Quelle: https://www.microsoft.com/en-ca/download/details.aspx?id=6812
Direkte offizielle Datei: https://download.microsoft.com/download/a/e/7/ae743f1f-632b-4809-87a9-aa1bb3458e31/DXSDK_Jun10.exe

**Abnahme:** Statische Prüfung und Python-Tests lokal; ein Windows-Download/Setup und GPU-Test sind noch offen.


## v0.6.2: .NET Framework 3.5 Vorpruefung (Windows NetFx3)

Microsoft verlangt fuer das **alte DirectX SDK June 2010** unter Windows 8+ ggf. NetFx3 (.NET 2.0/3.0/3.5). **Das Python Preset Studio selbst braucht NetFx3 nicht.**

- `CHECK_NETFX3.bat`: read-only Status via `Get-WindowsOptionalFeature -Online -FeatureName NetFx3`.
- `ENABLE_NETFX3.bat`: **nur bei ausdruecklichem Aufruf als Administrator** wird ueber Windows DISM `/Online /Enable-Feature /FeatureName:NetFx3 /All /NoRestart` die Windows-Komponente aktiviert. Download aus Windows Update, falls Systemdateien fehlen; keine fremden Installer.
- `INSTALL_DIRECTX_SDK.bat` prueft vor dem SDK-Setup NetFx3 und blockiert fehlende Voraussetzung mit klarer Anleitung. Kein automatisches Aktivieren. SDK-Download darf dennoch separat durch `DOWNLOAD_DIRECTX_SDK.bat` ausgefuehrt werden.
- Logs: `logs/netfx3_ACTION_*.log`, `logs/LATEST_NETFX3.log`. READBACK nur bei nachgewiesenem `Enabled`.
- Wenn die Windows-Features-API einen unbekannten/ungueltigen Zustand meldet, wird abgebrochen. Bei DISM-Fehlern `C:\Windows\Logs\DISM\dism.log` bzw. `C:\Windows\Logs\CBS\CBS.log` pruefen.
- Nicht in die portable EXE integriert: NetFx3 ist eine optionale Windows-Systemkomponente und wird nicht mit Python mitgeliefert.
- Windows-Funktion vor Ort, Windows DirectX-SDK-Installation und GPU-Rendering: noch nicht praktisch getestet.

Microsoft: https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/deploy-net-framework-35-by-using-deployment-image-servicing-and-management--dism


## v0.6.3 — Neon Composite Color Cycle

Im Preset-Editor: **C · NEON COLOR CYCLE**. Alternativ C drücken, während der Editor-Reiter aktiv ist und kein Eingabefeld den Tastaturfokus hat. Fünf Paletten: Neon Pink, Lila, Cyan, Orange, Grün. Das Plugin fügt einem shaderfreien Preset einen einfachen musikreaktiven Composite-Shader hinzu. Eine weitere Aktion ersetzt nur eigene, markierte Shader-Blöcke. Fremde Shader werden grundsätzlich nicht überschrieben. **Save As** schreibt nur neue Dateien.

**Kein Hot-Reload**: Die Anwendung bearbeitet den Preset-Text, kann aber noch keine Live-GPU-Neukompilierung in MilkDrop auslösen. Die gespeicherte Datei muss vom externen Renderer geladen werden. Der 0x01-Ausdruck aus dem Nutzerbeispiel ist keine verifizierte Standard-API für Runtime-Recompile.


## v0.6.4 — Spout2 / Syphon source onboarding (R08)

New read-only `src/spout_bridge.py` and `CHECK_SPOUT_BRIDGE.bat`: inspect the two user-supplied source ZIPs, verify archive structure, SHA-256, source API headers, bundled license, and optionally inspect a Windows DLL PE header without executing/loading it. Reports under `logs/LATEST_SPOUT.json` / `.log`. Three new diagnostics in GPU tab.

**Not implemented:** live Spout sender, MilkDrop frame interception, DirectX shared textures at runtime, external GPU overlay, Windows GPU selection or macOS Syphon runtime. Source identification is not a working GPU bridge. The user archives are not repackaged or redistributed.

Spout2 source BSD-2-Clause license, C++ DirectX9/11/12 and OpenGL; Java Syphon requires macOS JNI/Xcode despite shipping cross-platform LWJGL dependencies. Third-party binaries require separate build and licensing review before redistribution.
