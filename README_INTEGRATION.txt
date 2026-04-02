666SOUNDsDESIGn FINAL RADIO ADDON
==================================

ZIEL
----
Dieses Paket ist bewusst als ADDON gebaut.
Es soll dein Hauptprojekt ergänzen, nicht ersetzen.

PRIORITÄT
---------
1. Bestehendes Hauptprojekt behalten
2. Bestehendes Design behalten
3. Bestehende Daten / Worker-Endpoints behalten
4. Dieses Paket ergänzend einfügen
5. Lieber ergänzen als mischen

WORKER
------
https://666soundsdesign.workers.dev

ENDPOINTS
---------
/stream
/nowplaying
/listeners
/history
/dj

DATEIEN
-------
addon/radio-addon.css
addon/radio-addon.js
addon/snippet.html
demo/index.html
README_INTEGRATION.txt

EMPFOHLENE EINBAU-STRATEGIE
---------------------------
Nicht das Hauptprojekt überschreiben.

Am besten:
- vorhandenen Header behalten
- vorhandene Hero-Sektion behalten
- vorhandene Logos behalten
- dieses Addon NACH der Hero-Sektion oder IN die bestehende Stream-Sektion einsetzen

Kurz:
Lieber ERGÄNZEN als MISCHEN.

BESTE INTEGRATION
-----------------
Variante A — nach der Hero-Sektion
<main>
  ... bestehende Hero-Sektion ...
  <section data-666-radio-target></section>
  ... restliche Inhalte ...
</main>

Variante B — in bestehende Stream-Sektion
<section id="stream-area">
  <section data-666-radio-target></section>
</section>

SCHRITT-FÜR-SCHRITT
-------------------
1. Ordner "addon" in dein Hauptprojekt kopieren.
2. In der Haupt-HTML diese Zeile an der gewünschten Stelle einfügen:
   <section data-666-radio-target></section>
3. Vor </body> diese Zeilen einfügen:
   <link rel="stylesheet" href="addon/radio-addon.css">
   <script src="addon/radio-addon.js"></script>
4. Hochladen.
5. Testen:
   - Stream startet
   - Now Playing lädt
   - Listener laden
   - History lädt
   - Sticky Player unten sichtbar

WARUM DIESE LÖSUNG
------------------
- Das Addon nutzt Prefix "sd-" für Klassen
- Dadurch weniger Konflikte mit deinem Hauptprojekt
- Dein bestehendes Design und deine Daten haben Vorrang
- Das Addon ist funktionale Erweiterung, keine Komplettumschreibung

WAS DU NICHT MACHEN SOLLTEST
----------------------------
- nicht alles in eine große CSS-Datei kippen
- nicht bestehende Worker-Logik löschen
- nicht mehrere kaputte Player mischen
- nicht das Hauptprojekt unnötig zerreißen

Besser:
- Hauptprojekt lassen
- Addon sauber druntersetzen
- später gezielt einzelne Teile übernehmen

KURZFAZIT
---------
Diese Final-Version ist:
- modular
- worker-kompatibel
- ohne OBS
- mit Readme und klaren Einbauanweisungen
- so gebaut, dass Hauptprojekt + bestehendes Design Vorrang behalten
