# Light Wave Tech 0.1.2-R1

## Windows-Start

1. ZIP in einen eigenen Ordner entpacken. Für den Installer wird **Python 3.12 x64 mit dem `py`-Launcher** benötigt.
2. `Start_LightWaveTech.bat install` installiert die fest aufgelösten Player-Abhängigkeiten in `.venv`.
3. `Start_LightWaveTech.bat` spielt den 12-Sekunden-Demoton in einer ruhigen Ansicht. Der vollständige Effektplayer ist über den folgenden ausdrücklichen Aufruf erreichbar. Der Effektplayer nutzt schnelle Helligkeitswechsel und Flash-Effekte.

```bat
Start_LightWaveTech.bat --demo --check
Start_LightWaveTech.bat --demo --windowed --resolution 1280x720
Start_LightWaveTech.bat --demo --reduced-flash
```

`Esc` wechselt zum nächsten Titel. `X` beendet die Playlist. Der Demo-Modus verwendet zwei synthetische Testmuster, einen erzeugten Sinuston und drei berechnete Testkurven. Diese Dateien ersetzen keine Originalproduktionen. Der reduzierte Modus bietet eine separate Audioansicht ohne Videoloop, Shader, Flash oder Controller-Rumble.

## Eigene Musik und Clips

- `CONFIG/filepaths.json` zeigt die Standardpfade relativ zum Projektordner. Absolute Pfade sind möglich. Für unterschiedliche Audio-Bibliotheken kann `audio_filepaths.music_folder` pro Edition über `music_folder_core`, `music_folder_summer`, `music_folder_psy_trance`, `music_folder_hardwave` oder `music_folder_custom` ergänzt werden.
- Im Normalfall mindestens einen Clip in `DATA/library/horizontal` und einen in `DATA/library/vertical_1` ablegen oder die Verzeichnisse entsprechend konfigurieren. Der Cache sortiert numerische Namen numerisch und sonstige alphanumerisch. Für Indexdateien gehört die Reihenfolge der analysierten Medien zum Datenstand.
- `Start_LightWaveTech.bat cache normal` erzeugt den normalen Cache. `minimal` und `nsfw` erzeugen die jeweils passenden Cache-Dateien. Der optionale NSFW-Datenmodus nutzt ausschließlich die konfigurierten Quellen. Ein anderer Cache lässt sich beim Start über `--cache` angeben. Cache-Generatoren akzeptieren ein alternatives `--config` und `--output`, z. B. `py -3.12 CONFIG/config_preload_path_names.py --config MeinePfade.json --output MeinCache.json`.
- Pro Track erwartet der Effektplayer eine WAV-Datei mit einer passenden Bass-, Snare- und Hi-Hat-CSV. Die Dateinamen lauten `<Titelstamm>_bass_keyframes.csv`, `<Titelstamm>_snare_keyframes.csv` und `<Titelstamm>_hihat_keyframes.csv`. Kopfzeile: `Time_ms,Bass_Amplitude`. Die Demo enthält ein vollständiges Beispiel. Die originalen Sync-CSV-Dateien bleiben im Paket erhalten.
- Ohne explizites `--audio` greift der Starter auf vorhandene Dateien der gewählten Playlist in der konfigurierten Bibliothek zu. Unterstützte Editionen sind `CORE`, `SUMMER`, `PSY_TRANCE`, `HARDWAVE`, `CUSTOM` und `ALL`. Eigene WAVs werden in der angegebenen Reihenfolge gespielt.
- Fehlende Quantendaten lösen standardmäßig eine dokumentierte Kandidatenauswahl aus. `--strict-quantum` setzt gültige JSON-Paare im ursprünglichen Ordner voraus. Die Live-Visualisierung nutzt vorberechnete Indizes, lokale Parität und Zufallsentscheidungen.
- Der Player bevorzugt WASAPI und verwendet andernfalls das Standardgerät. Das Achtkanal-Routing wird nur bei einer gemeldeten Kapazität von mindestens acht Kanälen gewählt. `--av-offset-ms` kann den Bildversatz für das konkrete Gerät korrigieren. Der standardmäßige Stereo- und Achtkanal-Ausgabepfad begrenzt den Endpegel mit vierfacher True-Peak-Näherung.

