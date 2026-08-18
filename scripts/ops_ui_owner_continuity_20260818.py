from pathlib import Path
import re

ROOT = Path('.')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str, flags=0) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 replacement, got {count}')
    return updated


def write_pair(path: str, text: str) -> None:
    root = ROOT / path
    mirror = ROOT / 'public' / path
    root.write_text(text, encoding='utf-8')
    mirror.write_text(text, encoding='utf-8')


def repair_phase10() -> None:
    path = ROOT / 'js/phase10-stability-iphone-panel-hud.js'
    text = path.read_text(encoding='utf-8')

    replacement = '''    function boot(){
      // UI-OWNER-HARDLOCK 2026-08-18:
      // Phase10 bleibt Stabilitaets-/Recovery-Sensor. Kanonische Player-UI, Ticker,
      // Side-Meter und mobile Bottom-Meter werden hier nicht mehr umgebaut.
      hardfixInstallManualBackupFlag();
      startIphoneAudioStabilityGuardV2();
      installPcMainBackupGuard();
      directfixPcNoAutoFallback();
      bindMobileStreamLedSwitch();
      installAudioFocusGuard();
      normalizeBoostStatusTooltip();
      document.documentElement.setAttribute("data-phase10-ui-owner","canonical-player-stage");
      document.documentElement.setAttribute("data-phase10-stability", VERSION);
    }'''

    text = regex_once(
        text,
        r'    function boot\(\)\{\n.*?\n    document\.documentElement\.setAttribute\("data-phase10-stability", VERSION\);\n  \}',
        replacement,
        'phase10 boot owner hardlock',
        flags=re.S,
    )

    start = text.index('    function boot(){')
    end = text.index('\n\n  window.S666Phase10', start)
    boot = text[start:end]
    forbidden = [
        'mountHudLogo()', 'uiFinetuneV1()', 'iphonePcParityV1()', 'forcedUiApplyV1()',
        'startSideMeterReactV1()', 'directfixRestoreStatusLeds()', 'directfixTickerAndMessage()',
        'phase10RelocatePcPanels()', 'mountMobilePanelRow()', 'mountBottomSafe()'
    ]
    for token in forbidden:
        if token in boot:
            raise SystemExit(f'phase10 boot still owns UI mutation: {token}')
    for required in ['startIphoneAudioStabilityGuardV2()', 'installAudioFocusGuard()', 'bindMobileStreamLedSwitch()']:
        if required not in boot:
            raise SystemExit(f'phase10 stability call lost: {required}')

    write_pair('js/phase10-stability-iphone-panel-hud.js', text)


def repair_index() -> None:
    path = ROOT / 'index.html'
    text = path.read_text(encoding='utf-8')

    text = regex_once(
        text,
        r'\n\s*<a id="playerDesignSwitch" class="player-design-switch" href="/veluna" aria-label="Zum VELUNA Player wechseln">VELUNA PLAYER</a>\n',
        '\n',
        'remove VELUNA button from lower console',
    )

    text = regex_once(
        text,
        r'(<button id="statusGovee" class="status-chip led-state state-empty" type="button" title="GOVEE / FX — Lichtsteuerung Status"><span class="status-dot"></span><span class="status-code">GOV</span></button>)',
        r'\1\n            <a id="playerDesignSwitch" class="status-chip player-design-switch player-design-switch-top" href="/veluna" aria-label="Zum VELUNA Player wechseln" title="VELUNA Player öffnen"><span class="status-code">VELUNA</span></a>',
        'move VELUNA button into top panel',
    )

    text = regex_once(
        text,
        r'\n\s*<div class="timeline-wrap desktop-only">\n\s*<div class="time-chip" id="currentTimeText">0:00</div>\n\s*<div class="timeline-bar">\n\s*<div id="timelineProgress" class="timeline-progress"></div>\n\s*</div>\n\s*<div class="time-chip" id="durationText">LIVE</div>\n\s*</div>\n',
        '\n',
        'remove non-applicable live runtime timeline from radio console',
    )

    if '<footer><span>DNA PULSE</span><b>85%</b></footer>' not in text:
        raise SystemExit('static DNA PULSE 85% marker not found')
    text = text.replace('<footer><span>DNA PULSE</span><b>85%</b></footer>', '<footer><span>DNA PULSE</span><b>0%</b></footer>', 1)

    if 'timeline-wrap desktop-only' in text or 'id="durationText">LIVE' in text:
        raise SystemExit('radio timeline still present')
    if text.count('id="playerDesignSwitch"') != 1:
        raise SystemExit('VELUNA navigation must remain exactly once')

    write_pair('index.html', text)


