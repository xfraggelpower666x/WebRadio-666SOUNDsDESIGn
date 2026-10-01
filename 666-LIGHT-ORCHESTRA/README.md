# 666SOUNDsDESIGn LIGHT ORCHESTRA v0.2.0

Lokale Python-Lichtbridge und Windows-GUI für das bestehende WebRadio.

## Architektur

```text
WebRadio MeterBus / FX / Scene Engine
        -> http://127.0.0.1:3000
        -> 666 LIGHT ORCHESTRA
             -> Govee H6047 (LAN)
             -> LENZE-RGB x2 (BLE; Writes gesperrt)
             -> Magic Lantern OC21W x4 (BLE FFF0/FFF3)
```

Die vorhandene Radio-API bleibt kompatibel:

- `POST /api/enabled`
- `POST /api/mode`
- `POST /api/audio`
- `POST /api/test/on`
- `POST /api/test/off`
- `POST /api/test/color`
- `GET /api/status`
- `GET /api/devices`
- `POST /api/lenze/scan`
- `POST /api/magic-lantern/scan`
- `POST /api/magic-lantern/mode`

## Govee H6047

Der vorhandene LAN-Control-Weg bleibt erhalten. Das Radio muss keinen neuen Gerätecode kennen.

## LENZE-RGB / SymphonyLightPro

Aus SymphonyLightPro 1.0.6 verifiziert: Service FFF0, Write FFF3, Notify FFF4 und Gerätename LENZE-RGB. Die konkreten LENZE-Command-Frames sind weiterhin WRITE_BLOCKED. Gleiche UUIDs allein reichen nicht als Beweis für identische Byte-Kommandos.

## Magic Lantern / OC21W

Aus Magic Lantern 6.11.10 (`wl.smartled.rgb`) und öffentlicher Reverse-Engineering-Dokumentation derselben App-Familie verifiziert:

- Service FFF0
- Write FFF3
- Notify FFF4
- 9-Byte-Frame `7E LEN CMD P1 P2 P3 P4 P5 EF`
- Power, RGB, Brightness, Mode und Speed

Hardware-Writes bleiben standardmäßig deaktiviert (`magic_lantern.write_enabled=false`). Erst nach eindeutiger Identifikation deiner vier OC21W-Bars aktivieren.

## Windows

```bat
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy config.example.json config.json
py 666_light_orchestra_gui.py
```

EXE-Build:

```bat
build_windows.bat
```

Die GUI zeigt Govee, LENZE und OC21W getrennt und verwendet dieselbe lokale Bridge wie das Radio.


## v0.3.0 — Geräte-Registry und Testgrenzen

Die neue `device_registry.py` führt acht Controller-Einträge: sieben bekannte Lichtziele (H6047, 2 LENZE, 4 OC21W) und zusätzlich Govee-TV als deaktivierten Kandidaten. Die H6047 betreibt zwei physische Bars:
- Govee H6047: zwei Bars hinter einem Controller, Ziel `192.168.2.32`.
- Govee TV: separat erkannt, Modell/Transport noch offen, standardmäßig deaktiviert.
- LENZE-RGB: zwei Controller, iOS-UUIDs nur als Hinweise.
- OC21W: vier Controller, iOS-UUIDs nur als Hinweise.

Die Registry wird atomar unter `~/.666soundsdesign/light-orchestra/devices.local.json` gespeichert.
`GET /api/registry` liefert die Einträge, `POST /api/registry/update` ändert ausschließlich Label, Rolle und Enabled. Keine Hardwareadresse kann darüber überschrieben werden.

`POST /api/govee/probe` fragt über UDP ausschließlich den Status ab, ohne Farben oder Power zu verändern. Ein nicht beantwortetes Paket ist *kein* Erfolgsnachweis.

`POST /api/device/test-color` unterstützt zurzeit ausschließlich den aktivierten Govee-H6047-Controller. LENZE/OC21W werden über diesen Einzelgerätetest strikt gesperrt. Der bestehende generische Radio-Contract bleibt bestehen.

Offline-Regressionsprüfung:
```bash
python -m unittest discover -s tests -v
```

**Wichtig:** Kein Live-Hardwaretest erfolgt allein durch diese Codeintegration. Die Windows-BLE-Adressen müssen vor einer Einzelzuordnung auf dem Windows-PC erfasst werden.
