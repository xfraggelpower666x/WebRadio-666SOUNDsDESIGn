# Re-Audit · Light Wave Tech 0.1.2-R1

**Status PARTIAL.** Reparaturkopie auf Basis des gelieferten ZIP. Die lokalen Softwareprüfungen sind abgeschlossen. Die Abnahme auf Windows-Hardware und die Rechteprüfung für Weiterverteilung stehen aus.

- Basis: `light_wave_tech-0.1.2.zip` · SHA-256 `3cabd86b7ddd2bcefd1a8aa3990613ce3acc5b8bf95294bd8563ca20374f17fd`.
- Der ZIP-Kommentar der Quelle lautet `d3d35b5d578b72bce082314c919eec46817d70c7`. Er wurde als Archivmetadatum übernommen. Ein Remote-Abgleich war nicht Teil des Reparaturauftrags.
- Start und Umschalten der Betriebsarten siehe `START_REPAIR.md`. Die ursprüngliche ZIP-Datei ist die Rückfallbasis. `REPAIR_FILES.txt` nennt die geänderten und hinzugefügten Dateien.

## Befunde und Gegenproben

| ID | Reparatur | Re-Audit |
| --- | --- | --- |
| LWT-01 | Projektrelative Defaults, Preflight für Medien und ein separat wählbarer synthetischer Demo-Datensatz. Abweichende Medienpfade können konfiguriert werden. | **VERIFIZIERT**. Demo-Preflight aus fremdem Verzeichnis erfolgreich. Der Originalcache meldet die fehlenden Originalmedien mit Exitcode 2. |
| LWT-02 | Einheitliches `CONFIG/`, getrennte Zieldateien für normal/minimal/nsfw, atomare Cache-Aktualisierung und Arbeitsverzeichnis-unabhängige Generatoren. | **VERIFIZIERT**. Alle drei Generatoren schrieben aus einem anderen Arbeitsverzeichnis in isolierte Ausgabedateien. |
| LWT-03 | Fehlende Quantendaten führen zur Kandidatenauswahl. Der strikte Modus verlangt die Zusatzdaten. Leere Neural-Pools werden berücksichtigt. | **VERIFIZIERT** im Demo-Pfad ohne Quantendaten. Die originären Quantendaten standen für eine Gegenprobe nicht zur Verfügung. |
| LWT-04 | Session je Playlist-Titel. Zusätzlich wurde der im Render-Test entdeckte Ausgriff bei der Timeline-Anpassung kleiner Videopools behoben. | **VERIFIZIERT**. Vier Titel durchlaufen den Playlist-Kontrollfluss. Der Effektplayer renderte die kurze Demo durch ihr Ende. |
| LWT-05 | Geprüfte Geräteauswahl mit Default-Fallback, Monoausgabe und Achtkanalpfad erst bei gemeldeten acht Kanälen. | **VERIFIZIERT** im isolierten Stereo-Fallback. Reales WASAPI und 7.1-Layout **OFFEN**. |
| LWT-06 | Abbrechbare Video-Queues, Stop-Signal und zentrale Freigabe auch bei Ausnahmen oder frühem Ende. | **VERIFIZIERT** für einen blockierten Queue-Producer und für reguläres Ende im Offscreen-Render-Test. Hart blockierende externe Decoder bleiben ein Hardware-/Treiberfall. |
| LWT-07 | Einheitliche Sortierschlüssel für numerische und textuelle Dateinamen. Indizes bleiben an der sortierten Liste. | **VERIFIZIERT** für `2.mp4`, `10.mp4` und `clip.mp4`. |
| LWT-08 | Endpegel nach Normalisierung und Kanal-Mix, vierfaches Oversampling als True-Peak-Näherung und Prüfung auf ungültige Samples. | **VERIFIZIERT** für laute synthetische Achtkanaldaten und Stille in der Endpegelstufe. Ein externer True-Peak-Referenzmesser ist **OFFEN**. |
| LWT-09 | Zeitbasis am gestarteten Ausgabestream, Geräteverzögerung und Kalibrierparameter. Nachlauf benutzt eine monotone Uhr. | **PARTIAL**. Kontrollfluss bis Trackende im Offscreen-Test geprüft. Gemessener A/V-Versatz und Drift mit realem Audio sind **OFFEN**. |
| LWT-10 | XInput optional. Fenster und Auflösung konfigurierbar. Separater VR-Start mit zwei Bildordnern und geordnetem Shutdown. | **PARTIAL**. Desktop-Rendering und OpenVR-CLI geprüft. XInput-Hardware, SteamVR-Compositor und Headset-Abnahme sind **OFFEN**. |
| LWT-11 | Ruhige Standarddemo des Windows-Starters. Der optionale Modus `--reduced-flash` zeigt eine statische Audioansicht und überspringt den Effektplayer ganz. | **VERIFIZIERT** als separater Codepfad. Die Helligkeits- und Blitzfrequenz des ausdrücklich gewählten Effektmodus sind **OFFEN**. |
| LWT-12 | Beide Server binden an Loopback. Nur die vorgesehenen Seiten und katalogisierte Medien werden bedient. Refresh ist ein geprüfter Same-Origin-POST. | **VERIFIZIERT** für die gültigen GET- und Refresh-POST-Abläufe über Loopback. |
| LWT-13 | Bounded Limit und Medien-/Indexwechsel unter gemeinsamem Lock. Leere Kataloge liefern eine leere Liste. | **VERIFIZIERT** für einen Refresh nach Wegfall des einzigen Clips und leere HTTP-Antwortlisten. |
| LWT-14 | Restriktive Tensor-Loads und datenbeschränkter Reader für historische Indexpickles. Neue Trainer-Statistikwerte sind primitive Zahlen. | **VERIFIZIERT** für historischen Indexpickle, ungültiges Datenformat und V6-Checkpoint-Wiederladen mit PyTorch. Andere historische Checkpoint-Formate bleiben **OFFEN**. |
| LWT-15 | Timeline-Importwerte gelangen als DOM-Property in Eingabefelder. HTML-Log-Anzeige escapt Dateinamen. | **VERIFIZIERT**. Import, Bearbeitung und Export in drei Editoren im DOM-Test mit Anführungszeichen, Ampersand und Umlaut. Ein visueller Browserlauf war wegen der lokalen Chromium-Startgrenze nicht verfügbar. |
| LWT-16 | Auflösung der ComfyUI-Pfade gegen optional ausdrücklich freigegebene Medienwurzel. Ohne eine Konfiguration ist der Zugriff gesperrt. | **VERIFIZIERT** statisch. Hostintegration in ComfyUI bleibt **OFFEN**. |
| LWT-17 | Bilddublettensuche mit Vorschau, exklusivem Quarantäneziel und Erhalt des Referenzbilds. Historische PHP-Prototypen sind per Standard inaktiv. | **PARTIAL**. Drei Bilder inklusive Quarantäne in lokaler Gegenprobe erfolgreich. Die historische PHP/MySQL-Laufzeit und Datenbank-Portierung bleiben **OFFEN**. |
| LWT-18 | Disjunkte Trainings- und Validierungsrohdaten vor dem Fensterbau. Kontinuierliche Trainer übernehmen die Normalisierung vom Training. V6-Fortsetzung prüft die Dataset-Kennung und meldet eine Persistenz-Baseline. | **VERIFIZIERT** für die disjunkte Aufteilung und einen V6-CPU-Lauf mit Training, Validierung, Checkpoint und Inferenz. Das synthetische Ergebnis erlaubt keine Aussage zur Modellgüte auf Originaldaten. |
| LWT-19 | Hauptpfad nutzt vorhandene Indizes oder protokollierten Fallback und trennt ihn vom historischen Quanten-/Modell-R&D. | **PARTIAL**. Pfade und Datenursprung der Demo sind nachvollziehbar. Originalmodell und Original-Quantendaten lagen nicht für eine unabhängige Provenienzprüfung vor. |
| LWT-20 | Lokale Ein- und Ausgabepfade für Prompt-, Wortlisten- und Mixwerkzeuge. Ein importiertes Werkzeug startet keinen Beispieljob. | **VERIFIZIERT** für lokale Prompt-Ausgaben, Wörterpipeline und MP3-Mix aus bereitgestellten Testmedien. |
| LWT-21 | Zwei Referenzfragmente als solche markiert, Pegelwerkzeug mit CLI, Escape-Sequenzen korrigiert. | **VERIFIZIERT**. Alle 139 Python-Dateien sind in Python 3.12 syntaktisch kompilierbar. |
| LWT-22 | Ein Windows-Starter, Windows-x64-Lockfile mit Hashes, Headless-Preflight und lokales Regressionspaket. | **PARTIAL**. 44 Windows-x64-Wheels wurden mit Hashprüfung aufgelöst und geladen. Der Windows-Starter wurde nicht unter `cmd.exe` ausgeführt. |
| LWT-23 | Originale Lizenz- und Herkunftshinweise sind enthalten. Hinweise zur rechtenbezogenen Abgrenzung stehen in `START_REPAIR.md`. | **OFFEN** für umfassende Rechteklärung. Paketcode, Shader, Fonts, Texturen, Medien und Narrative erfordern eine komponentengenaue Zuordnung vor einer Weiterverteilung. |

