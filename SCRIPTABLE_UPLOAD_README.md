# Scriptable Direkt-Upload – iPhone/iPad

## Richtige Ordnerauswahl

Nach dem Entpacken wird **die Projektmappe selbst** gewählt:

```text
WebRadio-666SOUNDsDESIGn_FULLVERSION_REPAIRED_v1_0_1
```

In dieser Mappe müssen direkt sichtbar sein:

```text
worker.js
wrangler.jsonc
index.html
package.json
Scriptable/
worker-addons/
config/
assets/
```

Nicht den übergeordneten Downloads-/iCloud-Ordner wählen. Der Uploader bricht vor dem Upload ab, wenn die Root-Marker fehlen.

## Scriptable-Datei

```text
Scriptable/Scripts/666SOUNDsDESIGn_FOLDER_UPLOADER_LIVE_UI.js
```

## Verhalten

- erstellt neue Dateien
- aktualisiert vorhandene Dateien
- überspringt byteidentische Dateien
- lädt rekursiv alle regulären Repo-Dateien hoch
- überspringt `.git`, `.wrangler`, `node_modules`, `__pycache__`, `.DS_Store`, `.pyc` und innere ZIP-Dateien
- hält Token ausschließlich in der Scriptable-Keychain
- zeigt jede Datei und ihren Status live an

## Wichtig

Der mobile Uploader löscht absichtlich keine fremden oder alten Dateien aus dem GitHub-Repository. Er arbeitet nicht destruktiv. Für ein garantiert vollständig bereinigtes Remote-Repo muss der Zielbranch vorher kontrolliert werden.
