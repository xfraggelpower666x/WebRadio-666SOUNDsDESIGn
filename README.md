# RADIO_PLAYER_V2_PROXY_FIX_R2

Korrigierte A-Version mit exakt deinen Stream-URLs.

Primary:
https://my.idjstream.com/666soundsdesign/stream

Fallback:
https://my.idjstream.com:8686/stream

Metadata:
https://my.idjstream.com/cp/get_info.php?p=8686

Worker-Routen:
- / -> Player
- /health -> OK
- /stream -> Primary Proxy, bei Fehler Fallback
- /fallback-stream -> Fallback Proxy
- /api/nowplaying -> Metadata Proxy
