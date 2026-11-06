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


DIAGNOSE:
    RUN_DIAGNOSTICS.bat
        -> prueft Bluetooth-Adapter, Windows-Bluetoothstatus, sichtbare BLE-Geraete,
           Govee-LAN-Erkennung und Registry READ-ONLY.
        -> erzeugt diagnostics\LIGHT_ORCHESTRA_DIAGNOSTICS.json
        -> fuehrt keine Hardware-Writes aus.


BLUETOOTH RECOVERY:
    RUN_BLUETOOTH_RECOVERY.bat
        -> startet/restartet nur den Windows Bluetooth Support Service,
           loest einen Windows Hardware-Neuscan aus und zeigt gefundene Adapter.
        -> deinstalliert KEINEN Treiber, loescht KEIN Geraet und erzwingt KEINEN Neustart.

Wenn Govee unter 192.168.2.32 im Router sichtbar ist, aber der UDP-LAN-Probe scheitert:
    -> RUN_DIAGNOSTICS.bat ausfuehren
    -> ICMP_REACHABLE + devStatus FAIL deutet auf LAN-Control/Firewall/UDP-Pfad hin
    -> LAN Control in der Govee-App pruefen
