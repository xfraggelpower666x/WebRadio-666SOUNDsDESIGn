from pathlib import Path

ROOT = Path('.')

CLIENT_PATHS = [
    Path('js/player-alert-client.js'),
    Path('public/js/player-alert-client.js'),
]
THEME_PATHS = [
    Path('css/veluna-theme.css'),
    Path('public/css/veluna-theme.css'),
]
DISCORD_PATHS = [
    Path('js/addons/discord-player-addon-v3.js'),
    Path('public/js/addons/discord-player-addon-v3.js'),
]
REFERENCE_PATHS = [
    Path('index.html'),
    Path('public/index.html'),
    Path('veluna/index.html'),
    Path('VELUNA/index.html'),
    Path('public/veluna/index.html'),
    Path('public/VELUNA/index.html'),
    Path('worker.js'),
    Path('workers/webradio-666soundsdesign-worker/worker.js'),
]


def require_replace(text: str, old: str, new: str, label: str, count: int = 1) -> str:
    found = text.count(old)
    if found != count:
        raise RuntimeError(f'{label}: expected {count} occurrence(s), found {found}')
    return text.replace(old, new)


def repair_client(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    if 'PLAYER_MESSAGE_OVERLAY_INERT_V1' in text:
        return

    text = require_replace(
        text,
        "  var state = { inFlight: false, lastSeen: '', timer: 0, stopped: false };\n",
        "  var state = { inFlight: false, lastSeen: '', timer: 0, stopped: false };\n\n"
        "  // PLAYER_MESSAGE_OVERLAY_INERT_V1 — closed means visually hidden and unable to capture touch.\n"
        "  function setReceiveOverlayOpen(backdrop, open) {\n"
        "    if (!backdrop) return;\n"
        "    var visible = open === true;\n"
        "    backdrop.classList.toggle('is-open', visible);\n"
        "    backdrop.hidden = !visible;\n"
        "    backdrop.setAttribute('aria-hidden', visible ? 'false' : 'true');\n"
        "    if (visible) backdrop.removeAttribute('inert'); else backdrop.setAttribute('inert', '');\n"
        "    backdrop.style.setProperty('display', visible ? 'flex' : 'none', 'important');\n"
        "    backdrop.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');\n"
        "    backdrop.style.setProperty('pointer-events', visible ? 'auto' : 'none', 'important');\n"
        "  }\n",
        f'{path}: state anchor',
    )
    text = require_replace(
        text,
        "    var backdrop = document.getElementById('playerAlertReceiveBackdrop');\n    if (backdrop) return backdrop;",
        "    var backdrop = document.getElementById('playerAlertReceiveBackdrop');\n"
        "    if (backdrop) {\n"
        "      if (!backdrop.classList.contains('is-open')) setReceiveOverlayOpen(backdrop, false);\n"
        "      return backdrop;\n"
        "    }",
        f'{path}: existing overlay guard',
    )
    text = require_replace(
        text,
        "    document.body.appendChild(backdrop);\n    function close() {\n      backdrop.classList.remove('is-open');\n      backdrop.setAttribute('aria-hidden', 'true');\n    }",
        "    document.body.appendChild(backdrop);\n"
        "    setReceiveOverlayOpen(backdrop, false);\n"
        "    function close() {\n"
        "      setReceiveOverlayOpen(backdrop, false);\n"
        "    }",
        f'{path}: close behavior',
    )
    text = require_replace(
        text,
        "    backdrop.classList.add('is-open');\n    backdrop.setAttribute('aria-hidden', 'false');",
        "    setReceiveOverlayOpen(backdrop, true);",
        f'{path}: show behavior',
    )
    text = require_replace(
        text,
        "    version: '1.2.0',",
        "    version: '1.2.1-overlay-inert',",
        f'{path}: exported version',
    )
    path.write_text(text, encoding='utf-8')


def repair_theme(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    if 'PLAYER MESSAGE OVERLAY INERT AUTHORITY v1.2.26' in text:
        return
    text = text.replace('VELUNA Central Player Theme v1.2.25', 'VELUNA Central Player Theme v1.2.26')
    broad_count = text.count(',[role="dialog"]')
    if broad_count < 2:
        raise RuntimeError(f'{path}: expected broad role dialog selectors, found {broad_count}')
    text = text.replace(',[role="dialog"]', '')
    text += """

/* ========================================================================
   PLAYER MESSAGE OVERLAY INERT AUTHORITY v1.2.26
   Only the backdrop owns fullscreen geometry. The inner role=dialog box is
   never promoted to a viewport layer. A closed message cannot capture touch.
   ======================================================================== */
#playerAlertReceiveBackdrop,
body[data-veluna-ui] #playerAlertReceiveBackdrop{
  position:fixed!important;
  inset:0!important;
  z-index:2147483600!important;
  align-items:center!important;
  justify-content:center!important;
  padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))!important;
  background:rgba(0,0,0,.72)!important;
  backdrop-filter:blur(8px)!important;
  -webkit-backdrop-filter:blur(8px)!important;
}
#playerAlertReceiveBackdrop[hidden],
#playerAlertReceiveBackdrop[aria-hidden="true"],
#playerAlertReceiveBackdrop:not(.is-open){
  display:none!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;
}
#playerAlertReceiveBackdrop.is-open[aria-hidden="false"]{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
}
#playerAlertReceiveBackdrop .player-alert-modal{
  position:relative!important;
  inset:auto!important;
  width:min(520px,calc(100vw - 32px))!important;
  min-width:0!important;
  max-width:520px!important;
  height:auto!important;
  min-height:0!important;
  max-height:min(82dvh,620px)!important;
  margin:0!important;
  padding:18px!important;
  overflow:auto!important;
  border:1px solid rgba(22,139,255,.72)!important;
  border-radius:20px!important;
  background:linear-gradient(135deg,rgba(180,92,255,.16),rgba(22,139,255,.10)),rgba(4,8,24,.98)!important;
  box-shadow:0 0 8px rgba(126,220,255,.88),0 0 26px rgba(22,139,255,.44),0 0 24px rgba(180,92,255,.26)!important;
  pointer-events:auto!important;
  transform:none!important;
}
"""
    path.write_text(text, encoding='utf-8')


def repair_discord(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = text.replace("V4.11-20260719-PUBLIC-DISCORD-CENTRAL-SKIP", "V4.12-20260719-PLAYER-MESSAGE-OVERLAY-INERT")
    changed = text.replace('/js/player-alert-client.js?v=2026-07-15-veluna-msg', '/js/player-alert-client.js?v=2026-07-19-overlay-inert-v121')
    if changed == text:
        raise RuntimeError(f'{path}: dynamic Player Alert client cache reference missing')
    path.write_text(changed, encoding='utf-8')


def repair_references(path: Path) -> None:
    text = path.read_text(encoding='utf-8')
    text = text.replace('/js/player-alert-client.js?v=2026-06-25-hardlock1', '/js/player-alert-client.js?v=2026-07-19-overlay-inert-v121')
    text = text.replace('/js/addons/discord-player-addon-v3.js?v=2026-07-19-overlay-status-v51', '/js/addons/discord-player-addon-v3.js?v=2026-07-19-overlay-inert-v52')
    text = text.replace('/css/veluna-theme.css?v=2026-07-19-touch-feedback-v1225', '/css/veluna-theme.css?v=2026-07-19-overlay-inert-v1226')
    path.write_text(text, encoding='utf-8')


def append_tests() -> None:
    path = Path('tests/frontend-contracts.test.mjs')
    text = path.read_text(encoding='utf-8')
    marker = 'player message overlay is inert when closed and inner dialogs never own viewport geometry'
    if marker not in text:
        text += """


test("player message overlay is inert when closed and inner dialogs never own viewport geometry", async () => {
  const client = await read("js/player-alert-client.js");
  const theme = await read("css/veluna-theme.css");
  const discord = await read("js/addons/discord-player-addon-v3.js");
  assert.match(client, /PLAYER_MESSAGE_OVERLAY_INERT_V1/);
  assert.match(client, /backdrop\.hidden = !visible/);
  assert.match(client, /setReceiveOverlayOpen\(backdrop, false\)/);
  assert.match(client, /pointer-events[^\n]*none/);
  assert.doesNotMatch(theme, /\[role=["']dialog["']\]/);
  assert.match(theme, /#playerAlertReceiveBackdrop\[aria-hidden="true"\]/);
  assert.match(theme, /#playerAlertReceiveBackdrop \.player-alert-modal/);
  assert.match(discord, /overlay-inert-v121/);
});
"""
        path.write_text(text, encoding='utf-8')

    path = Path('tests/worker-smoke.test.mjs')
    text = path.read_text(encoding='utf-8')
    marker = 'internal player serves the inert Player Message overlay authorities'
    if marker not in text:
        text += """


test("internal player serves the inert Player Message overlay authorities", async () => {
  const response = await request("/internal", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /player-alert-client\.js\?v=2026-07-19-overlay-inert-v121/);
  assert.match(html, /discord-player-addon-v3\.js\?v=2026-07-19-overlay-inert-v52/);
  assert.match(html, /veluna-theme\.css\?v=2026-07-19-overlay-inert-v1226/);
});
"""
        path.write_text(text, encoding='utf-8')


for file_path in CLIENT_PATHS:
    repair_client(ROOT / file_path)
for file_path in THEME_PATHS:
    repair_theme(ROOT / file_path)
for file_path in DISCORD_PATHS:
    repair_discord(ROOT / file_path)
for file_path in REFERENCE_PATHS:
    repair_references(ROOT / file_path)
append_tests()

if (ROOT / 'js/player-alert-client.js').read_bytes() != (ROOT / 'public/js/player-alert-client.js').read_bytes():
    raise RuntimeError('Player Alert client mirror drift')
if (ROOT / 'css/veluna-theme.css').read_bytes() != (ROOT / 'public/css/veluna-theme.css').read_bytes():
    raise RuntimeError('VELUNA theme mirror drift')
if (ROOT / 'js/addons/discord-player-addon-v3.js').read_bytes() != (ROOT / 'public/js/addons/discord-player-addon-v3.js').read_bytes():
    raise RuntimeError('Discord addon mirror drift')
if (ROOT / 'worker.js').read_bytes() != (ROOT / 'workers/webradio-666soundsdesign-worker/worker.js').read_bytes():
    raise RuntimeError('Worker mirror drift')

print('PLAYER_MESSAGE_OVERLAY_INERT_V1_APPLIED')