```bat
Start_LightWaveTech.bat --audio "D:\Musik\Track A.wav" --audio "D:\Musik\Track B.wav" --sync-folder "D:\Keyframes" --check
Start_LightWaveTech.bat --audio "D:\Musik\Track A.wav" --audio "D:\Musik\Track B.wav" --sync-folder "D:\Keyframes"
```

## Begleitwerkzeuge

- **Medienserver** in `OFFSHOOT_USAGE/` mit `python server.py --media-root <Ordner>` oder `server2.py`. Sie binden an Loopback. Legitime Medien müssen im gewählten Root liegen. Die drei vorhandenen Browser-Layouts bleiben als einzelne HTML-Adressen erreichbar.
- **ComfyUI**. In gemeinsam genutzten Instanzen `LWT_COMFY_MEDIA_ROOT` auf die freigegebene Medienwurzel setzen. Für eine eigene lokale Instanz erlaubt `LWT_COMFY_TRUST_LOCAL=1` den bisherigen offenen Dateizugriff. Der konfigurierte Root hat Vorrang.
- **OpenVR**. `openvr` und ein funktionsfähiges SteamVR gehören zum optionalen VR-Zweig. Mit `Start_LightWaveTech.bat vr "D:\VR\Links" "D:\VR\Rechts"` zwei befüllte Bildordner übergeben.
- **Modelle**. Trainer und Inferenz verwenden den sicheren Tensor-Lademodus. Ältere Checkpoints mit serialisierten Python- oder NumPy-Objekten können abgelehnt werden. Für diese Formate die Gewichte aus einer eigenen vertrauenswürdigen Quelle neu exportieren. Die bereitgestellten historischen Indexpickles können als reine Datencaches gelesen werden. Ein Hash oder eine Datei im Archiv allein ist kein Nachweis der Herkunft eines benutzerdefinierten Modells.
- **PHP-Prototypen**. Historische Skripte bleiben lesbar und im Web-Kontext inaktiv. Die damaligen DB-Abhängigkeiten werden nicht mitgeliefert. Überführung in einen gepflegten Datenbankclient und Tests an isolierter DB stehen aus.
- **Bilddubletten und Suno**. Das pHash-Werkzeug zeigt standardmäßig Kandidaten an. `--apply` quarantänisiert Dubletten und lässt je Gruppe das erste Original im Quellordner. Die Suno-Beispiele erzeugen aus lokalen Wortlisten Prompt- oder Textdateien. Die beiden inaktiven Cloud-Clients wurden in diesem Repair nicht aktiviert. Für Tools mit Audioexport wird FFmpeg benötigt.

## Rechte, Stand und Rückfall

Das Paket enthält die ursprünglichen Dateien einschließlich `LICENSE.txt` und Zuschreibungen. Der Pakettext nennt für den Projektcode **CC BY-NC 4.0** und InfiniteQuantumZen / Sambodhi Padmasamadhi. Er nennt Shaderquellen und gesonderte Angaben für Glitch This und StereoWidener. Die Lizenzzuordnung für jede einzelne Shader-, Font- und Mediendatei bleibt offen. Die Einordnung im Re-Audit bezieht sich auf die Angaben im gelieferten Paket.

Basis und Ersatzpfade stehen in `RE_AUDIT_R1.md`. Als Rückfall dient das unveränderte ursprüngliche ZIP `light_wave_tech-0.1.2.zip`, SHA-256 `3cabd86b7ddd2bcefd1a8aa3990613ce3acc5b8bf95294bd8563ca20374f17fd`. Diese Reparaturkopie verwendet die Kennung **0.1.2-R1**. Sie ist kein offizielles Upstream-Release.
