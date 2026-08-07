from pathlib import Path

addon_paths = [Path('js/addons/discord-player-addon-v3.js'), Path('public/js/addons/discord-player-addon-v3.js')]
source = addon_paths[0].read_text(encoding='utf-8')

replacements = [
    ("Discord transport defaults to direct browser-to-webhook delivery with three locally stored categories.", "Discord transport defaults to the verified same-origin Worker routes with server-side webhook secrets."),
    ("Webhook URLs never enter the repository, events, logs or payload diagnostics. Worker transport remains explicit legacy fallback only.", "Webhook URLs remain server-side in Worker secrets. Direct local transport is retained only as an explicit emergency fallback."),
    ("Repair v5.0: restore direct startup Now Playing, three-category shooter and local target migration.", "Repair v5.1: restore verified July Worker transport while preserving modern lifecycle, timeout and remount repairs."),
    ("var VERSION = 'V5.0-20260806-DIRECT-LOCAL-THREE-CATEGORY';", "var VERSION = 'V5.1-20260807-WORKER-RESTORE-LIVE-JULY';"),
    ("return clean(runtimeConfig().transport || 'direct', 24).toLowerCase() === 'worker' ? 'worker' : 'direct';", "return clean(runtimeConfig().transport || 'worker', 24).toLowerCase() === 'direct' ? 'direct' : 'worker';"),
    ("      if (transportMode() !== 'direct') return;\n", ""),
    ("    if (transportMode() === 'direct' && !force && !directPlaybackStarted) return { ok: true, skipped: true, reason: 'audio_not_playing' };", "    if (!force && !directPlaybackStarted) return { ok: true, skipped: true, reason: 'audio_not_playing' };"),
    ("    if (transportMode() === 'direct' && !directPlaybackStarted) return;", "    if (!directPlaybackStarted) return;"),
    ("directLocalTransport: true,", "workerTransportDefault: true,\n    directLocalTransport: false,"),
    ("threePostingCategories: true,", "threePostingCategories: false,"),
    ("directTarget: settings.selectedTarget", "directTarget: transportMode() === 'direct' ? settings.selectedTarget : undefined"),
    ("if (DIRECT_CATEGORY_IDS.indexOf(String(directTarget || '')) >= 0) data.directTarget = String(directTarget);", "if (transportMode() === 'direct' && DIRECT_CATEGORY_IDS.indexOf(String(directTarget || '')) >= 0) data.directTarget = String(directTarget);")
]

for old, new in replacements:
    if old not in source:
        raise SystemExit('expected addon pattern missing: ' + old)
    source = source.replace(old, new)

marker = "    document.body.appendChild(overlay);\n    bindDiscordMessageOverlay(overlay);"
worker_ui = """    document.body.appendChild(overlay);
    if (transportMode() !== 'direct') {
      var directTargetRow = overlay.querySelector('.s666-discord-target-row');
      var directSettingsPanel = document.getElementById('s666DiscordDirectSettings');
      if (directTargetRow && directTargetRow.parentNode) directTargetRow.parentNode.removeChild(directTargetRow);
      if (directSettingsPanel && directSettingsPanel.parentNode) directSettingsPanel.parentNode.removeChild(directSettingsPanel);
      var workerNote = document.createElement('div');
      workerNote.className = 's666-discord-settings-note';
      workerNote.textContent = 'Serverseitiger Discord Shooter · Ziele bleiben geschützt im Worker';
      var workerTextArea = document.getElementById('s666DiscordMessageText');
      if (workerTextArea && workerTextArea.parentNode) workerTextArea.parentNode.insertBefore(workerNote, workerTextArea);
    }
    bindDiscordMessageOverlay(overlay);"""
if marker not in source:
    raise SystemExit('overlay insertion marker missing')
source = source.replace(marker, worker_ui)

if "runtimeConfig().transport || 'direct'" in source:
    raise SystemExit('direct default still present')
if "if (transportMode() !== 'direct') return;" in source:
    raise SystemExit('playing bridge still direct-only')
if "workerTransportDefault: true" not in source:
    raise SystemExit('worker default export missing')

for path in addon_paths:
    path.write_text(source, encoding='utf-8')

html_paths = [Path('index.html'), Path('public/index.html'), Path('VELUNA/index.html'), Path('veluna/index.html'), Path('public/VELUNA/index.html'), Path('public/veluna/index.html')]
old_cache = 'discord-player-addon-v3.js?v=2026-08-06-direct-local-v1'
new_cache = 'discord-player-addon-v3.js?v=2026-08-07-worker-restore-v1'
for path in html_paths:
    text = path.read_text(encoding='utf-8')
    if old_cache not in text:
        raise SystemExit('cache marker missing: ' + str(path))
    path.write_text(text.replace(old_cache, new_cache), encoding='utf-8')

test_path = Path('tests/direct-discord-runtime-owner-repair.test.mjs')
test_text = test_path.read_text(encoding='utf-8')
start = test_text.index("test('Discord shooter defaults to direct local transport")
end = test_text.index("test('Canonical visualizer adopts or registers one central graph")
replacement_tests = """test('Discord shooter restores verified Worker transport as default', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.equal(await read('public/js/addons/discord-player-addon-v3.js'), addon);
  assert.match(addon, /V5\\.1-20260807-WORKER-RESTORE-LIVE-JULY/);
  assert.match(addon, /runtimeConfig\\(\\)\\.transport \\|\\| 'worker'/);
  assert.match(addon, /=== 'direct' \\? 'direct' : 'worker'/);
  assert.match(addon, /\\/api\\/discord\\/message/);
  assert.match(addon, /\\/api\\/discord\\/manual/);
  assert.match(addon, /\\/api\\/discord\\/nowplaying/);
  assert.match(addon, /\\/api\\/discord\\/status/);
  assert.match(addon, /Serverseitiger Discord Shooter/);
  assert.match(addon, /workerTransportDefault: true/);
  assert.match(addon, /directLocalTransport: false/);
  assert.match(addon, /threePostingCategories: false/);
  assert.doesNotMatch(addon, /https:\\/\\/discord(?:app)?\\.com\\/api\\/webhooks\\/\\d+\\/[A-Za-z0-9._-]{10,}/);
});

test('Worker Now Playing waits for real audio playing while direct remains explicit fallback', async () => {
  const addon = await read('js/addons/discord-player-addon-v3.js');
  assert.match(addon, /document\\.addEventListener\\('playing', onPlaying, true\\)/);
  assert.match(addon, /if \\(!force && !directPlaybackStarted\\) return \\{ ok: true, skipped: true, reason: 'audio_not_playing' \\}/);
  assert.match(addon, /if \\(!directPlaybackStarted\\) return;/);
  assert.match(addon, /credentials: 'same-origin'/);
  assert.match(addon, /transportMode\\(\\) === 'direct'/);
  assert.match(addon, /directTarget: transportMode\\(\\) === 'direct' \\? settings\\.selectedTarget : undefined/);
});

"""
test_path.write_text(test_text[:start] + replacement_tests + test_text[end:], encoding='utf-8')

veluna_test = Path('tests/veluna-targeted-mobile-repair.test.mjs')
vt = veluna_test.read_text(encoding='utf-8')
if '2026-08-06-direct-local-v1' not in vt:
    raise SystemExit('VELUNA test cache marker missing')
veluna_test.write_text(vt.replace('2026-08-06-direct-local-v1', '2026-08-07-worker-restore-v1'), encoding='utf-8')
