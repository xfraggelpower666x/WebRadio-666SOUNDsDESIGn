# AMARIS Route / iOS / LYVRA DJ Repair v1.2.2

## Scope

- Preserve every existing player.
- Bind only the AMARIS endpoint to the standalone minimal player.
- Use the Worker runtime and failover chain before direct upstream reserves.
- Make iPhone user-gesture startup recoverable.
- Display `LYVRA DJ` during Auto-DJ and switch to real live-DJ metadata automatically.

## AMARIS routes

- `/amaris`
- `/amaris/`
- `/AMARIS`
- `/AMARIS/`
- `/amaris/index.html`
- `/AMARIS/index.html`

All routes return `x-player-mode: amaris-lyvra-minimal` and `x-amaris-route-lock: standalone-only`.

## Audio chain

MAIN: `/stream` → `/fallback-stream` → runtime primary direct reserve → runtime backup direct reserve.

BACK: `/fallback-stream` → `/stream` → runtime backup direct reserve → runtime primary direct reserve.

The Worker endpoints remain authoritative because they load `config/radio-runtime.json` or the active KV runtime configuration.

## Preservation

- `/` remains the full main player.
- `/internal` remains the embedded emergency player.
- Audio/EQ/Boost architecture of the full player is unchanged.
