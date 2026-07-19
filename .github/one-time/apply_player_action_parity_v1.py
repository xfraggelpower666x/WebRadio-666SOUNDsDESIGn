from pathlib import Path
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def sub_once(pattern, replacement, text, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return updated


# ---------------------------------------------------------------------------
# 1) Central Skip controller owns the one interactive auth prompt + fallback.
# ---------------------------------------------------------------------------
skip = read('js/skip-control.js')
skip = skip.replace(
    ' * UI is owned by player-stage-v2; this module owns the protected API request.',
    ' * All players delegate interactive auth and the protected API request to this module.',
    1,
)
if 'async function ensureInteractiveAuth(options)' not in skip:
    skip = sub_once(
        r"  async function check\(force\) \{",
        """  async function ensureInteractiveAuth(options) {
    options = options || {};
    if (!window.S666AdminAuth || typeof window.S666AdminAuth.ensure !== 'function') {
      throw new Error('admin_auth_client_missing');
    }
    return window.S666AdminAuth.ensure({
      message: options.prompt || 'Admin-Passwort für Auto-DJ Skip eingeben:'
    });
  }

  async function check(force) {""",
        skip,
        'skip auth owner insertion',
    )
skip = sub_once(
    r"    inFlight = true;\n    dispatch\(\{ phase: 'sending' \}\);\n    try \{\n      var payload = \{ source: options\.source \|\| 'player-stage-v2' \};",
    """    inFlight = true;
    dispatch({ phase: 'auth' });
    try {
      if (options.ensureAuth !== false) await ensureInteractiveAuth(options);
      dispatch({ phase: 'sending' });
      var payload = { source: options.source || 'player-stage-v2' };""",
    skip,
    'skip centralized auth flow',
)
skip = sub_once(
    r"  window\.S666SkipControl = \{\n    check: check,\n    skip: skip,",
    """  window.S666SkipControl = {
    check: check,
    ensure: ensureInteractiveAuth,
    skip: skip,""",
    skip,
    'skip public controller export',
)
write('js/skip-control.js', skip)
write('public/js/skip-control.js', skip)


# ---------------------------------------------------------------------------
# 2) Main + /internal: Discord opens publicly; Skip delegates to controller.
# ---------------------------------------------------------------------------
stage = read('js/player-stage-v2.js')
replacement = """  async function openDiscordShooter(){
    try{
      if(window.S666DiscordPlayerAddonV3&&typeof window.S666DiscordPlayerAddonV3.messagePost==='function'){
        await window.S666DiscordPlayerAddonV3.messagePost();
        toast('Discord Shooter geöffnet.');
      }else{
        throw new Error('discord_addon_not_ready');
      }
    }catch(e){
      toast(e&&e.message?e.message:'Discord Shooter ist nicht bereit.','error');
    }
  }

  async function requestSkip(){
    if(!confirm('Aktuellen Auto-DJ-Titel wirklich überspringen?'))return false;
    if(!window.S666SkipControl||typeof window.S666SkipControl.skip!=='function'){
      toast('Auto-DJ Skip ist nicht bereit.','error');
      return false;
    }
    var result=await window.S666SkipControl.skip({
      source:'player-stage-v2',
      prompt:'Admin-Passwort für Auto-DJ Skip eingeben:'
    });
    if(result&&result.ok)toast('AUTO-DJ SKIP ausgeführt.');
    else toast(result&&result.error?result.error:'Auto-DJ Skip abgelehnt.','error');
    return !!(result&&result.ok);
  }

"""
stage = sub_once(
    r"  function adminAuth\(\)[\s\S]*?\n  function makeButton",
    replacement + '  function makeButton',
    stage,
    'stage duplicated auth block removal',
    flags=re.S,
)
stage = stage.replace('protectedDiscord', 'openDiscordShooter')
stage = stage.replace('protectedSkip', 'requestSkip')
if 'S666AdminAuth' in stage or 'withGate(' in stage:
    raise SystemExit('stage still owns duplicated auth')
write('js/player-stage-v2.js', stage)
write('public/js/player-stage-v2.js', stage)


# ---------------------------------------------------------------------------
# 3) Discord addon contains no dead password/auth bridge.
# ---------------------------------------------------------------------------
addon = read('js/addons/discord-player-addon-v3.js')
addon = addon.replace(
    "var VERSION = 'V4.10-20260719-MESSENGER-STATUS-EMOJI-CLOSE';",
    "var VERSION = 'V4.11-20260719-PUBLIC-DISCORD-CENTRAL-SKIP';",
    1,
)
addon = sub_once(
    r"  /\*\n   \* Shared protected-action contract\.[\s\S]*?\n  async function postJson",
    '  async function postJson',
    addon,
    'discord dead auth bridge removal',
    flags=re.S,
)
if 'ensureInteractiveAuth' in addon or 'authorizedAdminFetch' in addon or 'S666AdminAuth.ensure' in addon:
    raise SystemExit('discord addon still contains password/auth bridge')
write('js/addons/discord-player-addon-v3.js', addon)
write('public/js/addons/discord-player-addon-v3.js', addon)


# ---------------------------------------------------------------------------
# 4) VELUNA: remove its private Skip request copy and use the controller.
# ---------------------------------------------------------------------------
veluna = read('veluna/index.html')
veluna = sub_once(
    r"const ENDPOINTS=\{main:'/stream',back:'/fallback-stream',metadata:'/api/nowplaying',runtime:'/api/runtime-config/status',skipStatus:'/api/skip/status',skip:'/api/admin/skip',discordManual:'/api/discord/manual',discordMessage:'/api/discord/message'\};",
    "const ENDPOINTS={main:'/stream',back:'/fallback-stream',metadata:'/api/nowplaying',runtime:'/api/runtime-config/status',discordManual:'/api/discord/manual',discordMessage:'/api/discord/message'};",
    veluna,
    'veluna private skip endpoints removal',
)
veluna = sub_once(
    r"\n    async function ensureAdmin\(message='Admin-Passwort eingeben:'\)\{[^\n]+\}",
    '',
    veluna,
    'veluna private ensureAdmin removal',
)
new_do_skip = """    async function doSkip(){
      activeSecureAction='skip';
      const restoreAudio=protectAudioDuringDialog();
      skipBtn.classList.add('is-busy');
      setAction('SKIP: zentraler WebRadio-Controller startet …','is-busy',skipBtn);
      try{
        if(!window.S666SkipControl||typeof window.S666SkipControl.skip!=='function')throw new Error('skip_controller_missing');
        const result=await window.S666SkipControl.skip({
          source:'veluna-lyvra-v1211',
          prompt:'Admin-Passwort für VELUNA Auto-DJ Skip eingeben:'
        });
        if(!result||result.ok!==true)throw new Error(result?.error||'skip_failed');
        setAction('SKIP OK: zentraler Controller bestätigt','is-ok',skipBtn);
        setTimeout(fetchMetadata,1500);
      }catch(err){
        setAction('SKIP FEHLER: '+describeError(err),'is-error',skipBtn);
      }finally{
        skipBtn.classList.remove('is-busy');
        restoreAudio();
        activeSecureAction='idle';
      }
    }
    function discordPayload"""
veluna = sub_once(
    r"    async function doSkip\(\)\{[\s\S]*?\n    function discordPayload",
    new_do_skip,
    veluna,
    'veluna centralized skip function',
    flags=re.S,
)
veluna = re.sub(
    r'/js/skip-control\.js\?v=[^"\s]+',
    '/js/skip-control.js?v=2026-07-19-action-parity-v1',
    veluna,
)
veluna = re.sub(
    r'/js/addons/discord-player-addon-v3\.js\?v=[^"\s]+',
    '/js/addons/discord-player-addon-v3.js?v=2026-07-19-overlay-status-v51',
    veluna,
)
if 'S666AdminAuth.fetch(ENDPOINTS.skip' in veluna or 'async function ensureAdmin' in veluna:
    raise SystemExit('veluna still owns duplicated skip auth/request logic')
if 'S666SkipControl.skip' not in veluna:
    raise SystemExit('veluna does not call shared skip controller')
for path in ['veluna/index.html', 'VELUNA/index.html', 'public/veluna/index.html', 'public/VELUNA/index.html']:
    write(path, veluna)


# ---------------------------------------------------------------------------
# 5) Main/public cache busts cover Main + /internal shared modules.
# ---------------------------------------------------------------------------
main = read('index.html')
for pattern, replacement_text, label in [
    (r'/js/skip-control\.js\?v=[^"\s]+', '/js/skip-control.js?v=2026-07-19-action-parity-v1', 'main skip cache'),
    (r'/js/player-stage-v2\.js\?v=[^"\s]+', '/js/player-stage-v2.js?v=2026-07-19-action-parity-v1', 'main stage cache'),
    (r'/js/addons/discord-player-addon-v3\.js\?v=[^"\s]+', '/js/addons/discord-player-addon-v3.js?v=2026-07-19-overlay-status-v51', 'main discord cache'),
]:
    main, count = re.subn(pattern, replacement_text, main)
    if count < 1:
        raise SystemExit(f'{label}: no cache reference found')
write('index.html', main)
write('public/index.html', main)


# ---------------------------------------------------------------------------
# 6) Update release contracts to enforce the centralized ownership.
# ---------------------------------------------------------------------------
tests = read('tests/frontend-contracts.test.mjs')
tests = sub_once(
    r'test\("Admin, Discord and Skip share one Bearer client", async \(\) => \{[\s\S]*?\n\}\);',
    """test("Skip owns interactive Bearer auth while Discord stays public", async () => {
  const auth = await read("js/admin-auth-client.js");
  const stage = await read("js/player-stage-v2.js");
  const skip = await read("js/skip-control.js");
  const discord = await read("js/addons/discord-player-addon-v3.js");
  const veluna = await read("veluna/index.html");
  assert.match(auth, /s666_admin_session_token_v1/);
  assert.match(auth, /authorization/);
  assert.match(skip, /S666AdminAuth\.ensure/);
  assert.match(skip, /S666AdminAuth\.fetch/);
  assert.match(stage, /S666SkipControl\.skip/);
  assert.match(veluna, /S666SkipControl\.skip/);
  assert.doesNotMatch(stage, /S666AdminAuth|withGate\(/);
  assert.doesNotMatch(stage, /Admin-Passwort für den Discord Shooter/);
  assert.doesNotMatch(veluna, /S666AdminAuth\.fetch\(ENDPOINTS\.skip|async function ensureAdmin/);
  assert.doesNotMatch(discord, /S666AdminAuth\.ensure|ensureInteractiveAuth|authorizedAdminFetch/);
  assert.doesNotMatch(discord, /x-discord-gate-code|DISCORD_GATE_CODE|gateCode/);
});""",
    tests,
    'primary action ownership contract',
    flags=re.S,
)
tests = sub_once(
    r'test\("VELUNA preserves canonical WebRadio Skip/Discord routes, protected modals, mobile sound panel, stability recovery and levelmeter", async \(\) => \{[\s\S]*?\n\}\);',
    """test("VELUNA delegates Skip centrally, keeps Discord public, and preserves sound/stability controls", async () => {
  const veluna = await read("VELUNA/index.html");
  const skip = await read("js/skip-control.js");
  assert.match(veluna, /id="skipBtn"/);
  assert.match(veluna, /S666SkipControl\.skip/);
  assert.match(skip, /\/api\/admin\/skip/);
  assert.match(skip, /\/api\/radio\/skip/);
  assert.doesNotMatch(veluna, /S666AdminAuth\.fetch\(ENDPOINTS\.skip|async function ensureAdmin/);
  assert.match(veluna, /id="discordBtn"/);
  assert.match(veluna, /S666DiscordPlayerAddonV3\?\.messagePost/);
  assert.doesNotMatch(veluna, /Admin-Passwort für VELUNA Discord Shooter/);
  assert.match(veluna, /s666:admin-auth-overlay/);
  assert.match(veluna, /id="soundPanel"/);
  assert.match(veluna, /SUB[\s\S]*LOW[\s\S]*MID[\s\S]*HIGH[\s\S]*AIR/);
  assert.match(veluna, /BOOST 0–5/);
  assert.match(veluna, /id="levelMeter"/);
  assert.match(veluna, /createMediaElementSource/);
  assert.match(veluna, /visibilitychange/);
  assert.match(veluna, /pageshow/);
  assert.match(veluna, /#soundBtn\{display:none\}/);
  assert.match(veluna, /source-led-btn/);
});""",
    tests,
    'veluna action parity contract',
    flags=re.S,
)
tests = sub_once(
    r"test\('all player actions use one interactive admin auth owner', async \(\) => \{[\s\S]*?\n\}\);",
    """test('all player variants use one Skip auth owner and a public Discord owner', async () => {
  const stage = await read('js/player-stage-v2.js');
  const skip = await read('js/skip-control.js');
  const discord = await read('js/addons/discord-player-addon-v3.js');
  const veluna = await read('veluna/index.html');
  assert.match(skip, /function ensureInteractiveAuth\(options\)/);
  assert.match(skip, /S666AdminAuth\.ensure/);
  assert.match(skip, /S666AdminAuth\.fetch/);
  assert.match(stage, /S666SkipControl\.skip/);
  assert.match(veluna, /S666SkipControl\.skip/);
  assert.doesNotMatch(stage, /function withGate\(|S666AdminAuth/);
  assert.doesNotMatch(discord, /ensureInteractiveAuth|S666AdminAuth\.ensure|admin_session_required/);
});""",
    tests,
    'final centralized owner contract',
    flags=re.S,
)
write('tests/frontend-contracts.test.mjs', tests)

print('player action parity repair applied')
