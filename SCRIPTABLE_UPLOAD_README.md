# Scriptable Atomic Fullversion Upload – v5.0.0

## Auszuwählende Mappe

```text
WebRadio-666SOUNDsDESIGn_FULLVERSION_BRANCH_RECOVERY_v1_0_2
```

In dieser Mappe müssen `worker.js`, `wrangler.jsonc`, `public/`, `workers/`, `worker-addons/` und `Scriptable/` direkt liegen.

## Empfohlener Modus

`ATOMIC FULLVERSION – EXTRAS ERHALTEN`

Der Uploader erzeugt für jede Datei zunächst einen Git-Blob. Der produktive Branch bleibt währenddessen unverändert. Erst wenn alle Blobs und der vollständige Tree vorhanden sind, wird genau ein Commit erzeugt und der Branch genau einmal aktualisiert.

`ATOMIC EXACT MIRROR – EXTRAS LÖSCHEN` entfernt zusätzlich Dateien, die nur remote existieren. Dieser Modus ist ausdrücklich destruktiv markiert.

## Pflichtwerte

- Owner: `xfraggelpower666x`
- Repo: `WebRadio-666SOUNDsDESIGn`
- Branch: `WebRadio-666SOUNDsDESIGn`

Token nur in der Scriptable-Keychain speichern. Nicht in Dateien oder GitHub schreiben.
