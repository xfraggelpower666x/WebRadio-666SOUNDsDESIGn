# Offene Punkte und Release-Gates — v1.1.0

## Blockiert die lokale Paketfreigabe nicht

- Live-Deploy wurde nicht ausgeführt.
- Passwort-Worker- und Auth-Worker-Quellcode waren nicht Bestandteil der hochgeladenen Repo-ZIP.
- Cloudflare-Secrets und DNS können lokal nicht geprüft werden.

## Vor Produktion zwingend

1. Passwort-Worker besitzt `POST /login` und keinen Radioaktionscode.
2. Auth-Worker besitzt `POST /verify` und keine `/login`-Route.
3. `AUTH_SECRET` ist in PW und Auth exakt identisch.
4. `ADMIN_SERVICE_TOKEN` ist in WebRadio, PW und Auth exakt identisch.
5. `AUTH_AUDIENCE` ist in allen drei Workern exakt identisch.
6. `ADMIN_PASSWORD` existiert ausschließlich im Passwort-Worker.
7. `exp` und `expiresAt` verwenden Unix-Sekunden und acht Stunden TTL.
8. komplette End-to-End-Testmatrix aus `docs/AUTH_ARCHITECTURE_CANONICAL_v1_0_0.md` ausführen.

## Nicht Teil dieses Auth-Reparaturpatches

Folgende bereits bekannten Projektbereiche wurden bewusst nicht als „repariert“ behauptet:

- langfristige Audio-Aussetzer-/Buffering-Ursachen im Live-Player
- geplante Systempanel-LED-Neuanordnung und Farblogik
- Fraggle-DNA-Pulse-Rails und gespiegelte Meter-Treppe
- Logo-/Copyright-/Messenger-Layoutumbau
- zentrale Stream-Preset-Registry und Slash-Konfiguration
- echte Geräteprüfung auf iPhone/Android/PC

Diese Bereiche benötigen eigene Codebefunde und getrennte Freigaben. Der Auth-Hardlock wurde so integriert, dass diese späteren Arbeiten nicht durch eine zweite Auth-Schicht erschwert werden.
