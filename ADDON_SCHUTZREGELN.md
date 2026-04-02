# ADD-ON-SCHUTZREGELN

## Grundsatz
Dieses Projekt wird nach dem Add-on-Prinzip erweitert.
Das bedeutet: ergänzen, einbetten, adaptieren, verdrahten — nicht unnötig löschen.

---

## Erlaubte Erweiterungsformen
- neue JS-Module
- neue CSS-Dateien
- neue Worker-Endpunkte
- neue UI-Sektionen
- neue Router-/Bridge-/Adapter-Schichten
- neue Konfigurationsobjekte
- neue Datenmanifeste
- zusätzliche Dokumentation

---

## Kritische Verbotszonen
Folgendes darf nicht ohne harte Begründung zerstört oder ersetzt werden:
- Sticky Player Kernlogik
- feste Verankerung von Sticky Player / Bottom Meter
- Audio-Routing-Grundlogik
- Radio-Metadatenfluss über Worker
- SoundLab-Hauptstruktur
- Framework-/Prompt-Quellen
- Lyrics-/Content-Datenbasis

---

## Vorgehen bei Konflikten
Wenn eine bestehende Funktion fehlerhaft ist:
1. zuerst analysieren
2. dann Adapter oder Korrekturschicht prüfen
3. nur wenn nötig gezielte Bereinigung
4. Änderungen dokumentieren

---

## Pflicht bei Änderungen
Jeder neue Projektbuild soll dokumentieren:
- was neu hinzugefügt wurde
- welche Dateien geändert wurden
- ob Worker betroffen ist
- ob etwas nur verschoben / umverdrahtet wurde
- ob wirklich etwas entfernt wurde

---

## Ziel
Das Projekt soll über mehrere Chats, Versionen und Erweiterungen hinweg stabil weiterwachsen, ohne dass Wochenarbeit durch unkontrollierte Eingriffe verloren geht.
