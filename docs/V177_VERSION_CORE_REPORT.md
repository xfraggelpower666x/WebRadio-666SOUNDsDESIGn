# v177 VERSION CORE REPORT

## Basis
Aus v176 Full-ZIP gebaut.

## Ziel
Versionsanzeige zentralisieren, ohne PC/iPhone-Layout umzubauen und ohne neue sichtbare Layer.

## Änderungen
- Neu: `/core/version/version-core.js`
- `window.SMFP_VERSION` als zentrale Quelle eingeführt
- Cachebuster auf `smfp-v177-version-core-20260519` aktualisiert
- sichtbare Versionstexte auf `v177` normalisiert
- vorhandene Versionselemente werden nur aktualisiert, nicht neu erzeugt
- Audio/Core/Worker/Discord/EQ nicht verändert

## Nicht geändert
- grafischer EQ
- manueller EQ
- Boost-Core
- Worker/Discord/KV/Renda
- PC- und iPhone-Geometrie