def repair_player_stage_js() -> None:
    path = ROOT / 'js/player-stage-v2.js'
    text = path.read_text(encoding='utf-8')
    text = text.replace('666SOUNDsDESIGn Player Stage V11.', '666SOUNDsDESIGn Player Stage V12.', 1)

    if 'function bindSystemPanelActions()' in text:
        raise SystemExit('system panel actions already installed unexpectedly')

    insertion = r'''  function setPanelChipState(button,state){
    if(!button)return;
    ['state-empty','state-off','state-ok','state-warn','state-error','state-main','state-api','state-external','state-backup'].forEach(function(name){button.classList.remove(name);});
    button.classList.add(state||'state-empty');
  }

  function openAdminPanel(){
    if(window.FPAdminOverlay&&typeof window.FPAdminOverlay.open==='function'){window.FPAdminOverlay.open();return true;}
    if(window.S666AdminOverlay&&typeof window.S666AdminOverlay.open==='function'){window.S666AdminOverlay.open();return true;}
    var trigger=q('#fp-admin-button,#fp-admin-open,.fp-admin-open,[data-admin-open],#adminButton,#adminBtn');
    if(trigger&&typeof trigger.click==='function'){trigger.click();return true;}
    toast('Admin-Panel ist nicht bereit.','error');return false;
  }

  async function toggleGoveePanel(){
    try{
      var runtime=window.S666GoveeSync;
      if(!runtime||typeof runtime.setEnabled!=='function')throw new Error('govee_runtime_not_ready');
      var current=typeof runtime.getState==='function'?runtime.getState():null;
      var next=!(current&&current.enabled===true);
      await runtime.setEnabled(next);
      toast('GOVEE / FX '+(next?'EIN':'AUS'));
      return next;
    }catch(error){toast(error&&error.message?error.message:'GOVEE / FX ist nicht bereit.','error');return false;}
  }

  function bindPanelButton(id,handler){
    var button=q('#'+id);if(!button||button.__s666PanelBound)return;
    button.__s666PanelBound=true;
    button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();handler(button);});
  }

  function bindSystemPanelActions(){
    bindPanelButton('statusStream',function(){var audio=q('#radio')||q('audio');toast(audio&&!audio.paused?'STREAM: PLAY':'STREAM: READY');});
    bindPanelButton('statusBuffer',function(){var audio=q('#radio')||q('audio');var seconds=0;try{if(audio&&audio.buffered&&audio.buffered.length)seconds=Math.max(0,audio.buffered.end(audio.buffered.length-1)-audio.currentTime);}catch(_){}toast('BUFFER: '+seconds.toFixed(1)+' s');});
    bindPanelButton('statusSource',function(){var audio=q('#radio')||q('audio');var src=String(audio&&(audio.currentSrc||audio.getAttribute('src'))||'');toast(/fallback|backup/i.test(src)?'SOURCE: BACKUP':'SOURCE: MAIN');});
    bindPanelButton('statusMeta',function(){var meta=state.metadata.title?state.metadata:readDomMetadata();toast(meta.title?'META: '+meta.title:'META: WAIT');});
    bindPanelButton('statusWorker',async function(button){try{var response=await fetch('/health?t='+Date.now(),{cache:'no-store',credentials:'same-origin'});setPanelChipState(button,response.ok?'state-ok':'state-error');toast(response.ok?'WORKER: ONLINE':'WORKER: ERROR',response.ok?'':'error');}catch(error){setPanelChipState(button,'state-error');toast('WORKER: OFFLINE','error');}});
    bindPanelButton('statusAudio',function(){var audio=q('#radio')||q('audio');var ctx=window.__mffAudioContext||window.__radioAudioContext||window.__smfpAudioContext;toast('AUDIO: '+(audio&&!audio.paused?'PLAY':'READY')+' · '+(ctx&&ctx.state?ctx.state.toUpperCase():'MEDIA'));});
    bindPanelButton('statusWatchdog',function(){var root=document.documentElement;var stateName=root.getAttribute('data-central-audio-stability-v2')||'READY';var reason=root.getAttribute('data-central-audio-reason')||'';toast('WATCHDOG: '+stateName.toUpperCase()+(reason?' · '+reason:''));});
    bindPanelButton('statusReconnect',function(){var button=q('#reconnectBtn');if(button&&typeof button.click==='function'){button.click();toast('RECONNECT ausgelöst.');}else toast('Reconnect ist nicht bereit.','error');});
    bindPanelButton('statusMeter',function(){var bus=window.__MeterBus||{};var fresh=bus.ts&&Date.now()-Number(bus.ts)<1000;toast(fresh?'METER: '+Math.round(clamp(bus.level,0,1)*100)+'% · PEAK '+Math.round(clamp(bus.peak||0,0,1)*100)+'%':'METER: WAIT');});
    bindPanelButton('statusDiscord',function(){openDiscordShooter();});
    bindPanelButton('statusAdmin',function(){openAdminPanel();});
    bindPanelButton('statusGovee',function(){toggleGoveePanel();});
  }

  function addonStorageKey(side){return 's666_'+side+'_addon_fx';}
  function initialAddonState(side){try{return localStorage.getItem(addonStorageKey(side))!=='off';}catch(_){return true;}}
  function syncAddonLayoutMode(){
    var leftOff=document.body.classList.contains('pc-left-addon-off');
    var rightOff=document.body.classList.contains('pc-right-addon-off');
    document.body.classList.toggle('pc-single-addon-off',leftOff!==rightOff);
    document.body.classList.toggle('pc-both-addons-off',leftOff&&rightOff);
  }
  function applyAddonFx(side,on,persist){
    var offClass=side==='left'?'pc-left-addon-off':'pc-right-addon-off';
    var button=q(side==='left'?'#pcLeftFxToggle':'#pcRightFxToggle');
    var label=q(side==='left'?'#pcLeftFxState':'#pcRightFxState');
    document.body.classList.toggle(offClass,!on);
    document.documentElement.setAttribute('data-s666-'+side+'-fx',on?'on':'off');
    if(button){button.classList.toggle('is-on',on);button.setAttribute('aria-pressed',on?'true':'false');}
    if(label)label.textContent=on?'ON':'OFF';
    if(persist){try{localStorage.setItem(addonStorageKey(side),on?'on':'off');}catch(_){}}
    syncAddonLayoutMode();
  }
  function bindAddonFxToggles(){
    var left=q('#pcLeftFxToggle');var right=q('#pcRightFxToggle');
    if(left&&!left.__s666FxBound){left.__s666FxBound=true;applyAddonFx('left',initialAddonState('left'),false);left.addEventListener('click',function(){applyAddonFx('left',!left.classList.contains('is-on'),true);});}
    if(right&&!right.__s666FxBound){right.__s666FxBound=true;applyAddonFx('right',initialAddonState('right'),false);right.addEventListener('click',function(){applyAddonFx('right',!right.classList.contains('is-on'),true);});}
  }

'''

    text = replace_once(text, '  function installTouchFeedback(){', insertion + '  function installTouchFeedback(){', 'insert canonical panel/addon actions')

    old_setbars = "  function setBars(selector,values,prefix,attack,release){\n    qa(selector).forEach(function(element,index){var value=smooth(prefix+index,values[index%values.length]||0,attack,release);element.style.height=(5+value*93).toFixed(1)+'%';element.style.opacity=(.24+value*.76).toFixed(2);element.style.filter='brightness('+(1+value*.52).toFixed(2)+') saturate('+(1+value*.66).toFixed(2)+')';element.dataset.level=value.toFixed(3);});\n  }"
    new_setbars = "  function setBars(selector,values,prefix,attack,release){\n    qa(selector).forEach(function(element,index){var value=smooth(prefix+index,values[index%values.length]||0,attack,release);var visual=Math.pow(clamp(value,0,1),1.18);element.style.height=(5+visual*93).toFixed(1)+'%';element.style.opacity=(.24+visual*.72).toFixed(2);element.style.filter='brightness('+(1+visual*.42).toFixed(2)+') saturate('+(1+visual*.54).toFixed(2)+')';element.dataset.level=visual.toFixed(3);});\n  }"
    text = replace_once(text, old_setbars, new_setbars, 'calm DNA/reactive side graphics')

    text = replace_once(
        text,
        '  function normalizeUi(){ensureActionButtons();ensureMainHeader();renderDesktopNowPlaying();renderMobileNowPlaying();}',
        '  function normalizeUi(){ensureActionButtons();bindSystemPanelActions();bindAddonFxToggles();ensureMainHeader();renderDesktopNowPlaying();renderMobileNowPlaying();}',
        'bind canonical panel and addon owners',
    )

    write_pair('js/player-stage-v2.js', text)


