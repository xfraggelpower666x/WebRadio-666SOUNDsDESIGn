# CHANGELOG VELUNA v1.2.21

- Passwort-Worker und Auth-Worker auf HARDLOCK v1.2.1 gehärtet.
- Falschen Login-Endpunkt in der Beispielkonfiguration korrigiert.
- AUTH_AUDIENCE verbindlich in Token-Ausgabe, Auth-Verifikation und WebRadio-Broker.
- ADMIN_SERVICE_TOKEN für beide externen Worker verpflichtend.
- Serverseitiges Login-Rate-Limit: 5 Fehlversuche, danach 15 Minuten Sperre.
- Admin-Token-Laufzeit von 8 auf 2 Stunden reduziert.
- Frontend-Fehlermeldungen für Audience, Service-Token und Rate-Limit ergänzt.
