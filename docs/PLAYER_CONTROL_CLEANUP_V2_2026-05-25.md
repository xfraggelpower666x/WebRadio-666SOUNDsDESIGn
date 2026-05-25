# PLAYER CONTROL CLEANUP V2 — 2026-05-25

## Fixed in this package

### Routing

```text
/CHAOS_ENGINE/
/CHAOS_ENGINE/index.html
/CHAOS_ENGINE/track-factory.html
/CHAOS_ENGINE/fraggle-detlef-system.html
```

are now served by embedded Worker fallback if asset binding is unavailable.

This prevents Chaos Engine routes from falling through to root/debug/Hello World routes.

### The Dark Dancer

The existing The Dark Dancer route remains priority-protected:

```text
/The-Dark-Dancer
/The-Dark-Dancer.html
```

### Emergency / fallback player

Existing emergency/fallback routes were preserved:

```text
/external-player
/fallback-stream
/stream
```

## Broadcast Cleanup V2

```text
- Username prompt before first send
- Username stored only in sessionStorage
- Message payload includes username
- Stable lastAck key with fallback fingerprint
- Fix for repeated popup after tab switch
- API cache-burst with ?t=Date.now()
- Larger broadcast text field/readability
- SENT / FAILED / READY LED status hooks
```

## Admin Hello World bug

Admin button must never navigate directly to Auth/PW Worker pages.

Correct flow:

```text
ADMIN button in Player
→ local overlay stays in Player
→ /api/admin/auth-check
→ Auth redirect only if needed
→ return to Player
→ overlay opens
```

## Planned next build modules

### Sound Control Overlay

```text
- PC + iPhone
- 9-band EQ
- Booster integrated
- one WebAudio Chain
- 3 presets
- localStorage
- dirty-state save confirmation
```

### Discord Shooter Admin Merge

```text
- remove separate Discord password dialog
- place Discord shooter in Admin overlay
- SEND / CLEAR
- SENT / FAILED LED
- Worker secret webhook only
```