def repair_equalizer() -> None:
    path = ROOT / 'js/equalizer.js'
    text = path.read_text(encoding='utf-8')
    replacements = [
        ('const visualVolumeScale = Math.pow(volume, 0.85);', 'const visualVolumeScale = Math.pow(volume, 1.15);', 'volume visual headroom'),
        ('const visualTilt = 1 + Math.pow(position, 1.18) * 1.10;', 'const visualTilt = 1 + Math.pow(position, 1.18) * 0.48;', 'spectral tilt headroom'),
        ('const spectral = Math.pow(absolute, 0.52) * visualTilt;', 'const spectral = Math.pow(absolute, 0.78) * visualTilt;', 'spectral response curve'),
        ('const spectralResponse = spectral * (0.35 + localGate * 0.65);', 'const spectralResponse = spectral * (0.30 + localGate * 0.56);', 'spectral response gain'),
        ('const adaptiveResponse = Math.pow(relative, 0.70) * 0.22 * localGate;', 'const adaptiveResponse = Math.pow(relative, 0.82) * 0.14 * localGate;', 'adaptive response gain'),
        ('? clamp(spectralResponse * 0.92 + adaptiveResponse, 0.012, 1)', '? clamp(spectralResponse * 0.86 + adaptiveResponse, 0.012, 1)', 'visual target headroom'),
        ('const level = clamp(rms * visualSignalScale * 2.40, 0, 1);', 'const level = clamp(rms * visualSignalScale * 1.85, 0, 1);', 'RMS meter headroom'),
        ('const peak = clamp(Math.max(samplePeak * visualSignalScale * 1.08, level), 0, 1);', 'const peak = clamp(Math.max(samplePeak * visualSignalScale * 0.96, level), 0, 1);', 'peak meter headroom'),
    ]
    for old, new, label in replacements:
        text = replace_once(text, old, new, label)
    write_pair('js/equalizer.js', text)


