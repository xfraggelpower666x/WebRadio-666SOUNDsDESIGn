from pathlib import Path
import re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# 1) VELUNA PC layout: move player down, shrink controls, enlarge Now Playing.
# ---------------------------------------------------------------------------
css_path = 'css/veluna-theme.css'
css = read(css_path)
old_pc = '''@media (min-width:769px){
  body[data-veluna-page="veluna"] .player-card,
  body[data-veluna-page="internal"] .player-card{
    width:clamp(430px,37vw,500px)!important;
    max-width:min(500px,calc(100vw - 48px))!important;
  }
}'''
new_pc = '''@media (min-width:769px){
  body[data-veluna-page="veluna"] .app-shell,
  body[data-veluna-page="internal"] .app-shell{
    align-items:flex-start!important;
    justify-content:center!important;
    padding:0 24px 18px!important;
    overflow:hidden!important;
  }
  body[data-veluna-page="veluna"] .player-card,
  body[data-veluna-page="internal"] .player-card{
    width:clamp(430px,37vw,500px)!important;
    max-width:min(500px,calc(100vw - 48px))!important;
    height:min(760px,calc(100dvh - 82px))!important;
    max-height:calc(100dvh - 82px)!important;
    margin-top:clamp(32px,4vh,40px)!important;
    grid-template-rows:auto auto auto minmax(154px,1fr) auto auto auto auto auto!important;
    gap:5px!important;
    padding:8px!important;
    overflow:hidden!important;
  }
  body[data-veluna-page="veluna"] .display-block,
  body[data-veluna-page="internal"] .display-block{
    min-height:154px!important;
    grid-template-rows:auto auto minmax(120px,1fr)!important;
  }
  body[data-veluna-page="veluna"] .display-window,
  body[data-veluna-page="internal"] .display-window{min-height:120px!important}
  body[data-veluna-page="veluna"] :is(.status-grid,.pill-row,.mini-grid,.source-switch,.control-strip,.tool-strip),
  body[data-veluna-page="internal"] :is(.status-grid,.pill-row,.mini-grid,.source-switch,.control-strip,.tool-strip){gap:4px!important}
  body[data-veluna-page="veluna"] .lamp-box,
  body[data-veluna-page="internal"] .lamp-box{min-height:32px!important;padding:4px 6px!important}
  body[data-veluna-page="veluna"] .pill,
  body[data-veluna-page="internal"] .pill{padding:4px 6px!important}
  body[data-veluna-page="veluna"] .mini-box,
  body[data-veluna-page="internal"] .mini-box{min-height:38px!important;padding:4px 6px!important}
  body[data-veluna-page="veluna"] :is(.source-led-btn,.control-btn),
  body[data-veluna-page="internal"] :is(.source-led-btn,.control-btn){min-height:30px!important;padding:3px 4px!important}
  body[data-veluna-page="veluna"] .small-btn,
  body[data-veluna-page="internal"] .small-btn{min-height:28px!important;padding:3px 4px!important}
  body[data-veluna-page="veluna"] .action-bar,
  body[data-veluna-page="internal"] .action-bar{height:22px!important;padding-block:2px!important}
  body[data-veluna-page="veluna"] .levelmeter,
  body[data-veluna-page="internal"] .levelmeter{height:22px!important;padding-block:3px!important}
}'''
if old_pc in css:
    css = css.replace(old_pc, new_pc, 1)
elif 'margin-top:clamp(32px,4vh,40px)!important' not in css:
    raise SystemExit('PC layout authority block not found')
css = css.replace('VELUNA Central Player Theme v1.2.23', 'VELUNA Central Player Theme v1.2.24', 1)
write(css_path, css)
write('public/css/veluna-theme.css', css)

# ---------------------------------------------------------------------------
# 2) Discord Shooter + Veluna Messenger bridge.
# ---------------------------------------------------------------------------
addon_path = 'js/addons/discord-player-addon-v3.js'
addon = read(addon_path)
addon = re.sub(r"var VERSION = '[^']+';", "var VERSION = 'V4.9-20260719-OVERLAY-STATUS-MANUAL-NOWPLAYING';", addon, count=1)

# Hidden rule must beat the later display:flex!important rule.
addon = addon.replace(
    '.s666-discord-gate--hidden{display:none!important}.s666-discord-gate{',
    '.s666-discord-gate.s666-discord-gate--hidden{display:none!important}.s666-discord-gate{',
    1
)
addon = addon.replace('z-index:2147483000!important', 'z-index:2147483646!important')
addon = addon.replace(
    '.s666msg-count-veluna{display:block;margin:7px 0 0;color:rgba(22,255,243,.72);font-size:11px;font-weight:900;letter-spacing:.06em}',
    '.s666msg-count-veluna{display:block;margin:7px 0 0;color:rgba(22,255,243,.72);font-size:11px;font-weight:900;letter-spacing:.06em}.s666-discord-status{min-height:18px;margin-top:9px;font-size:11px;font-weight:900;letter-spacing:.05em}.s666-discord-status.is-sending{color:#ffc857}.s666-discord-status.is-ok{color:#7edcff}.s666-discord-status.is-error{color:#ff5570}.s666-discord-emojis{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:10px}.s666-discord-emoji{min-width:32px;min-height:30px;border-radius:8px!important;padding:4px 6px!important;font-size:18px!important}.s666-discord-nowplaying{border-color:rgba(126,220,255,.68)!important;color:#7edcff!important}',
    1
)