## Nachweisumfang

- `python -B -m unittest discover -s tests -v` · 11 Prüfungen bestanden.
- 139 Python- und 45 JSON-Dateien geprüft. Die Inline-Skripte aller 6 HTML-Dateien bestanden `node --check`.
- Effekt-Demo · realer Pygame-/OpenGL-/ModernGL-/OpenCV-Pfad, Mesa llvmpipe, Offscreen. Der Lauf endete mit Exitcode 0 und Shader-Cache-Freigabe. PortAudio war hier nicht vorhanden. Für diese Gegenprobe ersetzte ein zeitbasierter Testadapter die Audio-Geräteschnittstelle. Damit sind weder hörbare Wiedergabe noch Windows-Audiolatenz bestätigt.
- V6 · PyTorch CPU, eine Epoche auf synthetischen Ganzzahlen. Die Validierung meldete MSE 0,8812 und Persistenz-Baseline 1,0113. Der neu geschriebene Checkpoint erzeugte anschließend acht Werte im Inferenzlauf.
- Native Windows-Wiedergabe, WASAPI-Kanalzuordnung, Controller, SteamVR, GLSL-Abdeckung über alle Varianten, ComfyUI-Host und Langzeitbetrieb bleiben ausstehend. Die Demo-Medien und der Testadapter ersetzen keinen Original-Medienbestand.
