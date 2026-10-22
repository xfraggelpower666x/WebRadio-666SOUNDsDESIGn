# 666 LIGHT ORCHESTRA — External source audit (2026-10-01)

**Status: PARTIAL / READ-ONLY SOURCE AUDIT.** User-supplied source archives inspected. This file documents research, not confirmed device capabilities; no device writes or production merge.

## Safety-critical findings

- `homebridge-lanternic` (MIT) implements Magic Lantern service FFF0 / write FFF3 and 9-byte RGB/brightness frames; its tested `MELK-OC21WCT31` variant is **not proven to be the user's four OC21W**.
- Protocol conflict: Lanternic Power ON `7E 04 04 F0 00 01 FF 00 EF`; current experimental adapter `7E 04 04 01 00 01 FF 00 EF`. **Do not activate OC21W writes or auto-sync pending an HCI capture/single-device test.**
- `govee-game-sync` (MIT) uses Govee LAN UDP 4001/4002/4003 and optional `razer`/DreamView `BB 00 FA B0...` packets. Potential H6047 per-segment streaming; **opt-in experimental only**, require readback and reversion.
- `SUPPORTED_DEVICES.md` lists H6047: RGB, brightness, scenes, **10 segments**. This is community model metadata rather than on-device verification.
- `NETWORK_MASKS.md` details precise NIC/subnet binding for multiple Windows interfaces; do not infer PC NIC address from device `192.168.2.32`.
- Govee Developer API v2 PDF lists H6047; cloud API limit is 10 DeviceControl calls per minute per device and 10,000 total/day. **Do not use cloud API for real-time beat frames.**
- `SymphonyLights-main.zip` is Arduino/Tuya unrelated to proof of the LENZE Symphony Light Pro byte protocol; do not merge firmware families.
- `govee-local-api` (Apache-2.0) has device capability and NIC-selection design; per-segment functionality described as experimental.
- `govee-sync` is a Qt/C++ H6047-specific reference; `cs2-govee-lights`, `Flash_Govee_Led`, `govee-scene`, `goveelife`, and `GoveeAPI` are secondary/event/screen/cloud/legacy references only.

## Integration gates

1. Keep existing WebRadio localhost:3000 endpoint contract and protected Govee code.
2. Add no automatically enabled BLE writes. Explicit per-device identity and HCI capture first.
3. Verify basic Govee H6047 LAN response before an RGB test.
4. Verify H6047 segment order, count and DreamView timeouts with a separate opt-in calibration sequence.
5. Later implement separate manufacturer-specific BLE driver adapters with queue, retry, cooldown, and fail-safe.
6. Preserve upstream license notices if copying code; MIT and Apache-2.0 have different obligations.

**Native status:** `LENZE_WRITE_BLOCKED`; `OC21W_PROTOCOL_CONFLICT`; `H6047_SEGMENTS_UNVERIFIED`; `GOVEE_TV_DISABLED`.

