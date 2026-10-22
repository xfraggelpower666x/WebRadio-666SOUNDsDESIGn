666SOUNDsDESIGn LIGHT ORCHESTRA SYMPHONY
WINDOWS ONE-CLICK START
============================================

SCHNELLSTART:
Doppelklick auf:

    START_SYMPHONY.bat

Wenn die fertige EXE im Paket vorhanden ist, startet diese Batch DIREKT:

    dist\666_LIGHT_ORCHESTRA_SYMPHONY.exe

Dafuer ist weder eine Python-Installation noch eine virtuelle Umgebung noetig.

NEU BAUEN / ALLES AKTUALISIEREN:
Doppelklick auf:

    ONE_CLICK_SETUP_BUILD_RUN.bat

Dieser Ablauf erledigt automatisch:

1. Python 3.11+ suchen
2. Falls Python fehlt:
   - Windows Package Manager (winget) suchen
   - Python 3.12 automatisch installieren
3. pip pruefen/initialisieren
4. lokale .venv erstellen, falls sie fehlt
5. pip / setuptools / wheel aktualisieren
6. requirements.txt installieren bzw. aktualisieren
7. tkinter / bleak / PyInstaller pruefen
8. config.json beim ersten Start anlegen
9. Windows EXE-Dateien neu bauen
10. 666_LIGHT_ORCHESTRA_SYMPHONY.exe starten

ERZEUGTE / MITGELIEFERTE EXE-DATEIEN:
    dist\666_LIGHT_ORCHESTRA_SYMPHONY.exe
    dist\666_LIGHT_ORCHESTRA_LAB.exe
    dist\666_LIGHT_ORCHESTRA.exe

ALTERNATIVEN:
    BUILD_EXE.bat
        -> Voraussetzungen pruefen/aktualisieren und EXEs neu bauen.

    bootstrap_windows.bat
        -> Nur Voraussetzungen pruefen/installieren/aktualisieren.

WICHTIG:
- Das Paket enthaelt jetzt neben den fertigen EXEs auch die Python-Quellen,
  damit BUILD_EXE.bat aus dem entpackten Paket wirklich neu bauen kann.
- Das Paket hebt keine Hardware-Sicherheitsgates auf.
- LENZE BLE Writes bleiben blockiert, solange die Command Frames nicht real
  hardwareverifiziert sind.
- OC21W Writes bleiben hinter den vorhandenen Protokoll- und
  Windows-Adress-Gates.
- Govee H6047 benoetigt vor Writes weiterhin einen erfolgreichen LAN-Probe.
