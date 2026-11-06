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


## Windows ZIP one-click bootstrap

For the packaged Windows/source ZIP, the recommended entry point is:

```bat
ONE_CLICK_SETUP_BUILD_RUN.bat
```

The bootstrap checks for a compatible Python installation, uses `winget` to install Python 3.12 when Python is missing, initializes/updates `pip`, creates an isolated `.venv`, upgrades `pip/setuptools/wheel`, installs or upgrades every package from `requirements.txt`, verifies `tkinter`, `bleak` and `PyInstaller`, creates `config.json` on first use, builds all Windows executables, and starts the Symphony GUI.

Additional entry points:
- `START_SYMPHONY.bat` / `start.bat`: bootstrap + run the Python GUI.
- `BUILD_EXE.bat` / `build_windows.bat`: bootstrap + build all executable variants.
- `bootstrap_windows.bat`: prerequisites only.

The bootstrap is additive and does not modify the existing hardware write gates.


## v0.7.0-dev — Hardware Recovery, Diagnostics & Guided Discovery

Additive repair layer; existing LAB, protocol evidence and safety gates remain intact.

- Windows Bluetooth preflight queries the local Bluetooth PnP stack read-only before scanning.
- GUI distinguishes READY, PRESENT_NOT_READY, NO_PHYSICAL_ADAPTER and MISSING instead of reporting a misleading empty scan.
- Broad BLE discovery remains read-only and lists unknown/nonnamed advertisements instead of discarding them.
- `RUN_DIAGNOSTICS.bat` and `666_LIGHT_ORCHESTRA_DIAGNOSTICS.exe` produce a local JSON diagnostic report with Bluetooth state, visible BLE devices, Govee discovery/probe result and registry state.
- Diagnostics report declares `hardware_writes_performed=0`.
- Govee discovery checks configured IP first, then multicast, and still requires a valid read-only devStatus proof before writes.
- OC21W power keeps multiple conflicting public FFF0 frames as candidate-only evidence; no candidate is promoted without real hardware validation.
- Optional branding hook loads `assets/LOS_APP_ICON.ico` or `assets/LOS_APP_ICON.png` when a verified original asset is present.
- The original BLE/Evidence LAB remains preserved and hardware write gates remain fail-closed.

Recommended troubleshooting order:

1. `RUN_DIAGNOSTICS.bat`
2. Bluetooth preflight in Devices
3. SEARCH BLE DEVICES
4. bind a discovered device to the correct family slot
5. use the READ-ONLY LAB for GATT/evidence capture
6. only after real protocol evidence consider a separately governed write-validation step


### Bluetooth Recovery helper

`RUN_BLUETOOTH_RECOVERY.bat` is an explicit owner-triggered repair helper for the Windows case where the Bluetooth adapter disappears from Settings or Device Manager. It only:
- starts/restarts `bthserv`;
- requests `pnputil /scan-devices`;
- prints the resulting Bluetooth PnP candidates.

It does **not** uninstall drivers, remove paired devices, change write gates or force a reboot.

The read-only diagnostics report also separates:
- Govee IP/ICMP network reachability; and
- Govee LAN `devStatus` protocol response.

This distinction helps identify a reachable H6047 whose LAN Control/UDP path is unavailable.


## v0.7.2-dev — Connection Verification & Readiness

- `CONNECT / VERIFY` now performs an actual read-only BLE GATT connection check.
- Expected FFF0 service plus FFF3/FFF4 characteristics are verified without any characteristic write.
- Govee H6047 IP and auto-discovery can be edited in the Settings UI and are atomically persisted to `config.json`.
- Saving Govee connection settings never grants write permission; a fresh read-only devStatus probe remains required.
- New Readiness page visualizes the evidence pipeline per device: Bluetooth → Binding → GATT → Protocol → Control Gate.
- Readiness state is guidance only and never promotes hardware verification or protocol write authority.


### System Check orchestrator

`RUN_SYSTEM_CHECK.bat` combines package integrity and read-only hardware diagnostics into one operator flow. It records Bluetooth adapter/driver state, visible BLE count, Govee network/LAN-Control status and evidence-based next actions in `diagnostics/LIGHT_ORCHESTRA_SYSTEM_CHECK.json`. It performs zero hardware writes and never changes protocol authority.
