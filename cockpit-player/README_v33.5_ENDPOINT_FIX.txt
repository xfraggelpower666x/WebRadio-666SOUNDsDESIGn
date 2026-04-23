v33.5 ENDPOINT FIX

Ursache:
Der Cockpit-Player wurde auf xfraggelpower666x.github.io geöffnet.
Dort zeigen relative Pfade wie /stream und /api/nowplaying auf GitHub Pages.
GitHub Pages hat diese Worker-Endpunkte nicht.

Fix:
Wenn hostname github.io enthält, nutzt cockpit-player/js/cockpit.js automatisch:
https://webradio.666soundsdesign-broadcaster.com/stream
https://webradio.666soundsdesign-broadcaster.com/api/nowplaying

Wenn der Player direkt auf der Worker/Custom Domain liegt, bleiben die Pfade relativ:
 /stream
 /api/nowplaying

Worker wurde nicht geändert.
