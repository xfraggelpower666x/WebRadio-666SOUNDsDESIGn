# GOVEE FX SCENE SYNC INTEGRATION V1 — 2026-05-25

## Integrated

```text
js/system-extra/govee/govee-sync-config.js
js/system-extra/govee/govee-bridge-client.js
js/system-extra/govee/govee-scene-sync.js
js/system-extra/govee/govee-fx-control-hooks.js
```

## Rule

This is integrated as isolated frontend add-on only.

```text
- no audio engine replacement
- no player structure replacement
- no Worker secret exposure
- no GOVEE API key in frontend
- no routing takeover
```

## Expected behavior

The add-on can listen to existing player FX/state hooks and route scene sync through its configured bridge/client layer.
