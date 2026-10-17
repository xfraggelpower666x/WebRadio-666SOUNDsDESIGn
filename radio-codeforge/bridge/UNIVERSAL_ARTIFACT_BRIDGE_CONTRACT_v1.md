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

## Persistent Bridge Reuse Governance — 2026-10-17
BRIDGE_ID=666STREAM-CODEFORGE-ARTIFACT-BRIDGE
CANONICAL_CONTRACT=radio-codeforge/bridge/UNIVERSAL_ARTIFACT_BRIDGE_CONTRACT_v1.md
REGISTRY=radio-codeforge/bridge/BRIDGE_REGISTRY.json
SINGLE_CANONICAL_IMPLEMENTATION=TRUE
NEW_BRIDGE_PER_TASK=FORBIDDEN
NEW_BRIDGE_PER_PROJECT=FORBIDDEN
NEW_BRIDGE_PER_ARTIFACT_TYPE=FORBIDDEN
REUSE_BEFORE_BUILD=REQUIRED
AUTOMATIC_SOURCE_MUTATION=FORBIDDEN

### Resolution before every bridge request
1. Rehydrate 666STREAM native GitHub Current, relevant active project and bridge registry. Bridge identity remains `666-RADIO-CODEFORGE-001` governed; it never overrides native project authority.
2. Resolve canonical bridge by stable ID and contract, not by newest ZIP, latest handoff or filename similarity. Check its capabilities, source, transport status, version and available actual host tooling.
3. If an available verified transport satisfies the request, REUSE without rebuilding. Create only a request-scoped manifest/receipt and explicit allowlist.
4. If the implementation is present but host execution or remote readback is not verified, classify READY_CONTRACT_ONLY / READBACK_PENDING and use permitted existing tools if available; do not invent a working bridge.
5. If a capability is genuinely missing or broken, audit root cause, minimally repair or extend the same bridge, preserve identity, prior versions and compatibility; require separate authorized write/readback. Do not fork a new bridge as a workaround.
6. If neither existing path nor authorized repair is executable, return BLOCKED with concrete missing prerequisites and a resumable anchor. Do not make another bridge ZIP by default.
7. Record each transfer's manifest, target repository/branch/scope, source SHA-256, source bytes, target hash, fresh HEAD and proof-of-readback independently from canonical bridge version.

### Authority and continuity
- A transfer job is NOT another bridge instance/implementation. Artifacts and receipts can be many; the canonical bridge is one.
- No automatic deployment, no overwrite, no protected-path mutation, no secrets, no foreign system writes and no ZIP-derived trigger activation.
- Existing `PREPARED_NOT_LIVE_TESTED` remains the transport qualification until actual remote host/PowerShell execution and fresh-clone SHA-256 readback are observed.
- WEITER / NEW CHAT / NEXT CHAT preserve canonical bridge ID, registry version, active transfer job, last verified phase and return anchor; never rebuild from chat reset.
- `FUCK HORST` checks accidental duplicate bridge creation, drift, stale transfers and claims of fabricated readbacks as part of relevant native diagnostics.


## LYVRA Binary Repository Bridge 1.0.0 — adopted process reference (2026-10-17)
Reference repository: `xfraggelpower666x/LYVRA-Living-Yielding-Vibration-and-Resonance-Architecture`, branch `lyvra`.
Reference carrier: `LYVRA_NATIVE_RUNTIME/current/repository/BINARY_REPOSITORY_BRIDGE.md`.
Verified reference blob: `d0f58f4b1b3cda4c85125f0c2d6f086fc7d9cc6a`. LYVRA is the source of this procedure only, not 666STREAM authority.

### Binary routing: direct first, reusable fallback second
For binary payloads prefer a complete directly supported repository transport with verified byte identity. Use the **existing** 666STREAM canonical Bridge as fallback only if direct binary transport is unavailable or blocked. For text/source transfers, existing direct authorized GitHub tooling remains preferred; do not force binary fallback. Never create a second implementation.

### Eligibility gate — all required
- Available original source bytes and verified source identity/path.
- Independently measured source byte size and SHA-256 (not invented or taken solely from a name).
- Exact target repository, branch, destination allowlist and authorization.
- Read current remote HEAD and fresh clone/read of target before transport.
- For fallback: documented direct binary transport limitation or failure.

