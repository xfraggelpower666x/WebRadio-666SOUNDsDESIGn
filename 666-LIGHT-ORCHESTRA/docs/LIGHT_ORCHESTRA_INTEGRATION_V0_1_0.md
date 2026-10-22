# 666 LIGHT ORCHESTRA INTEGRATION v0.2.0

## Add-only Architektur

Bestehende Audio-, Analyzer-, Worker-, Player- und Govee-Dateien bleiben erhalten. Die neue lokale Python-Bridge übernimmt den bereits vorhandenen Contract auf Port 3000.

```text
WebRadio
  -> Shared Analyzer / MeterBus
  -> bestehendes Govee Scene Sync Add-on
  -> http://localhost:3000
  -> 666 LIGHT ORCHESTRA
       -> Govee H6047 LAN
       -> LENZE-RGB BLE x2
       -> Magic Lantern OC21W BLE x4
```

## Radio-Kompatibilität

Der WebRadio-Frontendcode muss für neue Gerätefamilien nicht doppelt gepflegt werden. Audio-/FX-Daten laufen weiterhin durch die bestehenden Endpunkte; die Python-App verteilt sie lokal auf die Geräteadapter.

## Govee

Der vorhandene H6047-LAN-Weg bleibt bestehen.

## LENZE

SymphonyLightPro 1.0.6 bestätigt FFF0/FFF3/FFF4 und LENZE-RGB. Command-Frames bleiben WRITE_BLOCKED, bis sie aus der App oder einem BLE-Capture direkt verifiziert wurden.

## Magic Lantern / OC21W

Magic Lantern 6.11.10 (`wl.smartled.rgb`) enthält FFF0/FFF3 sowie Funktionen für Farbe, Helligkeit, Modi, Speed, Mic, Scenes, RGB-Pin-Order und Timing. Öffentliche Reverse-Engineering-Dokumentation derselben App-Familie bestätigt das 9-Byte-Frameformat und die grundlegenden Power/RGB/Brightness/Mode-Befehle.

Der Adapter implementiert diese Frames, bleibt aber standardmäßig durch `write_enabled=false` gesperrt. Damit gibt es keinen unkontrollierten Hardware-Write beim Start.

## Windows App

`666_light_orchestra_gui.py` startet dieselbe Bridge mit GUI. `build_windows.bat` erzeugt CLI- und GUI-EXE über PyInstaller.

## Nächste Hardware-Verifikation

1. Magic Lantern App auf dem Telefon vollständig schließen.
2. BLE-Scan aus der Python-App durchführen und die vier OC21W eindeutig zuordnen.
3. `magic_lantern.write_enabled=true` nur für den Teststand setzen.
4. Power -> feste Testfarbe -> Helligkeit -> Mode einzeln prüfen.
5. Danach Radio-Audio-Sync aktivieren.
6. LENZE bleibt unabhängig davon WRITE_BLOCKED, bis dessen Frames verifiziert sind.
