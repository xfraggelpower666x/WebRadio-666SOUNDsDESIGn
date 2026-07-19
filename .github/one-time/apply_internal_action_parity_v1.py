from pathlib import Path

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


worker = read('worker.js')

worker = replace_once(
    worker,
    '<body>\n  <div id="bootOverlay" class="overlay">',
    '<body data-veluna-ui="1" data-veluna-page="internal">\n  <div id="bootOverlay" class="overlay">',
    'Internal body identity',
)

old_controls = '''      <div class="audio-tools audio-tools-4">
        <button id="reconnectBtn" class="small-btn" type="button">Reconnect</button>
        <button id="muteBtn" class="small-btn" type="button">Mute</button>
        <button id="primaryBtn" class="small-btn source-btn is-active" type="button">MAIN</button>
        <button id="backupBtn" class="small-btn source-btn" type="button">BACK</button>
      </div>

      <audio id="radio" preload="none" playsinline></audio>'''

new_controls = '''      <div class="audio-tools audio-tools-4">
        <button id="reconnectBtn" class="small-btn" type="button">Reconnect</button>
        <button id="muteBtn" class="small-btn" type="button">Mute</button>
        <button id="primaryBtn" class="small-btn source-btn is-active" type="button">MAIN</button>
        <button id="backupBtn" class="small-btn source-btn" type="button">BACK</button>
      </div>

      <div class="internal-action-grid" role="group" aria-label="Internal Player Actions">
        <button id="skipBtn" class="small-btn internal-action-btn" type="button" data-action="skip">SKIP</button>
        <button id="discordBtn" class="small-btn internal-action-btn" type="button" data-action="discord">DISC</button>
        <button id="internalMessageBtn" class="small-btn internal-action-btn" type="button" data-action="message">MSG</button>
      </div>
      <div id="internalActionStatus" class="internal-action-status" role="status" aria-live="polite">Aktionen bereit</div>

      <audio id="radio" preload="none" playsinline></audio>'''
worker = replace_once(worker, old_controls, new_controls, 'Internal action controls')

css_marker = '.audio-tools-4{grid-template-columns:repeat(4,minmax(0,1fr))}'
css_extension = css_marker + '.internal-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.internal-action-status{min-height:26px;margin-top:8px;padding:6px 10px;border:1px solid rgba(22,255,243,.18);border-radius:12px;background:rgba(0,0,0,.22);color:var(--muted);font-size:.78rem;font-weight:700;letter-spacing:.03em;text-align:center}.internal-action-btn.is-busy{border-color:rgba(255,200,87,.72);color:#ffc857;box-shadow:0 0 16px rgba(255,200,87,.24)}.internal-action-btn.is-ok{border-color:rgba(22,255,243,.72);color:var(--cyan);box-shadow:0 0 18px rgba(22,255,243,.28)}.internal-action-btn.is-error{border-color:rgba(255,85,112,.78);color:var(--red);box-shadow:0 0 18px rgba(255,85,112,.24)}'
worker = replace_once(worker, css_marker, css_extension, 'Internal action CSS')

old_scripts = '''  <script type="module" src="/js/app.js?v=smfp-v83-discord-embed-pc-iphone-integration-20260505-0245"></script>
  <script src="/config/veluna-assets.js?v=2026-07-09-veluna-v1212"></script>
  <script defer src="/js/veluna-ui.js?v=2026-07-09-veluna-v1212"></script>'''