### Transfer and readback sequence
1. Verify original source path, byte count and SHA-256.
2. Capture target repository branch HEAD and perform a fresh remote clone/read.
3. Copy and stage *only* allowlisted exact payload files; do not silently unpack/transform.
4. Re-read remote HEAD immediately before push; abort on unexpected change.
5. Require explicit transport approval; push without force.
6. Independently freshly clone/read remote after push.
7. Confirm remote path, byte size and SHA-256 equality to source.
8. Emit machine-readable receipt with source/target hashes, commit and verified phase.
9. Report `PASS_REMOTE_READBACK` only after independent remote verification.
10. Native 666STREAM UPDATE (not Bridge) may subsequently govern promotion and CURRENT_POINTER-last.

### Non-negotiable fences
NO_FORCE_PUSH; NO_POINTER_MUTATION_BY_BRIDGE; NO_SOURCE_STATE_MUTATION_BY_BRIDGE; NO_PLUGIN_OR_DEPLOYMENT_MUTATION_BY_BRIDGE; NO_CROSS_SYSTEM_MERGE; NO_PRIVATE_PAYLOAD_TO_PUBLIC_REPO; NO_UNVERIFIED_HASH_OR_SIZE; NO_SILENT_CANDIDATE_PROMOTION; READY_WITHOUT_REMOTE_READBACK_FORBIDDEN.
Current fallback implementation status remains `PREPARED_NOT_LIVE_TESTED`. The existence of a documented LYVRA successful use is *not* a 666STREAM host PASS.

## Verifizierter GitHub-Connector-Binärtransport — 2026-10-17

BRIDGE_ID=666STREAM-CODEFORGE-ARTIFACT-BRIDGE
DIRECT_GITHUB_BINARY_BLOB=PASS_ISOLATED_582_BYTE_ZIP
WINDOWS_BRIDGE_REQUIRED_FOR_TESTED_TRANSPORT=FALSE
SAME_CANONICAL_BRIDGE=TRUE

Ein echter, neu erstellter ZIP-Container aus einem GOVEE-Originalquelltext wurde per vorhandenem GitHub-Connector als Base64-Blob gespeichert, in einen Git-Tree eingebunden, als Commit auf den isolierten Branch `test/codeforge-govee-bridge-20261017` geschrieben und anschließend über den Connector unabhängig rückgelesen. 582/582 Bytes wurden durch Base64-Gleichheit und Git-Blob-SHA `111abe5921d9f62303648c96f648bd924e0cafe1` bestätigt. Nachweis: `projects/666-GOVEE-CONTROL/bridge-tests/2026-10-17/binary-zip-readback-receipt.json` auf diesem **Testbranch**.

### Native Routing
Bei binären GitHub-Artefakten zuerst den direkten GitHub-Connector-Transport der bestehenden Bridge auf Eignung prüfen. Wenn Rechte, API oder Dateigröße die direkte Variante nicht erlauben, auf die **bereits bestehende** Windows/PowerShell-Git-Bridge zurückfallen; niemals stillschweigend eine neue Bridge pro Aufgabe erzeugen. Preflight, Allowlist, Source-Hash und Bytezahl, HEAD-Gegenprüfung, explizite Schreibfreigabe, unabhängiger Remote-Readback und separate Freigabe für Produktiv-Promotion bleiben obligatorisch. Die eigentliche Testbranch-Operation war nur aufgrund direkter ausdrücklicher Nutzerauthorisierung ausführbar.

### Nicht verifiziert
- Ursprüngliches gesamtes 9123-Byte-GOVEE-Archiv **nicht** als identischer Container importiert.
- Ungeprüfte Dateigrößen-/API-Grenzen, kein allgemeines Versprechen, dass alle GitHub-Connector-Binäruploads funktionieren.
- Der kanonische PowerShell-Runner wurde nicht ausgeführt. Kein Produktionsdeploy, keine GOVEE-Gerätesteuerung und kein PFS-Receipt.

### Chat-Rückkehr nach Nutzerkorrektur
Der GOVEE-Binärtest ist ein gültiger, isolierter Nebenast, **kein Foreground-Wechsel**. Der aktive Entwicklungsanker dieses Chats geht zurück auf WEBRADIO Dashboard nach WCH-Reparatur (Commit `c5045cabb46bef8e2dcec7a76fe6abdd3c149119`). Die neueren CORE- und CodeForge-Commits werden bewahrt. Kein GitHub-Revert.
