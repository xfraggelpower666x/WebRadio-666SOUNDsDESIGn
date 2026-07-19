from pathlib import Path

ROOT = Path('.')
ADDON = ROOT / 'js/addons/discord-player-addon-v3.js'
MIRROR = ROOT / 'public/js/addons/discord-player-addon-v3.js'

source = ADDON.read_text(encoding='utf-8')
source = source.replace(
    "var VERSION = 'V4.9-20260719-OVERLAY-STATUS-MANUAL-NOWPLAYING';",
    "var VERSION = 'V4.10-20260719-MESSENGER-STATUS-EMOJI-CLOSE';",
    1,
)

old_overlay = '''  function ensureVelunaMessengerOverlay() {
    ensureStyle();
    var overlay = document.getElementById('s666VelunaMessengerOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 's666VelunaMessengerOverlay';
    overlay.className = 's666-discord-gate s666-discord-gate--hidden';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Veluna Messenger">' +
      '<button type="button" class="s666-discord-gate-x" data-veluna-msg-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">VELUNA MESSENGER</div>' +
      '<div class="s666-discord-gate-message">Broadcast message to WebRadio listeners:</div>' +
      '<textarea id="s666VelunaMessengerText" class="s666-discord-msg-input" maxlength="' + MSG_MAX + '" rows="6" placeholder="Nachricht an alle Hörer schreiben..."></textarea>' +
      '<span id="s666VelunaMessengerCount" class="s666msg-count-veluna">0 / ' + MSG_MAX + '</span>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-veluna-msg-close>CANCEL</button><button type="button" id="s666VelunaMessengerSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var textarea = document.getElementById('s666VelunaMessengerText');
    var count = document.getElementById('s666VelunaMessengerCount');
    function close() { overlay.classList.add('s666-discord-gate--hidden'); document.body.style.overflow = ''; }
    function updateCount() { if (count && textarea) count.textContent = String(textarea.value.length) + ' / ' + MSG_MAX; }
    overlay.addEventListener('click', function (event) { if (event.target === overlay || event.target.closest('[data-veluna-msg-close]')) close(); });
    textarea.addEventListener('input', updateCount);
    textarea.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendVelunaMessenger(); } });
    document.getElementById('s666VelunaMessengerSend').addEventListener('click', sendVelunaMessenger);
    return overlay;
  }
'''

new_overlay = '''  function setVelunaMessengerStatus(text, mode) {
    var status = document.getElementById('s666VelunaMessengerStatus');
    if (!status) return;
    status.textContent = text || '';
    status.className = 's666-discord-status' + (mode ? ' is-' + mode : '');
  }

  function closeVelunaMessengerOverlay() {
    var overlay = document.getElementById('s666VelunaMessengerOverlay');
    if (overlay) overlay.classList.add('s666-discord-gate--hidden');
    document.body.style.overflow = '';
  }

  function ensureVelunaMessengerOverlay() {
    ensureStyle();
    var overlay = document.getElementById('s666VelunaMessengerOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 's666VelunaMessengerOverlay';
    overlay.className = 's666-discord-gate s666-discord-gate--hidden';
    var emojiHtml = '<div class="s666-discord-emojis">' + DISCORD_EMOJIS.map(function (emoji) { return '<button type="button" class="s666-discord-emoji" data-veluna-msg-emoji="' + emoji + '">' + emoji + '</button>'; }).join('') + '</div>';
    overlay.innerHTML = '<div class="s666-discord-gate-box" role="dialog" aria-modal="true" aria-label="Veluna Messenger">' +
      '<button type="button" class="s666-discord-gate-x" data-veluna-msg-close aria-label="Close">×</button>' +
      '<div class="s666-discord-gate-title">VELUNA MESSENGER</div>' +
      '<div class="s666-discord-gate-message">Broadcast message to WebRadio listeners:</div>' +
      '<textarea id="s666VelunaMessengerText" class="s666-discord-msg-input" maxlength="' + MSG_MAX + '" rows="6" placeholder="Nachricht an alle Hörer schreiben..."></textarea>' +
      '<span id="s666VelunaMessengerCount" class="s666msg-count-veluna">0 / ' + MSG_MAX + '</span>' +
      emojiHtml +
      '<div id="s666VelunaMessengerStatus" class="s666-discord-status" role="status" aria-live="polite">Bereit</div>' +
      '<div class="s666-discord-gate-actions"><button type="button" class="s666-discord-gate-cancel" data-veluna-msg-close>CLOSE</button><button type="button" id="s666VelunaMessengerSend" class="s666-discord-gate-submit">SEND</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var textarea = document.getElementById('s666VelunaMessengerText');
    var count = document.getElementById('s666VelunaMessengerCount');
    function updateCount() { if (count && textarea) count.textContent = String(textarea.value.length) + ' / ' + MSG_MAX; }
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.closest('[data-veluna-msg-close]')) { closeVelunaMessengerOverlay(); return; }
      var emojiButton = event.target.closest && event.target.closest('[data-veluna-msg-emoji]');
      if (emojiButton) {
        insertAtCursor(textarea, emojiButton.getAttribute('data-veluna-msg-emoji') || '', MSG_MAX);
        updateCount();
      }
    });
    textarea.addEventListener('input', updateCount);
    textarea.addEventListener('keydown', function (event) { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); sendVelunaMessenger(); } });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !overlay.classList.contains('s666-discord-gate--hidden')) closeVelunaMessengerOverlay(); });
    document.getElementById('s666VelunaMessengerSend').addEventListener('click', sendVelunaMessenger);
    return overlay;
  }
'''