def repair_player_stage_css() -> None:
    path = ROOT / 'css/player-stage-v2.css'
    text = path.read_text(encoding='utf-8')

    text = replace_once(
        text,
        ':root{--s666-main-player-width:min(56vw,1080px);--s666-main-player-half:min(28vw,540px);--s666-side-panel-width:clamp(220px,calc(19vw - 16px),300px);--s666-side-panel-gap:clamp(7px,.65vw,12px)}',
        ':root{--s666-main-player-width:min(62vw,1120px);--s666-main-player-half:min(31vw,560px);--s666-side-panel-width:clamp(205px,calc(18.5vw - 14px),290px);--s666-side-panel-gap:clamp(7px,.65vw,12px)}',
        'desktop proportional width variables',
    )

    text = replace_once(
        text,
        '  body[data-veluna-page="main"] .frame-stage{position:relative!important;width:100vw!important;height:100dvh!important;min-height:100dvh!important;overflow:hidden!important;padding:0!important}',
        '  body[data-veluna-page="main"] .frame-stage{position:relative!important;width:100%!important;min-width:0!important;height:auto!important;min-height:max(100dvh,820px)!important;overflow-x:hidden!important;overflow-y:auto!important;padding:0!important}',
        'desktop frame resize guard',
    )

    text = replace_once(
        text,
        '  body[data-veluna-page="main"] .frame-stage .player-shell{position:relative!important;inset:auto!important;transform:none!important;width:var(--s666-main-player-width)!important;max-width:var(--s666-main-player-width)!important;min-width:min(760px,var(--s666-main-player-width))!important;height:calc(100dvh - 12px)!important;min-height:0!important;max-height:calc(100dvh - 12px)!important;margin:6px auto!important;padding:4px 0 2px!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:clamp(3px,.42vh,6px)!important;box-sizing:border-box!important}',
        '  body[data-veluna-page="main"] .frame-stage .player-shell{position:relative!important;inset:auto!important;transform:none!important;width:var(--s666-main-player-width)!important;max-width:var(--s666-main-player-width)!important;min-width:min(760px,var(--s666-main-player-width))!important;height:auto!important;min-height:808px!important;max-height:none!important;margin:6px auto!important;padding:4px 0 2px!important;overflow:visible!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:clamp(3px,.42vh,6px)!important;box-sizing:border-box!important}',
        'desktop player non-deforming height guard',
    )

    text = replace_once(
        text,
        '  body[data-veluna-page="main"] .top-hud .status-chip{position:relative!important;inset:auto!important;flex:0 0 auto!important;width:auto!important;min-width:38px!important;max-width:48px!important;height:28px!important;min-height:28px!important;padding:0 7px!important;margin:0!important}',
        '  body[data-veluna-page="main"] .top-hud .status-chip{position:relative!important;inset:auto!important;flex:0 0 auto!important;width:auto!important;min-width:36px!important;max-width:44px!important;height:28px!important;min-height:28px!important;padding:0 6px!important;margin:0!important}',
        'top HUD compact status chips',
    )

    text = replace_once(
        text,
        '  body[data-veluna-page="main"] .player-shell>.bottom-console{order:6!important;flex:0 0 clamp(60px,6.5vh,70px)!important;height:clamp(60px,6.5vh,70px)!important;margin:0 22px!important;padding:7px 10px!important;display:grid!important;grid-template-columns:auto auto minmax(90px,1fr) minmax(142px,174px)!important;align-items:center!important;gap:8px!important;overflow:hidden!important}',
        '  body[data-veluna-page="main"] .player-shell>.bottom-console{order:6!important;flex:0 0 clamp(60px,6.5vh,70px)!important;height:clamp(60px,6.5vh,70px)!important;margin:0 22px!important;padding:7px 10px!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(150px,190px)!important;align-items:center!important;gap:10px!important;overflow:hidden!important}',
        'bottom console two-owner grid',
    )

    text = replace_once(
        text,
        '  body[data-veluna-page="main"] .bottom-console :is(.timeline-wrap,.volume-wrap){min-width:0!important;width:100%!important}body[data-veluna-page="main"] .bottom-console .volume-wrap{display:flex!important;gap:6px!important}',
        '  body[data-veluna-page="main"] .bottom-console .volume-wrap{min-width:0!important;width:100%!important;display:flex!important;gap:6px!important}',
        'remove timeline geometry owner',
    )

    text = replace_once(
        text,
        '  #s666StageDiscord,#s666StageSkip{min-width:92px!important;max-width:104px!important;height:38px!important;padding:0 8px!important;font:900 9px/1 ui-monospace,monospace!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
        '  #s666StageDiscord,#s666StageSkip{min-width:86px!important;max-width:108px!important;height:38px!important;padding:0 7px!important;font:900 9px/1 ui-monospace,monospace!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
        'action button responsive widths',
    )

    anchor = '}\n@media(min-width:761px) and (max-width:1220px){:root{--s666-main-player-width:calc(100vw - 24px)}body[data-veluna-page="main"] .pc-side-addon{display:none!important}}'
    addition = '''  body[data-veluna-page="main"] .top-hud #playerDesignSwitch{min-width:82px!important;max-width:92px!important;height:28px!important;padding:0 8px!important;font:900 9px/1 ui-monospace,monospace!important;text-decoration:none!important;white-space:nowrap!important}
  body[data-veluna-page="main"] .bottom-console .s666-mute-button{min-width:70px!important;max-width:82px!important;height:38px!important;min-height:38px!important;padding:0 7px!important;font-size:9px!important}
  body[data-veluna-page="main"].pc-left-addon-off .pc-side-addon-left,body[data-veluna-page="main"].pc-right-addon-off .pc-side-addon-right{display:none!important}
  body[data-veluna-page="main"] .now-playing .ticker-window{box-sizing:border-box!important}
}
@media(min-width:1221px){
  body[data-veluna-page="main"].pc-single-addon-off{--s666-main-player-width:min(68vw,1280px);--s666-main-player-half:min(34vw,640px)}
  body[data-veluna-page="main"].pc-both-addons-off{--s666-main-player-width:min(calc(100vw - 180px),1440px);--s666-main-player-half:min(calc((100vw - 180px)/2),720px)}
}
@media(min-width:761px) and (max-width:1220px){:root{--s666-main-player-width:calc(100vw - 24px)}body[data-veluna-page="main"] .pc-side-addon{display:none!important}}'''
    text = replace_once(text, anchor, addition, 'insert canonical FX expansion and top VELUNA geometry')

    write_pair('css/player-stage-v2.css', text)


