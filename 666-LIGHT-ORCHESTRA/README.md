# 666SOUNDsDESIGn LIGHT ORCHESTRA v0.5.0-dev

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


## v0.5.0-dev — Deep-audit safety improvements (source-only candidate)

- Govee UDP RGB/power commands require a successful read-only status probe against the configured IP. Proof expires after 5 minutes and must be refreshed; a UDP send is **never** hardware acknowledgement.
- Audio update writes are capped at about five Govee color updates per second to avoid spamming LAN control.
- Magic Lantern writes remain blocked unless `write_enabled`, `protocol_verified`, and a nonempty allowlist of specifically discovered **Windows** BLE addresses are ALL present; this is not permission to enable without hardware evidence.
- HTTP API binds to loopback and validates request Host and browser Origin against `server.allowed_origins`; default whitelist includes official radio origin and local testing origins; request bodies capped at 64 KiB.
- Startup exceptions and audio-adapter failures are reported; no false all-success status when an adapter throws.
- Extra regression tests in `tests/test_safety.py` target fail-closed behavior, local simulation only.
- Security caveat: Windows executable and actual hardware behavior NOT validated. This version is **DEVELOPMENT / SOURCE AUDIT**, not a production release or validated ZIP freeze.

Use `python -m unittest discover -s tests -v` from the native tools directory. The GitHub Release Integrity workflow currently validates Python syntax and general radio tests, NOT necessarily LIGHT ORCHESTRA runtime. Our dedicated workflow must report its own successful test run before marking unit tests PASS.


## v0.6.0-dev — Symphony Control Center

The default Windows/Python launcher now opens `666_light_orchestra_control_center.py`, a dedicated cyber-neon controller UI. The previous `666_light_orchestra_gui.py` is preserved as the advanced BLE/Evidence laboratory.

Control Center capabilities:
- device dashboard for H6047, LENZE-RGB and OC21W registry slots;
- per-device selection with connection/verification actions;
- Single / Pair / All / Custom target routing;
- master power and brightness controls;
- persistent color presets and motion presets;
- scene library with built-in and user-saved scenes;
- audio-reactive WebRadio MeterBus controls and test-beat input;
- registry label/role editing and explicit hardware safety status.

Safety remains fail-closed. Govee writes still require a fresh successful LAN probe. LENZE writes remain blocked until command frames are hardware-verified. OC21W writes remain blocked unless all existing protocol and Windows-address verification gates are satisfied. The GUI never changes those gates.

Windows launch:
```bat
start.bat
```

Manual launch:
```bat
py 666_light_orchestra_control_center.py
```

Advanced BLE/Evidence lab:
```bat
py 666_light_orchestra_gui.py
```
