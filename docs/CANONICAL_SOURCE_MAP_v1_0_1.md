# Canonical Source Map – v1.0.1

Die Vollversion enthält aus Kompatibilitäts- und Recovery-Gründen einzelne Spiegeldateien. Diese werden nicht still entfernt.

## Aktive kanonische Bereiche

| Bereich | Kanonische Quelle | Spiegel/Kompatibilität |
|---|---|---|
| Root-Worker | `worker.js` | keine zweite aktive Worker-Root |
| Browser-JavaScript | `js/` | `core/` enthält teilweise historische/architektonische Spiegel |
| Browser-Assets | durch `.assetsignore` freigegebene Pfade | Dokumentation/Backend bleiben vom Asset-Deploy ausgeschlossen |
| Renderer | `Render/666SOUNDsDESIGn-Alert-Service-Renderer/` | `renderer-resources/...` ist geprüfter Kompatibilitätsspiegel |
| Radio-Runtime | `config/radio-runtime.json` oder `RADIO_CONFIG_KV` | Worker-Defaults sind nur Fail-safe |

Kritische Renderer-Laufzeitdateien werden im Release-Gate bytegenau verglichen. Weitere historische Duplikate bleiben sichtbar, bis ein eigener Browser-Paritätstest ihre sichere Konsolidierung belegt.
