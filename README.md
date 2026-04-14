# RADIO_PLAYER_V2_PROXY_FIX

A-Version:
- Worker macht Stream-Proxy
- Worker macht Metadata-Proxy
- Player ruft nur gleiche Domain auf

Routen:
- / -> Player
- /health -> OK
- /stream -> Primary Stream Proxy mit Fallback
- /fallback-stream -> Fallback Stream Proxy
- /api/nowplaying -> Metadata Proxy