# Helpers inserted before closeMessageOverlay.
marker = '  function closeMessageOverlay() {'
helpers = '''  var DISCORD_EMOJIS = ['🎵','🎶','🎧','🎤','🔥','⚡','💜','💙','🤘','😎','👽','💀','🎉','🚀','✨','⭐','666'];

  function setDiscordOverlayStatus(text, mode) {
    var status = document.getElementById('s666DiscordMessageStatus');
    if (!status) return;
    status.textContent = text || '';
    status.className = 's666-discord-status' + (mode ? ' is-' + mode : '');
  }

  function insertAtCursor(input, value, max) {
    if (!input || !value) return;
    var start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
    var end = typeof input.selectionEnd === 'number' ? input.selectionEnd : start;
    var next = input.value.slice(0, start) + value + input.value.slice(end);
    input.value = next.slice(0, max || 1800);
    var pos = Math.min(input.value.length, start + value.length);
    try { input.setSelectionRange(pos, pos); input.focus(); } catch (_) {}
  }

'''
if helpers.strip() not in addon:
    addon = replace_once(addon, marker, helpers + marker, 'discord helper insertion')

old_overlay = '''    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Discord Message">' +
      '<button type="button" class="s666-discord-gate-x" data-discord-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">DISCORD SHOOTER</div>' +
      '<div class="s666-discord-gate-message">Message to Discord:</div>' +
      '<textarea id="s666DiscordMessageText" class="s666-discord-msg-input" maxlength="1800" rows="7" placeholder="Message"></textarea>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-discord-close>CANCEL</button><button type="button" id="s666DiscordMessageSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';'''
new_overlay = '''    var emojiHtml = '<div class="s666-discord-emojis">' + DISCORD_EMOJIS.map(function (emoji) { return '<button type="button" class="s666-discord-emoji" data-discord-emoji="' + emoji + '">' + emoji + '</button>'; }).join('') + '</div>';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Discord Message">' +
      '<button type="button" class="s666-discord-gate-x" data-discord-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">DISCORD SHOOTER</div>' +
      '<div class="s666-discord-gate-message">Message to Discord:</div>' +
      '<textarea id="s666DiscordMessageText" class="s666-discord-msg-input" maxlength="1800" rows="7" placeholder="Message"></textarea>' +
      emojiHtml +
      '<div id="s666DiscordMessageStatus" class="s666-discord-status" role="status" aria-live="polite">Bereit</div>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-discord-close>CLOSE</button><button type="button" id="s666DiscordNowPlayingSend" class="s666-discord-gate-submit s666-discord-nowplaying">NOW PLAYING</button><button type="button" id="s666DiscordMessageSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';'''
addon = replace_once(addon, old_overlay, new_overlay, 'discord overlay html')

old_bind = '''    overlay.addEventListener('click', function (event) { if (event.target === overlay || event.target.closest('[data-discord-close]')) closeMessageOverlay(); });
    document.getElementById('s666DiscordMessageSend').addEventListener('click', sendMessageFromOverlay);
    document.getElementById('s666DiscordMessageText').addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendMessageFromOverlay(); } });'''
new_bind = '''    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.closest('[data-discord-close]')) { closeMessageOverlay(); return; }
      var emojiButton = event.target.closest && event.target.closest('[data-discord-emoji]');
      if (emojiButton) insertAtCursor(document.getElementById('s666DiscordMessageText'), emojiButton.getAttribute('data-discord-emoji') || '', 1800);
    });
    document.getElementById('s666DiscordMessageSend').addEventListener('click', sendMessageFromOverlay);
    document.getElementById('s666DiscordNowPlayingSend').addEventListener('click', sendNowPlayingFromOverlay);
    document.getElementById('s666DiscordMessageText').addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendMessageFromOverlay(); } });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !overlay.classList.contains('s666-discord-gate--hidden')) closeMessageOverlay(); });'''
addon = replace_once(addon, old_bind, new_bind, 'discord overlay bindings')

old_send = '''  async function sendMessageFromOverlay() {
    var input = document.getElementById('s666DiscordMessageText');
    var button = document.getElementById('s666DiscordMessageSend');
    var message = clean(input && input.value, 1800);
    if (!message) return;
    if (button) button.disabled = true;
    try {
      await postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: message }));
      if (input) input.value = '';
      closeMessageOverlay();
    } finally {
      if (button) button.disabled = false;
    }
  }'''
