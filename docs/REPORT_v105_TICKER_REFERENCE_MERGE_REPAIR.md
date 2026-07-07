# 666SOUNDsDESIGn — v105 Ticker Reference Merge Repair

## Basis
- Hauptbasis: v103 AUDIO SELFHEAL MINIMAL FULL.
- Referenz: vom Nutzer gelieferte funktionierende GitHub-ZIP nur zum Ticker-Vergleich.

## Geändert
1. Funktionierender PC-Ticker-Pfad aus der Referenz wiederhergestellt (`#pcTickerRebuildLane` / `#pcTickerRebuildText`).
2. Alter/leerer History-/Pink-Kasten `#historyTickerLane` bleibt deaktiviert/entfernt.
3. Fehlerhafter v103-Canonical-Ticker-Override wurde entfernt, weil er den funktionierenden Referenz-Ticker blockiert hat.
4. Ältere v79-Cleanup-Logik wurde korrigiert, damit sie nur den alten History-Ticker entfernt und nicht mehr den funktionierenden PC-Rebuild-Ticker wegschießt.
5. Versionen wurden auf v105 synchronisiert.

## Nicht geändert
- Kein Worker-/Stream-Routing.
- Kein Discord-Routing.
- Kein EQ-/Visualizer-Umbau.
- Kein Layout-Neubau.
- Kein Backend.

## Anti-Drift-Hinweis
Die Referenz-ZIP wurde nicht als Gesamtbasis übernommen. Sie diente ausschließlich zur Ticker-Reparatur, damit neuere v103-Dateien wie Discord/Selfheal erhalten bleiben.
