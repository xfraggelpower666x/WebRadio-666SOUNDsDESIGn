# Button Technology Ownership — v1.2.16

## Player topology

- `/` — 666 Player (`index.html`)
- `/veluna` — independent VELUNA Player (`VELUNA/index.html`)
- `/internal` — emergency player embedded in `worker.js`

## 666 Player authoritative ownership

| Action | DOM control | Authoritative implementation | Supporting layer behavior |
|---|---|---|---|
| Play | `#playBtn` | `js/player-core.js` | stability HUD observes audio events only |
| Pause | `#pauseBtn` | `js/player-core.js` | no capture override |
| Stop | `#stopBtn` | `js/player-core.js` | no capture override |
| Reconnect | `#reconnectBtn` | `js/player-core.js` | recovery may observe stalls, not click |
| Main source | `#mainBtn` | `js/player-core.js` | PC guard is observe-only |
| Backup source | `#fallbackBtn` | `js/player-core.js` | PC guard is observe-only |
| Boost | boost controls | `js/player-core.js` + existing `js/boost-core.js` | no new controller added |
| EQ | existing EQ modules | existing EQ layer | no replacement layer added |
| VELUNA navigation | `#playerDesignSwitch` | direct anchor `/veluna` | no JavaScript required |

## VELUNA ownership

VELUNA remains an independent player. Its controls stay in the existing inline VELUNA implementation. The new `666 PLAYER` switch is a direct anchor to `/`; it does not add a controller or duplicate audio logic.

## Cleanup performed

- Removed AMARIS physical player directories and manifest.
- Removed AMARIS worker route/redirect/debug references.
- Removed competing MAIN/BACKUP click ownership from the phase10 stability layer.
- Removed document-wide click/touch audio-resume capture from the phase10 layer.
- Kept the stability layer for audio-event observation and recovery only.
- Added no new override CSS or JavaScript layer.