new_scripts = '''  <script type="module" src="/js/app.js?v=smfp-v83-discord-embed-pc-iphone-integration-20260505-0245"></script>
  <script src="/config/veluna-assets.js?v=2026-07-09-veluna-v1212"></script>
  <script src="/js/admin-auth-client.js?v=2026-07-19-auth-errors-v1220"></script>
  <script src="/js/skip-control.js?v=2026-07-19-action-parity-v1"></script>
  <script src="/js/player-alert-client.js?v=2026-06-25-hardlock1"></script>
  <script src="/js/messenger-overlay.js?v=2026-07-19-overlay-status-v2"></script>
  <script src="/js/addons/discord-player-addon-v3.js?v=2026-07-19-overlay-status-v51"></script>
  <script defer src="/js/veluna-ui.js?v=2026-07-09-veluna-v1212"></script>
  <script>
  (function () {
    'use strict';
    var skipButton = document.getElementById('skipBtn');
    var discordButton = document.getElementById('discordBtn');
    var messageButton = document.getElementById('internalMessageBtn');
    var actionStatus = document.getElementById('internalActionStatus');

    function clean(value) {
      return String(value == null ? '' : value).replace(/[<>]/g, '').replace(/\\s+/g, ' ').trim().slice(0, 220);
    }

    function setButtonState(button, mode) {
      if (!button) return;
      button.classList.remove('is-busy', 'is-ok', 'is-error');
      if (mode) button.classList.add('is-' + mode);
    }

    function setAction(text, mode, button) {
      if (actionStatus) {
        actionStatus.textContent = clean(text) || 'Aktionen bereit';
        actionStatus.style.color = mode === 'error' ? '#ff5570' : mode === 'busy' ? '#ffc857' : mode === 'ok' ? '#16fff3' : '';
      }
      setButtonState(button, mode);
    }

    async function runSkip() {
      if (!window.confirm('Aktuellen Auto-DJ-Titel wirklich überspringen?')) return;
      setAction('SKIP: Admin-Freigabe wird geprüft …', 'busy', skipButton);
      try {
        if (!window.S666SkipControl || typeof window.S666SkipControl.skip !== 'function') throw new Error('skip_controller_missing');
        var result = await window.S666SkipControl.skip({
          source: 'internal-player',
          prompt: 'Admin-Passwort für Internal Auto-DJ Skip eingeben:'
        });
        if (!result || result.ok !== true) throw new Error(result && result.error ? result.error : 'skip_failed');
        setAction('SKIP OK: zentraler Controller bestätigt', 'ok', skipButton);
      } catch (error) {
        setAction('SKIP FEHLER: ' + clean(error && error.message ? error.message : error), 'error', skipButton);
      }
    }

    async function openDiscord() {
      setAction('DISCORD SHOOTER wird geöffnet …', 'busy', discordButton);
      try {
        if (!window.S666DiscordPlayerAddonV3 || typeof window.S666DiscordPlayerAddonV3.messagePost !== 'function') throw new Error('discord_addon_not_ready');
        await window.S666DiscordPlayerAddonV3.messagePost();
        setAction('DISCORD SHOOTER geöffnet', 'ok', discordButton);
      } catch (error) {
        setAction('DISCORD FEHLER: ' + clean(error && error.message ? error.message : error), 'error', discordButton);
      }
    }

    function openMessenger() {
      setAction('MESSENGER wird geöffnet …', 'busy', messageButton);
      try {
        if (!window.S666Messenger || typeof window.S666Messenger.open !== 'function') throw new Error('messenger_overlay_missing');
        window.S666Messenger.open();
        setAction('MESSENGER geöffnet', 'ok', messageButton);
      } catch (error) {
        setAction('MESSENGER FEHLER: ' + clean(error && error.message ? error.message : error), 'error', messageButton);
      }
    }

    if (skipButton) skipButton.addEventListener('click', runSkip);
    if (discordButton) discordButton.addEventListener('click', openDiscord);
    if (messageButton) messageButton.addEventListener('click', openMessenger);

    window.addEventListener('s666:skip-state', function (event) {
      var detail = event.detail || {};
      if (detail.phase === 'auth') setAction('SKIP: Admin-Freigabe erforderlich', 'busy', skipButton);
      else if (detail.phase === 'sending') setAction('SKIP: wird ausgeführt …', 'busy', skipButton);
      else if (detail.phase === 'success') setAction('SKIP OK', 'ok', skipButton);
      else if (detail.phase === 'error') setAction('SKIP FEHLER: ' + clean(detail.error), 'error', skipButton);
    });

    window.addEventListener('s666:discord-state', function (event) {
      var detail = event.detail || {};
      if (detail.phase === 'sending') setButtonState(discordButton, 'busy');
      else if (detail.phase === 'success') setButtonState(discordButton, 'ok');
      else if (detail.phase === 'error') setButtonState(discordButton, 'error');
    });
  })();
  </script>'''
worker = replace_once(worker, old_scripts, new_scripts, 'Internal shared modules and bindings')

for required in [
    'data-veluna-page="internal"',
    'id="skipBtn"',
    'id="discordBtn"',
    'id="internalMessageBtn"',
    '/js/admin-auth-client.js?v=2026-07-19-auth-errors-v1220',
    '/js/skip-control.js?v=2026-07-19-action-parity-v1',
    '/js/player-alert-client.js?v=2026-06-25-hardlock1',
    '/js/messenger-overlay.js?v=2026-07-19-overlay-status-v2',
    '/js/addons/discord-player-addon-v3.js?v=2026-07-19-overlay-status-v51',
    'S666SkipControl.skip',
    'S666DiscordPlayerAddonV3.messagePost',
    'S666Messenger.open',
]:
    if required not in worker:
        raise SystemExit(f'missing Internal parity marker: {required}')

if 'Admin-Passwort für den Discord Shooter' in worker:
    raise SystemExit('Internal Discord password gate must not exist')

write('worker.js', worker)
write('workers/webradio-666soundsdesign-worker/worker.js', worker)


test_path = 'tests/worker-smoke.test.mjs'
tests = read(test_path)
old_assertions = '''  assert.match(internalHtml, /666SOUNDsDESIGn RADIO/);
  assert.match(internalHtml, /LYVRA DJ/);
  assert.match(internalHtml, /veluna-ui\.js/);
  assert.match(internalHtml, /id="reconnectBtn"/);'''
new_assertions = '''  assert.match(internalHtml, /666SOUNDsDESIGn RADIO/);
  assert.match(internalHtml, /LYVRA DJ/);
  assert.match(internalHtml, /data-veluna-page="internal"/);
  assert.match(internalHtml, /veluna-ui\.js/);
  assert.match(internalHtml, /id="reconnectBtn"/);
  assert.match(internalHtml, /id="skipBtn"/);
  assert.match(internalHtml, /id="discordBtn"/);
  assert.match(internalHtml, /id="internalMessageBtn"/);
  assert.match(internalHtml, /admin-auth-client\.js/);
  assert.match(internalHtml, /skip-control\.js\?v=2026-07-19-action-parity-v1/);
  assert.match(internalHtml, /player-alert-client\.js/);
  assert.match(internalHtml, /messenger-overlay\.js/);
  assert.match(internalHtml, /discord-player-addon-v3\.js\?v=2026-07-19-overlay-status-v51/);
  assert.match(internalHtml, /S666SkipControl\.skip/);
  assert.match(internalHtml, /S666DiscordPlayerAddonV3\.messagePost/);
  assert.match(internalHtml, /S666Messenger\.open/);
  assert.doesNotMatch(internalHtml, /Admin-Passwort für den Discord Shooter/);'''
tests = replace_once(tests, old_assertions, new_assertions, 'Internal worker smoke contract')
write(test_path, tests)

print('Internal player action parity repair applied')