if source.count(old_overlay) != 1:
    raise SystemExit(f'old messenger overlay count={source.count(old_overlay)}')
source = source.replace(old_overlay, new_overlay, 1)

old_send = '''  async function sendVelunaMessenger() {
    var input = document.getElementById('s666VelunaMessengerText');
    var button = document.getElementById('s666VelunaMessengerSend');
    var message = clean(input && input.value, MSG_MAX);
    if (!message) return;
    if (button) button.disabled = true;
    dispatch('s666:veluna-messenger-state', { phase: 'sending' });
    try {
      var client = await ensurePlayerAlertClient();
      var result = await client.send(message, { username: 'Veluna Broadcast', source: 'veluna-messenger' });
      if (!result || result.ok !== true) throw new Error(clean(result && (result.error || result.message), 200) || 'messenger_send_failed');
      if (input) input.value = '';
      var overlay = document.getElementById('s666VelunaMessengerOverlay');
      if (overlay) overlay.classList.add('s666-discord-gate--hidden');
      dispatch('s666:veluna-messenger-state', { phase: 'success', data: result });
    } catch (error) {
      dispatch('s666:veluna-messenger-state', { phase: 'error', error: error && error.message ? error.message : String(error) });
    } finally {
      if (button) button.disabled = false;
    }
  }
'''

new_send = '''  async function sendVelunaMessenger() {
    var input = document.getElementById('s666VelunaMessengerText');
    var button = document.getElementById('s666VelunaMessengerSend');
    var message = clean(input && input.value, MSG_MAX);
    if (!message) { setVelunaMessengerStatus('Nachricht fehlt', 'error'); return; }
    if (button) button.disabled = true;
    setVelunaMessengerStatus('Wird an die Hörer gesendet …', 'sending');
    dispatch('s666:veluna-messenger-state', { phase: 'sending' });
    try {
      var client = await ensurePlayerAlertClient();
      var result = await client.send(message, { username: 'Veluna Broadcast', source: 'veluna-messenger' });
      if (!result || result.ok !== true) throw new Error(clean(result && (result.error || result.message), 200) || 'messenger_send_failed');
      if (input) input.value = '';
      var count = document.getElementById('s666VelunaMessengerCount');
      if (count) count.textContent = '0 / ' + MSG_MAX;
      setVelunaMessengerStatus('✓ Erfolgreich an die Hörer gesendet', 'ok');
      dispatch('s666:veluna-messenger-state', { phase: 'success', data: result });
    } catch (error) {
      var detail = error && error.message ? error.message : String(error || 'messenger_send_failed');
      setVelunaMessengerStatus('✗ Versand fehlgeschlagen: ' + clean(detail, 180), 'error');
      dispatch('s666:veluna-messenger-state', { phase: 'error', error: detail });
    } finally {
      if (button) button.disabled = false;
    }
  }
'''

if source.count(old_send) != 1:
    raise SystemExit(f'old messenger send count={source.count(old_send)}')
source = source.replace(old_send, new_send, 1)

required = [
    "V4.10-20260719-MESSENGER-STATUS-EMOJI-CLOSE",
    "data-veluna-msg-emoji",
    "s666VelunaMessengerStatus",
    "✓ Erfolgreich an die Hörer gesendet",
    "✗ Versand fehlgeschlagen:",
    "closeVelunaMessengerOverlay",
]
for marker in required:
    if marker not in source:
        raise SystemExit(f'missing marker: {marker}')

ADDON.write_text(source, encoding='utf-8')
MIRROR.write_text(source, encoding='utf-8')

html_files = [
    'index.html',
    'public/index.html',
    'veluna/index.html',
    'VELUNA/index.html',
    'public/veluna/index.html',
    'public/VELUNA/index.html',
]
for name in html_files:
    path = ROOT / name
    html = path.read_text(encoding='utf-8')
    if html.count('2026-07-19-overlay-status-v49') != 1:
        raise SystemExit(f'{name}: v49 cache marker count={html.count("2026-07-19-overlay-status-v49")}')
    path.write_text(html.replace('2026-07-19-overlay-status-v49', '2026-07-19-overlay-status-v50', 1), encoding='utf-8')

print('Veluna Messenger v50 repair applied')
