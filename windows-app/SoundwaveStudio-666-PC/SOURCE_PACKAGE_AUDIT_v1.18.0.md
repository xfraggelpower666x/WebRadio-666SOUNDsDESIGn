# Soundwave v1.18.0 — package verification

Verification date: 2026-10-01

| Field | Verified value |
|---|---|
| Candidate | SoundwaveStudio_666_PC_v1.18.0_FORCE_ALL_RADIO_SOUNDCLOUD_MASTER_INTEGRATION_SOURCE_CANDIDATE.zip |
| SHA-256 | 69264f9bc65e079987de29d56ff02ccffc96ce91d0b35363943c9b0416f7957c |
| ZIP entries | 181 |
| ZIP CRC | PASS (zipfile.testzip returned None) |
| Archive internal root | SoundwaveStudio_666_PC_v1.17.0/ |
| Internal root version mismatch | OPEN — do not silently rename or rewrite archive |
| GitHub full ZIP publication | PENDING |
| Windows runtime build/readback | PENDING |
| PFS child | SOUNDWAVE-34001 |
| FREEZE | NO |

## Preservation locks
Original Soundwave Studio owns Windows UI, offline player, visualizer and controls. Radio and SoundCloud are additive sources. Do not mutate production WebRadio, Cloudflare runtime or STREAM-5001. Do not commit secrets or unnecessary binary build artifacts. This manifest documents the verified local archive; it does **not** imply that the ZIP bytes are present in GitHub.
