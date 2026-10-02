# MiniPlayer — HTML zum Einbetten kopieren

Additive Erweiterung des Neon-/Höhenanpassungs-Entwurfs: neuer Button „HTML einbetten / Embed“, lesbarer readonly-Codebereich und „Code kopieren / Copy code“. Der feste öffentliche iframe-Code enthält keine Zugangsdaten. Er lädt den vorhandenen MiniPlayer unter seiner HTTPS-Adresse und bleibt mit beliebigen Website-HTML-Blöcken nutzbar.

Clipboard nur nach ausdrücklichem Klick; Erfolg wird erst nach erfolgreichem writeText gemeldet. Bei fehlender Clipboard API oder abgelehntem Zugriff wird der Code fokussiert und markiert, mit einem eindeutigen Hinweis zum manuellen Kopieren. Gerade eingebettete Frames können Clipboard-Zugriff blockieren. Keine neue Berechtigung wird ungefragt angefordert. Escape schließt die Ansicht und bringt den Fokus zum Auslöser zurück.

Der bestehende ResizeObserver passt die iframe-Höhe auf den freigegebenen LYVRA-Hosts auch beim Öffnen dieser Ansicht an. Auf anderen Hosts funktioniert die normale iframe-Einbettung mit 365 Pixel Ausgangshöhe; ein Höhen-/Audioprotokoll wird dort nicht automatisch freigegeben. Audioreaktive Website-Effekte werden durch den einfachen iframe-Code allein nicht eingebaut.

Test: `node tests/verify-embed-copy.cjs` — PASS für Panel, öffentlichen Code, erfolgreichen Clipboard-Zugriff, blockierte/fehlende API, manuelle Auswahl, Escape und Fokus. Kein visueller Live-Browsertest. Bestand: Streamquellen, Audiograph, EQ, Boost, Messenger, Admin und bestehende Links unverändert. Entwurf im bestehenden PR; noch keine Live-Veröffentlichung.
