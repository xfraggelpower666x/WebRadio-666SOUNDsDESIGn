# ASUS Aura im Webradio

Der Windows-Helfer verwendet denselben nativen Aura-REST-Adapter wie RADIO WAVE.
Er lauscht ausschließlich lokal auf `127.0.0.1:27340` und spricht mit dem
Aura-Dienst von Armoury Crate auf `127.0.0.1:27339`.

1. Unter Windows Armoury Crate mit laufendem ASUS-Aura-Dienst und Node.js ab
   Version 22 bereitstellen. Die Dateien im Repository gemeinsam auschecken.
2. `START_ASUS_AURA.cmd` starten und geöffnet lassen.
3. Im Webradio-Hauptplayer oder Dashboard **GOV → ASUS Aura · Windows**
   öffnen, den Kopplungscode eingeben und **Aura übernehmen** wählen.
   Falls Edge oder Chrome fragt, den lokalen Zugriff für die Webradio-Seite erlauben.
4. Die erkannte Tastatur, eine Farbe und optional die Bassreaktion wählen.
   Die Bassreaktion verwendet frische, gemessene Pegel.
5. Über **Aura freigeben** oder durch Schließen des GOV-Dialogs den
   ASUS-Standardeffekt wiederherstellen. Der Helfer versucht zusätzlich nach
   fünf Minuten oder beim Beenden mit Strg+C die Freigabe.

Der Kopplungscode gilt für diesen Lauf des Hilfsprogramms und wird ausschließlich
an den lokalen Dienst gesendet. GOVEE Cloud läuft separat ohne diesen Helfer.
Der Linux-Stand prüft die Browser- und Adapterverträge. Armoury Crate und ein
kompatibles Gerät sind für die Windows-Abnahme erforderlich.
