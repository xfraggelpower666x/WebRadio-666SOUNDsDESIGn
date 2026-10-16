# 666 RADIO-CODEFORGE — Universelle Artefakt- und Binär-Bridge v1

STATUS=PREPARED_NOT_LIVE_TESTED
OWNER=666-RADIO-CODEFORGE-001
SCOPE=PROJECT-SCOPED DEVELOPMENT TRANSPORT
NO_RUNTIME_INFILTRATION=TRUE
NO_FOREIGN_AUTHORITY=TRUE

## Zweck
Eine **einzige allgemeine CodeForge-Bridge** für explizit autorisierte ZIP-Pakete, Bildmaterial (PNG/JPEG/WebP/SVG), Audio/Video, sonstige Binärdateien, Quellcode und Dokumente. Nicht Govee-spezifisch und nicht pro Dateityp oder Zielprojekt neu implementieren. Projektzuordnung, Ziel-Repo, Branch und einzelne Zielpfade kommen ausschließlich aus dem jeweiligen verifizierten nativen Projektkontext und einer expliziten Transfer-Allowlist.

## Referenz und Grenzen
LYVRA `LYVRA_NATIVE_RUNTIME/current/repository/BINARY_REPOSITORY_BRIDGE.md` lieferte das verifizierte Transport-Verfahrensmodell. Nur Capability-/Prozessmerkmale werden adaptiert; Identität, native Trigger, Pointer und Autorität bleiben bei 666STREAM. Diese Bridge ist keine laufende Govee-LAN-Brücke und kein Cloudflare-Worker. `radio-codeforge/` darf niemals in produktiven Runtime-Code importiert werden.

## Übertragungsvertrag
1. Vorhandene Originalbytes, Identität, Bytezahl und SHA-256 prüfen; keine Secrets oder unautorisierte Dateien.
2. Manifest mit exakt erlaubten source-/target-Pfaden; ZIPs und Bilder bleiben unverändert, kein Entpacken/Transformieren ohne gesonderten Auftrag.
3. Repository, Branch, Schreibrechte und aktuellen Remote HEAD prüfen; frischen Clone erstellen.
4. Nur neue explizit erlaubte Zielpfade; kein stilles Überschreiben, keine destruktive Bereinigung.
5. Sofort vor Push HEAD erneut prüfen; bei Abweichung stoppen, niemals Force Push.
6. Push erst nach ausdrücklicher Freigabe; danach unabhängigen frischen Remote Clone/Readback.
7. Bytezahl + SHA-256 pro Datei nach Readback nachweisen, maschinenlesbares Receipt.
8. Erst `PASS_REMOTE_READBACK` erlaubt den Status 'importiert'. Bridge schreibt weder Current Pointer noch Deployments.

## Referenzartefakt aus diesem Chat
`666STREAM_CODEFORGE_ARTIFACT_BRIDGE_v1.zip`: allgemeines Windows PowerShell/Git-Transportpaket mit Manifest, Preflight, Bestätigung, Git-Push und Git-Readback. Dieses Archiv ist ein lokales Chat-Artefakt und **nicht automatisch in GitHub übertragen**. PowerShell-/GitHub-Live-Test noch offen.

## Native Governance
- `SOURCE_AUDIT=PASS` kann ohne `REMOTE_READBACK=PASS` keine Import-Freigabe auslösen.
- Kein APK-Import aus dem aktuellen Govee-Auftrag.
- Kein Secret-Transfer, keine fremde Source-/Projektmutation.
- Projektarchitektur und CodeForge-Vertrag bleiben unabhängig von der Dateiart.
