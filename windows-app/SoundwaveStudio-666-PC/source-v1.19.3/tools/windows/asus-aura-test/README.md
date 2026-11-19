# RADIO WAVE · ASUS Aura Test 1.0.0

Windows-Test für das lokale ASUS Aura Ready Game SDK. Im vollständig
ausgecheckten RADIO-WAVE-Quellbaum die Datei **START_AURA_TEST.bat**
doppelklicken. Das Tool nutzt Node.js ab 22.12 aus der bestehenden
RADIO-WAVE-Entwicklungsumgebung. Für den Test werden weder npm-Pakete noch
OpenRGB oder Administratorrechte benötigt.

1. **Aura-Diagnose** sendet einen GET an 127.0.0.1:27339. Ergebniscode 5
   bedeutet, dass der Dienst antwortet und die SDK-Sitzung uninitialisiert ist.
   Ergebniscode 0 bedeutet, dass das SDK bereits initialisiert ist.
2. **Kontrollierter Aura-Farbtest** bietet nach Eingabe von **INIT** die
   Übernahme an, sofern der Player-Adapter vorab Ergebniscode 5 sieht. Vorher
   in anderen RGB-Apps aktive Tests beenden. Der Adapter akzeptiert
   NB_Keyboard und NB_Keyboard_4Zone. Mit **RGB** sendet der Test Cyan
   an die zuerst erkannte unterstützte Notebook-Tastatur.
3. Der Test wartet etwa zwei Sekunden und gibt die bestätigte eigene
   Sitzung frei. ASUS stellt dabei den Standardeffekt wieder her. Anschließend
   kann die sichtbare Gerätewirkung im Bericht festgehalten werden.
   Bei einem unterbrochenen POST mit unklarem Besitz oder einer
   fehlgeschlagenen Freigabe den Aura-Zustand in Armoury Crate prüfen.

Berichte liegen im Unterordner **Reports**. Sie enthalten HTTP- und Aura-Codes,
gemeldete Aura-Gerätetypen und optional die getrennte Sichtprüfung von Farbe
und Standardeffekt. Eine
HTTP-Quittung bestätigt die Antwort des Dienstes. Die Sichtprüfung am Gerät
liefert den Nachweis für Farbwechsel und Wiederherstellung. Ein erzwungenes
Beenden des Prozesses kann die Freigabe verhindern.

Direktaufruf aus dem Toolordner unter Windows:

    node aura-test.cjs --diagnose
    node aura-test.cjs --controlled

| Exitcode | Bedeutung |
|---|---|
| 0 | Gewählte Aktion regulär beendet oder Übernahme übersprungen. |
| 1 | Laufzeit-, HTTP-, API- oder Berichtfehler. |
| 2 | Ungültiger Aufruf. |
| 3 | Freigabe fehlgeschlagen. |
| 4 | Übernahme nach Transport- oder Antwortfehler unklar. |
| 130 | Interaktiver Abbruch. |

Vertragstests mit Dienstsimulation:

    node --test aura-test.test.cjs

Der Testordner gehört zum RADIO-WAVE-Quellbaum. Zum Starten wird der Quellbaum
mit dem gemeinsamen Aura-Adapter benötigt. Die bereits veröffentlichten
Installer und die portable Player-EXE enthalten diesen Ordner nicht.

[ASUS-REST-Referenz](https://www.asus.com/microsite/aurareadygamesdk/game_sdk_restful.html)
