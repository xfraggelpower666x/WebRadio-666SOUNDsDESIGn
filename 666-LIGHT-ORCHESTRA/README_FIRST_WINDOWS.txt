666SOUNDsDESIGn LIGHT ORCHESTRA SYMPHONY
WINDOWS ONE-CLICK START
============================================

EMPFOHLEN:
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
9. Windows EXE-Dateien bauen
10. 666_LIGHT_ORCHESTRA_SYMPHONY.exe starten

ERZEUGTE EXE-DATEIEN:
    dist\666_LIGHT_ORCHESTRA_SYMPHONY.exe
    dist\666_LIGHT_ORCHESTRA_LAB.exe
    dist\666_LIGHT_ORCHESTRA.exe

ALTERNATIVEN:
    START_SYMPHONY.bat
        -> Umgebung pruefen/aktualisieren und Python-GUI starten.

    BUILD_EXE.bat
        -> Umgebung pruefen/aktualisieren und EXE-Dateien bauen.

    bootstrap_windows.bat
        -> Nur Voraussetzungen pruefen/installieren/aktualisieren.

WICHTIG:
- Das Paket hebt keine Hardware-Sicherheitsgates auf.
- LENZE BLE Writes bleiben blockiert, solange die Command Frames nicht real
  hardwareverifiziert sind.
- OC21W Writes bleiben hinter den vorhandenen Protokoll- und
  Windows-Adress-Gates.
- Govee H6047 benoetigt vor Writes weiterhin einen erfolgreichen LAN-Probe.

Wenn winget auf dem Windows-PC nicht vorhanden ist und Python ebenfalls fehlt,
meldet die Batch das klar. In diesem Sonderfall Python 3.12+ einmal manuell
installieren und die Batch erneut starten.
