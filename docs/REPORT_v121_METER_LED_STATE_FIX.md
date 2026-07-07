# v121 METER LED STATE FIX

Basis: v120 META/COVER STABILITY MERGE.

Änderungen:
- Systempanel-M-LED bekommt wieder einen stabilen ON-State aus dem echten Meter/EQ-Renderpfad.
- LED-Setter schreibt Attribute nur noch bei echter Änderung, damit kein Blinken/Restart entsteht.
- Offline-State bleibt erhalten, aber Meter-Aktivität darf die M-LED wieder auf OK setzen.
- Version/Cache-Strings auf v121 gesetzt.

Nicht geändert:
- kein Layout
- kein Ticker
- kein Audio-Transport
- kein EQ-Umbau
- kein Discord
- kein Worker/Streamrouting
