# Evidence review: Govee Home 7.6.21, Magic Lantern 6.11.10, SymphonyLightPro 1.0.6

Date: 2026-10-01. Scope: static inspection of user-provided XAPK files and `Govee.pdf` LAN API guide. No hardware interaction.

## Static APK evidence

| App | Main APK | DEX files | Observed tokens |
| --- | --- | ---: | --- |
| Govee Home 7.6.21 | `com.govee.home.apk` | 14 | `LanControl`, `colorwc`, `razer`, `H6047` |
| Magic Lantern 6.11.10 | `wl.smartled.rgb.apk` | 1 | `0000fff0`, `0000fff3`, `BLUETOOTHLE`, `RGB_PIN` |
| SymphonyLightPro 1.0.6 | `com.lenzetech.symphonylightpro.apk` | 1 | `0000fff0`, `0000fff3`, `0000fff4`, `BLUETOOTHLE` |

Token presence is a static clue, not proof that a command works on the user's physical devices. Never assume FFF0/FFF3 compatibility implies identical 9-byte command frames. Existing Magic Lantern command conflict remains unresolved.

## Official Govee LAN API instructions (`Govee.pdf`, LAN section)

- Device must be added in Govee Home with LAN Control enabled. User screenshot already shows LAN toggle enabled on H6047.
- Discovery multicast `239.255.255.250:4001` via `{"msg":{"cmd":"scan","data":{"account_topic":"reserve"}}}`.
- UDP discovery replies arrive on port `4002`; example payload `msg.cmd=scan` with `msg.data.ip`, `device` and `sku`.
- UDP device command endpoint `DEVICE_IP:4003`.
- Read-only status query `{"msg":{"cmd":"devStatus","data":{}}}`; expected response has `msg.cmd=devStatus`, `data.onOff` 0/1, `data.brightness` 1..100 and a color object.
- Color command `colorwc`, with `colorTemInKelvin=0` selecting direct RGB values; brightness `brightness` is 1..100; power `turn` 0/1.
- **A UDP send is not an acknowledgement**. Mark device online only after a valid response from the configured IP.

## Device identity

- H6047 local target `192.168.2.32` was shown in the user's Telekom Speedport Smart 4.
- `Govee-TV` at `192.168.2.33` remains an unverified separate model, disabled by default.
- iOS BLE Peripheral UUIDs are not substituted for Windows BLE addresses.
- H6047 segment count ten remains third-party reference metadata, not actual calibrated live segment addressing.

## Work in this revision

H6047 local status probe tightened: it now requires a matching sender IP, `devStatus` command and a plausible state payload before claiming success. No new BLE writes. No production merge.

## Gates

NEXT: run offline regression tests; test real Govee LAN readback on local PC; map BLE devices by Windows discovery/HCI capture; test power and RGB on only one explicitly selected OC21W; verify LENZE frames independently. Keep upstream code license records before reuse.
