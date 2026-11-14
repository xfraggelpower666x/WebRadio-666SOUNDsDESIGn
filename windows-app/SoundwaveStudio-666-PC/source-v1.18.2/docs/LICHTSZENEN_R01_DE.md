# RADIO WAVE v6.66 · Lichtszenen R02

Quellbasis `6f583ca8f87225c5ac746429d1a3d9a2490d613c`.
Govee-Routen abgeglichen mit WebRadio-Commit `7061f77f57002a7cc539ccb3226fcb071e24d2d5`.

## Start unter Windows

1. Paket vollständig entpacken und `START_RADIO_WAVE_v6.66.bat` starten.
   Beim ersten Start installiert die vorhandene Startdatei die Abhängigkeiten via npm.
2. Für Govee unter **666 RADIO** mit dem vorhandenen Radio-Admin-Zugang anmelden.
   Im Panel **Lichtszenen** auf **Govee-Geräte laden** klicken und gewünschte RGB-Geräte markieren.
3. Für die Notebook-Tastatur **ASUS Aura verwenden** aktivieren.
   Der Bestätigungsdialog nennt die Auswirkungen auf die ASUS-Beleuchtung.
4. **Bunker**, **Break** oder **Drop** wählen und **Szene anwenden** klicken.
   Das Panel zeigt das Ergebnis je Ausgang. Die Szene setzt Farbe, der Ein/Aus-Zustand
   bleibt Aufgabe der jeweiligen Gerätesteuerung.
5. Für schnellere lokale Reaktion **Aura reagiert auf Bass** aktivieren und Audio
   im RADIO-WAVE-Player abspielen. Die Reaktion verwendet den vorhandenen Analyzer.
6. **ASUS Aura verwenden** abwählen, um die Steuerung freizugeben.

Die Szenen werden manuell ausgelöst. Nur die Aura-Helligkeit reagiert auf den
Audiopegel. Govee-RGB wird pro Szene und Geräteauswahl gesendet. Nach einem
externen Farbwechsel die Govee-Geräte erneut laden, damit dieselbe Szene erneut
gesendet werden kann. Bei einer Teilantwort nach der Wartezeit nochmals
anwenden. Die bereits erfolgreichen Geräte werden dabei übersprungen.

Aura nutzt ausschließlich den lokalen ASUS-Aura-Dienst. Initialisierung erfolgt
bei SDK-Code 5 und nach Nutzerbestätigung. Bei bestätigtem Besitz wird Aura beim
Abwählen oder regulären Beenden freigegeben. ASUS setzt dabei die Aura-Geräte
auf ihren Standardeffekt. Bei unklarem Besitz oder fehlgeschlagener Freigabe
Armoury Crate kontrollieren.

## Prüfung

- `node --test tests/light-scenes.test.cjs` prüft Szenenrouting, lokale Bassgrenze,
  Aura-Besitz und Govee-Teilantworten anhand simulierter API-Antworten.
- `npm run check:syntax` und `npm run check:radio-wave-release` bestehen.
- `npm test` prüft zusätzlich die bestehende Radio-Wave-Testsuite.
- Windows-Start, sichtbarer Aura-Farbwechsel und gemeinsamer Gerätetest stehen aus.
