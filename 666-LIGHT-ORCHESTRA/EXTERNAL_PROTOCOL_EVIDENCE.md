# External protocol evidence — LIGHT ORCHESTRA

Status: candidate-only research evidence. No source in this file grants hardware write authority.

## Magic Lantern / FFF0 family

Evidence reviewed 2026-11-07:

1. BleLEDScheduler protocol notes
   https://github.com/mikeoverbay/BleLEDScheduler/blob/master/README.md
   - FFF0-family controllers use FFF3 for write commands.
   - 9-byte 7E ... EF frames are documented.
   - One documented power-ON variant is 7E 04 04 F0 00 FF FF 00 EF.
   - FFF4 notification support may vary by controller.

2. Corner-Floor-Lamp-Controller / duoCo StripX
   https://github.com/wxx9248/Corner-Floor-Lamp-Controller/blob/main/library/README.md
   - A real MELK-OC21 device is documented with FFF0 / FFF3.
   - MELK-* is therefore accepted as a Magic-Lantern-family discovery hint only.

3. Home Assistant community Magic Lantern reverse engineering
   https://community.home-assistant.io/t/new-integration-for-ble-magic-lantern/454055
   - FFF0 / FFF3 and 7E ... EF frames are independently reported.
   - Another power-ON variant is reported as 7E 04 04 F0 00 01 FF 00 EF.

4. LED_UNION
   https://github.com/chameleonbr/LED_UNION
   - MELK-* / Magic Lantern is independently categorized as FFF0 / FFF3.

## Contradiction control

The external sources agree on the broad FFF0/FFF3 family but disagree on exact power payload variants and notification behavior.

Therefore:
- external frames remain CANDIDATE_ONLY;
- MELK-* classification is a discovery hint, not protocol verification;
- FFF0/FFF3/FFF4 presence may be checked read-only;
- automatic protocol promotion is forbidden;
- real owner hardware evidence is required before LENZE/OC21W write gates can change.

## LENZE-RGB

No independent external source found in this research round was sufficient to identify the user's LENZE-RGB command frame dialect.

Status: WRITE_BLOCKED / REAL_HARDWARE_EVIDENCE_REQUIRED.
