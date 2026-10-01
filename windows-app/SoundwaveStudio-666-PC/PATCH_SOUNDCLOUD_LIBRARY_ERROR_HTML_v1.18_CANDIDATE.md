# SOUNDWAVE v1.18 — SoundCloud library error HTML hardening (candidate)

Status: SOURCE_PATCH_CANDIDATE; NOT DEPLOYED; FREEZE=NO.

File in local source candidate ZIP: `SoundwaveStudio_666_PC_v1.17.0/src/integration/666-integration.js` (archive named v1.18, internal root remains v1.17).

## Exact one-site replacement

Replace:
```js
box.innerHTML='<div class="file-meta-tag">Library unavailable · '+String(err.message||err)+'</div>';
```

With:
```js
box.replaceChildren();
const msg=document.createElement('div');
msg.className='file-meta-tag';
msg.textContent='Library unavailable · '+String(err.message||err);
box.appendChild(msg);
```

Why: error message must be rendered as text, not interpreted as HTML.

Local checks 2026-10-01: exact one occurrence found; Node --check PASS on patched source; four source archives ZIP CRC PASS; offline SHA-256 verifier PASS. This does not verify Electron Windows runtime or production deployment. Full GitHub source upload is still pending. Do not modify 666STREAM production or LIGHT ORCHESTRA. Restore requires explicit approval. FREEZE=NO.
