# CHANGELOG VELUNA v1.2.11

**Release:** `FULLVERSION_VELUNA_EQ_THEN_BOOST_LIMITER_AUDIO_CHAIN_v1.2.11`  
**Build:** `2026-07-09-veluna-v1211`

## Reparatur

- Die bisherige VELUNA-Audiokette `Quelle → Booster → EQ → Ausgang` wurde korrigiert.
- Neue Reihenfolge: `Quelle → 5-Band-EQ → Booster → Limiter → Analyser → Ausgang`.
- Der EQ bleibt eine eigenständige Klangformung mit fünf getrennten Bändern.
- Die Booststufe bleibt eine eigenständige Verstärkung von `0` bis `5`.
- Der Booster verstärkt jetzt ausdrücklich das bereits durch den EQ geformte Signal.
- Ein nachgeschalteter Dynamics-Compressor arbeitet als Limiter gegen hartes digitales Clipping der kombinierten EQ-/Boost-Ausgabe.
- Statusmeldungen zeigen die Reihenfolge `EQ → Boost → Limiter` eindeutig an.

## Erhalten

- feste iPhone-Ganzseiten-Geometrie
- VELUNA-Endpunkt und AMARIS-Kompatibilitätsrouten
- Worker-/Fallback-Switch
- Auto-DJ-Skip und Auth
- Discord-Shooter
- Metadaten, Cover, Media Session und Levelmeter
- PC-/Haupt-/Internal-Player
