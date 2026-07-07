# v184 iPhone Ticker / Meter / Laser Fix

Basis: aktuelle funktionierende GitHub-ZIP.

Geändert:
- iPhone-Ticker/Laufschrift wieder auf span-basierte Marquee-Animation korrigiert.
- Doppelte Container-Marquee-Regeln entschärft, die den Text aus dem sichtbaren Bereich geschoben haben.
- Idle-Ticker nutzt vorhandenen letzten Metadaten-Titel, wenn vorhanden.
- iPhone-Levelmeter geglättet: Attack/Release statt hektischer Sprünge.
- Bottom-Levelmeter mit weicher Center-Out-Dynamik statt hartem On/Off-Zappel.
- Rainbow-Laser-Außenrahmen und Rainbow-Sektionslinien als CSS-Optik auf vorhandenen Containern.

Nicht geändert:
- SEND-System nicht angefasst.
- Worker/Backend/Discord nicht angefasst.
- PC-Layout und PC-EQ nicht angefasst.
- Keine neuen klickbaren Overlay-Layer.
