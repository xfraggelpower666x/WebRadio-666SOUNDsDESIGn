666SOUNDsDESIGn — Scriptable Deploy Tool (DE)

WAS ES KANN
- einzelne Datei direkt ins GitHub-Repo hochladen/ersetzen
- mehrere Dateien nacheinander hochladen
- ZIP-Datei als Backup in _uploads/ speichern

WAS ES NICHT DIREKT KANN
- ZIP lokal in Scriptable sauber komplett entpacken und die Struktur rekursiv automatisch ins Repo spiegeln

EMPFOHLENER ECHT-WORKFLOW AM IPHONE
1) ZIP in Dateien entpacken
2) die geänderten Dateien mit SCRIPTABLE_GITHUB_DEPLOY.js hochladen
3) Cloudflare/GitHub Auto-Deploy übernimmt den Rest

TOKEN
- Script starten
- GitHub Token einmal eingeben
- wird im Scriptable Keychain gespeichert unter:
  GITHUB_TOKEN_666SOUNDSDESIGN

EMPFOHLENE ZIELPFade
- workers/radio worker.js
- index.html
- js/app.js
- config/radio.config.js
- css/style.css
- data/streams.json

WICHTIG
- Keine Secrets direkt in Projektdateien schreiben
- Token nur im Keychain lassen
