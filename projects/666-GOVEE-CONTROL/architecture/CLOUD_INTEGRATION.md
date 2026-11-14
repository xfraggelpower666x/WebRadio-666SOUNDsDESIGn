# Govee Cloud · Inbetriebnahme

Der WebRadio-Worker bedient `/api/admin/govee/*` über die vorhandene Radio-Admin-Anmeldung. Er ruft per `GOVEE_CONTROL_WORKER` den privaten Worker `666-govee-control` im selben Cloudflare-Konto auf. Der Govee-Worker verwendet die offizielle Govee-API. Das Radio verarbeitet das Audiosignal im vorhandenen MeterBus. Die Umrechnung in Lichtbefehle findet im Govee-Worker statt.

## Konfiguration und Reihenfolge

1. Den bestehenden Govee-Worker mit `worker/wrangler.toml` aktualisieren. Die SQLite-Durable-Object-Migration `govee-rate-gate-v1` legt den gemeinsamen Rate-Limiter an. Das vorhandene `GOVEE_API_KEY`-Secret und `CONTROL_TOKEN` erhalten. `workers.dev` und Preview-URLs bleiben deaktiviert.
2. Beim WebRadio-Worker `GOVEE_SERVICE_TOKEN` als Cloudflare-Secret mit demselben Wert wie `CONTROL_TOKEN` des Govee-Workers konfigurieren. Falls der Wert nicht mehr verfügbar ist, den Diensttoken an beiden Workern koordiniert neu setzen. Den Govee-API-Key ausschließlich im Govee-Worker belassen.
3. Die WebRadio-Änderungen mit dem Service Binding bereitstellen. Ohne Binding oder Diensttoken antwortet die geschützte Route mit 503. Anonyme Aufrufe erhalten 403.
4. Im Dashboard unter **GOV → Geräte laden** anmelden und zuerst die Geräteliste lesen. Für getrennten Readback dienen `GET /api/admin/govee/devices?area=bars` und `?area=tv`. Modell, Geräteanzahl und die gemeldeten Funktionen prüfen. Der Katalog kann leer sein, wenn das Modell im Govee-Konto fehlt.
5. Einzelbefehle und Gruppenbefehle über die Geräteauswahl prüfen. Bei HTTP 207 steht das Ergebnis je Gerät im Antwortkörper. Ein bestätigter API-Befehl und der sichtbare Lichtwechsel sind getrennte Prüfpunkte.
6. Im Hauptplayer **Govee FX** explizit einschalten und **LightBars** oder **TV** auswählen. Der Schalter ist pro Seite standardmäßig aus. Der Client verwendet frische echte MeterBus-Werte im Abstand von 2,5 Sekunden. Die Audio-Route sendet RGB nur an Geräte im gewählten Bereich, die `colorRgb` melden. Leerlauf löst keinen Lichtbefehl aus. TV-Sync, geräteinterne Szenen und Segmente werden von diesem Audiopfad nicht gesteuert.

Der Dienst benötigt keine lokale Govee-Software. Die Bereitstellung muss die bestehenden Kontingente und den Projektumfang berücksichtigen. Bei einem Rollback zuerst den WebRadio-Stand zurücksetzen, anschließend die vorherige Govee-Version aktivieren. Der zuvor lokal gesicherte R02 ist Quellcode-Evidenz und kein Live-Readback.

## Lokal verifizieren

Aus dem Repository-Root:

```sh
npm run check
node --test tests/govee*.test.mjs
npm --prefix projects/666-GOVEE-CONTROL/worker run check
npm --prefix projects/666-GOVEE-CONTROL/worker test
```