new_send = '''  async function sendMessageFromOverlay() {
    var input = document.getElementById('s666DiscordMessageText');
    var button = document.getElementById('s666DiscordMessageSend');
    var message = clean(input && input.value, 1800);
    if (!message) { setDiscordOverlayStatus('Nachricht fehlt', 'error'); return; }
    if (button) button.disabled = true;
    setDiscordOverlayStatus('Wird gesendet …', 'sending');
    try {
      await postJson('/api/discord/message', Object.assign(readTrackFromDom(), { message: message }));
      if (input) input.value = '';
      setDiscordOverlayStatus('✓ Erfolgreich an Discord gesendet', 'ok');
    } catch (error) {
      setDiscordOverlayStatus('✗ Versand fehlgeschlagen: ' + clean(error && error.message, 180), 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function sendNowPlayingFromOverlay() {
    var button = document.getElementById('s666DiscordNowPlayingSend');
    if (button) button.disabled = true;
    setDiscordOverlayStatus('Now Playing wird gesendet …', 'sending');
    try {
      await postTrackIfChanged(true);
      setDiscordOverlayStatus('✓ Now Playing erfolgreich gesendet', 'ok');
    } catch (error) {
      setDiscordOverlayStatus('✗ Now Playing fehlgeschlagen: ' + clean(error && error.message, 180), 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }'''
addon = replace_once(addon, old_send, new_send, 'discord send status')

# Reset status whenever the overlay opens.
addon = addon.replace(
    "    overlay.classList.remove('s666-discord-gate--hidden');\n    setTimeout(function ()",
    "    overlay.classList.remove('s666-discord-gate--hidden');\n    setDiscordOverlayStatus('Bereit', '');\n    setTimeout(function ()",
    1
)

# Use the authoritative Messenger overlay for Veluna too (close, emoji, send state already implemented there).
old_msg_click = '''    button.addEventListener('click', function () {
      var overlay = ensureVelunaMessengerOverlay();
      overlay.classList.remove('s666-discord-gate--hidden');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { var input = document.getElementById('s666VelunaMessengerText'); if (input) input.focus(); }, 60);
    });'''
new_msg_click = '''    button.addEventListener('click', function () {
      Promise.resolve()
        .then(function () {
          if (window.S666Messenger && typeof window.S666Messenger.open === 'function') return true;
          return loadScriptOnce('s666MessengerOverlayVelunaBridge', '/js/messenger-overlay.js?v=2026-07-19-overlay-status-v2');
        })
        .then(function () {
          if (!window.S666Messenger || typeof window.S666Messenger.open !== 'function') throw new Error('messenger_overlay_missing');
          window.S666Messenger.open();
        })
        .catch(function (error) { dispatch('s666:veluna-messenger-state', { phase: 'error', error: error && error.message ? error.message : String(error) }); });
    });'''
addon = replace_once(addon, old_msg_click, new_msg_click, 'Veluna Messenger authority')

write(addon_path, addon)
write('public/js/addons/discord-player-addon-v3.js', addon)

# ---------------------------------------------------------------------------
# 3) Auth UX: do not label every worker mismatch as a wrong password.
# ---------------------------------------------------------------------------
auth_path = 'js/admin-auth-client.js'
auth = read(auth_path)
auth = auth.replace(
    "      password_rejected: 'Das Admin-Passwort wurde abgelehnt.',",
    "      password_rejected: 'Das eingegebene Admin-Passwort stimmt nicht mit dem aktuell im Passwort-Worker gespeicherten Wert überein.',\n      login_rejected: 'Der Passwort-Worker hat die Anmeldung abgelehnt. Worker-Version und Secrets prüfen.',\n      login_failed: 'Die Anmeldung konnte nicht abgeschlossen werden.',\n      auth_unreachable: 'Die Auth-Prüfung ist nicht erreichbar.',",
    1
)
auth = re.sub(r"version: '[^']+'", "version: '1.2.20-exact-auth-errors'", auth, count=1)
write(auth_path, auth)
write('public/js/admin-auth-client.js', auth)

# ---------------------------------------------------------------------------
# 4) Cache bust all production mirrors and worker HTML transforms.
# ---------------------------------------------------------------------------
cache_files = [
    'veluna/index.html', 'VELUNA/index.html', 'public/veluna/index.html', 'public/VELUNA/index.html',
    'index.html', 'public/index.html', 'worker.js', 'workers/webradio-666soundsdesign-worker/worker.js'
]
for path in cache_files:
    text = read(path)
    text = re.sub(r'(/js/addons/discord-player-addon-v3\.js\?v=)[^\"\'\s<]+', r'\g<1>2026-07-19-overlay-status-v49', text)
    text = re.sub(r'(/js/admin-auth-client\.js\?v=)[^\"\'\s<]+', r'\g<1>2026-07-19-auth-errors-v1220', text)
    text = re.sub(r'(/css/veluna-theme\.css\?v=)[^\"\'\s<]+', r'\g<1>2026-07-19-pc-fit-v1224', text)
    write(path, text)

print('Veluna overlay/auth/PC repair applied')
