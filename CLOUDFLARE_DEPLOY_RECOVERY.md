# Cloudflare Branch- und Deploy-Recovery – v1.0.2

## Zielzustand

| Einstellung | Wert |
|---|---|
| GitHub Repository | `xfraggelpower666x/WebRadio-666SOUNDsDESIGn` |
| Production branch | `WebRadio-666SOUNDsDESIGn` |
| Worker name | `webradio-666soundsdesign-worker` |
| Root directory – bevorzugt | `/` bzw. leer |
| Root directory – Legacy kompatibel | `workers/webradio-666soundsdesign-worker` |
| Build command | leer oder `npm run verify` |
| Deploy command | `npx wrangler deploy` |

## Nach Löschen und Neuerstellen eines Branches

1. Cloudflare → Workers & Pages → `webradio-666soundsdesign-worker` öffnen.
2. Settings → Build → Branch control.
3. Production branch erneut auf `WebRadio-666SOUNDsDESIGn` setzen und speichern.
4. Settings → Build → Root directory prüfen.
5. Bevorzugt Root directory `/` bzw. leer verwenden.
6. Deploy command auf `npx wrangler deploy` setzen.
7. Prüfen, dass der Worker-Name im Dashboard exakt `webradio-666soundsdesign-worker` lautet.
8. Danach den atomaren Scriptable-Upload ausführen oder einen neuen Commit auslösen.

## Root-Verzeichnis-Kompatibilität

- Bei Root `/` wird `./wrangler.jsonc` verwendet und `./public` ausgeliefert.
- Bei altem Root `workers/webradio-666soundsdesign-worker` wird der Legacy-Spiegel verwendet und `../../public` ausgeliefert.

## Hidden-File-Schutz

Die v1.0.2 benötigt `.assetsignore` nicht mehr als Sicherheitsgrenze. Ein manueller GitHub-Upload, der Dotfiles auslässt, kann daher nicht mehr versehentlich das komplette Repository als Browser-Assets definieren. Für vollständige CI- und Ignore-Dateien bleibt Scriptable der vorgeschriebene Uploadweg.

## Secrets

Secrets und KV-Bindings bleiben im Cloudflare-Dashboard erhalten und gehören nicht in das ZIP. Ein Branch-Neuaufbau erzeugt sie nicht automatisch neu. Prüfen:

- `ADMIN_AUTH_URL`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `PLAYER_ALERT_SERVICE_TOKEN`
- `SKIP_TARGET_URL`
- `SKIP_API_TOKEN` oder `SKIP_API_KEY`
- optional `RADIO_CONFIG_KV`, `PLAYER_ALERT_KV`, `DEBUG_TOKEN`
