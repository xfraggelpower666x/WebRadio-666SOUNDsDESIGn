# VELUNA COMPLETE ANALYSIS AUDIT v1.2.11

## Release

- Version: `1.2.11`
- Release: `FULLVERSION_VELUNA_EQ_THEN_BOOST_LIMITER_AUDIO_CHAIN_v1.2.11`
- Build: `2026-07-09-veluna-v1211`
- Basis: VELUNA v1.2.10

## Festgestellter Fehler

Die VELUNA-iPhone-Audiokette war technisch so verdrahtet:

`MediaElementSource → Boost-Gain → 5-Band-EQ → Analyser → Destination`

Dadurch war die mentale und sichtbare Bedienlogik falsch herum: Der Nutzer stellt zuerst den EQ ein und erwartet anschließend, dass der Booster genau dieses geformte Signal verstärkt.

## Reparierte Audiokette

`MediaElementSource → SUB → LOW → MID → HIGH → AIR → Boost-Gain → Post-Boost-Limiter → Analyser → Destination`

### Eigenschaften

- EQ und Booster besitzen weiterhin getrennte Zustände.
- Änderungen am EQ verändern keine Booststufe.
- Änderungen an der Booststufe verändern keine EQ-Bandwerte.
- Boost 0 entspricht Gain `1.00`.
- Boost 1–5 verwendet weiterhin die zentralen Booststufen aus `SMFPBoostCore`.
- Der Limiter liegt erst hinter EQ und Boost und schützt damit die endgültige Kombination.

## Limiter-Konfiguration

- Threshold: `-2.5 dB`
- Knee: `1.5 dB`
- Ratio: `20:1`
- Attack: `0.003 s`
- Release: `0.14 s`

## Scope

Geändert wurden nur die vier synchronen VELUNA-Frontendspiegel:

- `VELUNA/index.html`
- `veluna/index.html`
- `public/VELUNA/index.html`
- `public/veluna/index.html`

Keine Änderung an Hauptplayer, Internal-Player, Worker-Auth, Skip, Discord, Stream-Routing oder Metadatenlogik.

## Verifikation

- `npm run verify`: PASS
- Node-Tests: 44 / 44 PASS
- JavaScript-/MJS-Syntax: 117 PASS
- Root-/Public-Spiegel: 62 PASS
- Nested ZIP-Dateien: 0
- zusätzlicher Audioketten-Vertragstest: PASS

## Live-Restprüfung

Nach Cloudflare-Upload auf echtem iPhone prüfen:

1. EQ-Bänder hörbar einstellen.
2. Boost 0–5 nacheinander aktivieren.
3. EQ-Werte müssen unverändert bleiben.
4. Boost muss das equalizte Ergebnis lauter/druckvoller machen.
5. Bei hohen EQ-/Boost-Werten darf kein hartes digitales Knacken entstehen.