def write_regression_test() -> None:
    test = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('index.html');
const publicIndex = read('public/index.html');
const phase10 = read('js/phase10-stability-iphone-panel-hud.js');
const phase10Mirror = read('public/js/phase10-stability-iphone-panel-hud.js');
const stage = read('js/player-stage-v2.js');
const stageMirror = read('public/js/player-stage-v2.js');
const css = read('css/player-stage-v2.css');
const cssMirror = read('public/css/player-stage-v2.css');
const eq = read('js/equalizer.js');
const eqMirror = read('public/js/equalizer.js');

const bootBlock = source => {
  const start = source.indexOf('    function boot(){');
  const end = source.indexOf('\n\n  window.S666Phase10', start);
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
};

test('UI owner repair keeps all root/public mirrors byte-identical', () => {
  assert.equal(index, publicIndex);
  assert.equal(phase10, phase10Mirror);
  assert.equal(stage, stageMirror);
  assert.equal(css, cssMirror);
  assert.equal(eq, eqMirror);
});

test('Phase10 boots recovery only and no longer mutates canonical player visuals', () => {
  const boot = bootBlock(phase10);
  for (const forbidden of ['mountHudLogo()', 'uiFinetuneV1()', 'iphonePcParityV1()', 'forcedUiApplyV1()', 'startSideMeterReactV1()', 'directfixRestoreStatusLeds()', 'directfixTickerAndMessage()', 'phase10RelocatePcPanels()', 'mountMobilePanelRow()', 'mountBottomSafe()']) {
    assert.doesNotMatch(boot, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const required of ['startIphoneAudioStabilityGuardV2()', 'installAudioFocusGuard()', 'bindMobileStreamLedSwitch()']) assert.ok(boot.includes(required), required);
  assert.match(boot, /data-phase10-ui-owner","canonical-player-stage/);
});

test('canonical side meters and ticker retain one active visual owner', () => {
  const boot = bootBlock(phase10);
  assert.doesNotMatch(boot, /startSideMeterReactV1|directfixTickerAndMessage/);
  assert.match(eq, /applyMeters\(leftMeters, left\)/);
  assert.match(eq, /applyMeters\(rightMeters, right\)/);
  assert.match(stage, /#nowPlayingTicker/);
  assert.match(css, /animation:s666TitleMarquee 14s linear infinite/);
});

test('VELUNA navigation lives in top panel and live runtime timeline is removed', () => {
  assert.equal((index.match(/id="playerDesignSwitch"/g) || []).length, 1);
  const veluna = index.indexOf('id="playerDesignSwitch"');
  const topHudEnd = index.indexOf('</header>', index.indexOf('<header class="top-hud'));
  assert.ok(veluna > 0 && veluna < topHudEnd);
  assert.doesNotMatch(index, /timeline-wrap desktop-only|id="currentTimeText"|id="timelineProgress"|id="durationText"/);
  assert.match(index, /DNA PULSE<\/span><b>0%<\/b>/);
});

test('system panel actions bind to existing canonical systems', () => {
  for (const id of ['statusStream','statusBuffer','statusSource','statusMeta','statusWorker','statusAudio','statusWatchdog','statusReconnect','statusMeter','statusDiscord','statusAdmin','statusGovee']) {
    assert.ok(stage.includes(`bindPanelButton('${id}'`), id);
  }
  assert.match(stage, /S666DiscordPlayerAddonV3/);
  assert.match(stage, /FPAdminOverlay/);
  assert.match(stage, /S666GoveeSync/);
  assert.match(stage, /#reconnectBtn/);
});

test('L-FX and R-FX restore historical persistence keys and proportional expansion', () => {
  assert.match(stage, /s666_'\+side\+'_addon_fx/);
  assert.match(stage, /pc-left-addon-off/);
  assert.match(stage, /pc-right-addon-off/);
  assert.match(css, /pc-single-addon-off/);
  assert.match(css, /pc-both-addons-off/);
  assert.match(css, /display:none!important/);
});

test('desktop resizing preserves geometry instead of forcing viewport-height clipping', () => {
  assert.match(css, /min-height:max\(100dvh,820px\)!important/);
  assert.match(css, /height:auto!important;min-height:808px!important;max-height:none!important/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(150px,190px\)!important/);
});

test('real analyser visual headroom is calmer without touching audio routing', () => {
  assert.match(eq, /visualVolumeScale = Math\.pow\(volume, 1\.15\)/);
  assert.match(eq, /Math\.pow\(absolute, 0\.78\)/);
  assert.match(eq, /visualSignalScale \* 1\.85/);
  assert.match(eq, /visualSignalScale \* 0\.96/);
  assert.match(stage, /Math\.pow\(clamp\(value,0,1\),1\.18\)/);
  assert.match(eq, /createMediaElementSource/);
  assert.match(eq, /__MeterBus/);
});

test('protected AutoDJ and Discord paths remain present during UI repair', () => {
  assert.match(stage, /S666SkipControl\.skip/);
  assert.match(stage, /S666DiscordPlayerAddonV3\.messagePost/);
  assert.doesNotMatch(stage, /\/api\/radio\/skip/);
});
'''
    (ROOT / 'tests/ui-owner-continuity-repair.test.mjs').write_text(test, encoding='utf-8')


def main() -> None:
    repair_phase10()
    repair_index()
    repair_player_stage_js()
    repair_equalizer()
    repair_player_stage_css()
    write_regression_test()
    print('UI owner continuity repair staged successfully.')


if __name__ == '__main__':
    main()
