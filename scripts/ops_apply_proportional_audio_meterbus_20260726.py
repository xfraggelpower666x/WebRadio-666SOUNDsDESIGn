from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_between(text, start_marker, end_marker, replacement, label, keep_end=True):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker missing')
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise SystemExit(f'{label}: end marker missing')
    if not keep_end:
        end += len(end_marker)
    return text[:start] + replacement + text[end:]


eq_path = Path('js/equalizer.js')
html_path = Path('index.html')
eq = eq_path.read_text(encoding='utf-8')
html = html_path.read_text(encoding='utf-8')

eq = replace_once(eq, 'canonical audio visualizer authority V14', 'canonical audio visualizer authority V15', 'version')
eq = replace_once(
    eq,
    'Twenty-four independent logarithmic real-frequency bands with balanced perceptual compensation and peak headroom.',
    'Twenty-four independent logarithmic real-frequency bands with proportional volume/boost response and balanced peak headroom.',
    'contract header',
)

graph_start = '    const source = ctx.createMediaElementSource(audio);'
graph_end = '    applyRealEqToNodes();'
graph_replacement = '''    const source = ctx.createMediaElementSource(audio);
    source.connect(gainNode);
    if (eqNodes.length) {
      gainNode.connect(eqNodes[0]);
      for (let index = 0; index < eqNodes.length - 1; index += 1) eqNodes[index].connect(eqNodes[index + 1]);
      eqNodes[eqNodes.length - 1].connect(analyser);
    } else {
      gainNode.connect(analyser);
    }
    analyser.connect(limiterNode);
    limiterNode.connect(ctx.destination);
'''
eq = replace_between(eq, graph_start, graph_end, graph_replacement, 'processed analysis graph')

eq = replace_once(
    eq,
    '      const rms = Math.sqrt(sumSq / Math.max(1, timeData.length));\n',
    '''      const rms = Math.sqrt(sumSq / Math.max(1, timeData.length));
      const volume = clamp(audio?.volume ?? 1, 0, 1);
      const boostGain = Math.max(1, Number(gainNode?.gain?.value || (window.SMFPBoostCore ? window.SMFPBoostCore.getGain(boostStage) : BOOST_MULTIPLIERS[boostStage]) || 1));
      const visualGainCompensation = Math.pow(boostGain, -0.55);
      const visualVolumeScale = Math.pow(volume, 0.85);
      const visualSignalScale = visualGainCompensation * visualVolumeScale;
''',
    'visual proportional scale',
)
eq = replace_once(eq, '        const local = average * 0.72 + localPeak * 0.28;', '        const local = (average * 0.72 + localPeak * 0.28) * visualSignalScale;', 'band scale')
eq = replace_once(
    eq,
    '      const level = clamp(rms * 2.40, 0, 1);\n      const peak = clamp(Math.max(samplePeak * 1.08, level), 0, 1);',
    '      const level = clamp(rms * visualSignalScale * 2.40, 0, 1);\n      const peak = clamp(Math.max(samplePeak * visualSignalScale * 1.08, level), 0, 1);',
    'meter scale',
)
eq = replace_once(
    eq,
    "      visualCeiling: 'peak-dependent',\n",
    "      visualCeiling: 'peak-dependent',\n      volume: clamp(audio?.volume ?? 1, 0, 1),\n      boostGain: Math.max(1, Number(gainNode?.gain?.value || 1)),\n      eqState: { ...smfpRealEqState },\n",
    'MeterBus state',
)

guard_marker = '/* Mobile-only visibility guard. Desktop has no secondary interval writer. */'
guard_at = eq.find(guard_marker)
if guard_at < 0:
    raise SystemExit('secondary mobile writer marker missing')
eq = eq[:guard_at] + '/* Mobile visuals consume the canonical MeterBus; no secondary synthetic writer is allowed. */\n'

html = replace_once(html, 'function mffCleanEqTargetsFromAnalyser(data,count,boost)', 'function mffCleanEqTargetsFromAnalyser(data,count)', 'mobile analyser signature')
html = replace_once(html, 'var value=.16 + shaped*contour*.92 + (boost||0)*.010;', 'var value=.16 + shaped*contour*.92;', 'remove analyser boost fake')
html = replace_once(
    html,
    "return {targets:targets, level:mffClamp(Math.pow(globalMax/255,.62),.14,.96), mode:'pc-code-real'};",
    "return {targets:targets, level:mffClamp(Math.pow(globalMax/255,.62),.02,.96), pulse:0, mode:'local-analyser-real'};",
    'local analyser pack',
)

synthetic_start = '  function mffCleanEqTargetsSynthetic(count,playing,boost){'
render_start = '  function mffCleanEqRender(playing){'
new_mobile_helpers = '''  function mffCleanEqTargetsFromMeterBus(bus,count){
    var source=(bus&&Array.isArray(bus.eq))?bus.eq:[];
    var targets=[];
    for(var i=0;i<count;i++){
      var sourceIndex=source.length?Math.round((i/Math.max(1,count-1))*(source.length-1)):0;
      targets.push(mffClamp(Number(source[sourceIndex])||0,.012,.96));
    }
    return {targets:targets,level:mffClamp(Number(bus&&bus.level)||0,.012,.96),pulse:mffClamp(Number(bus&&bus.pulse)||0,0,1),mode:'meterbus-real'};
  }

  function mffCleanEqTargetsSynthetic(count){
    return {targets:new Array(count).fill(.025),level:.015,pulse:0,mode:'idle-unavailable'};
  }


'''
html = replace_between(html, synthetic_start, render_start, new_mobile_helpers, 'mobile fake wave block')

pack_start = '    var boost=boostStage||0;'
pack_end = '    /*\n      PC-Look: bars sind organisiert, aber nicht permanent gleich schnell.'
new_pack = '''    var bus=window.__MeterBus||null;
    var busFresh=!!(bus&&bus.ts&&(Date.now()-Number(bus.ts)<1000)&&bus.source==='real'&&Array.isArray(bus.eq));
    var data=busFresh?null:mffCleanEqReadAnalyser();
    var pack=busFresh
      ? mffCleanEqTargetsFromMeterBus(bus,bars.length)
      : (data ? mffCleanEqTargetsFromAnalyser(data,bars.length) : mffCleanEqTargetsSynthetic(bars.length));

'''
html = replace_between(html, pack_start, pack_end, new_pack, 'mobile MeterBus source selection')
html = replace_once(html, "app.setAttribute('data-mff-eq-engine','pc-match-v26');", "app.setAttribute('data-mff-eq-engine',pack.mode==='meterbus-real'?'canonical-meterbus-v15':'idle-no-fake-motion');", 'engine marker')
html = replace_once(html, 'var bottomLevel=mffMeterHeadroom((peak*.90)+mffBoostVisualOffset());\n    updateBottomCenterOutSegments(bottomLevel,boost);', 'var bottomLevel=mffMeterHeadroom(pack.level);\n    updateBottomCenterOutSegments(bottomLevel,pack.pulse||0);', 'bottom source')
html = replace_once(html, 'function updateBottomCenterOutSegments(level, boost)', 'function updateBottomCenterOutSegments(level, pulse)', 'bottom signature')
html = replace_once(html, 'var pulse=(Math.sin(Date.now()/210)+1)/2;\n    var boosted=(boost||0)*0.012;', 'var safePulse=mffClamp(Number(pulse)||0,0,1);', 'bottom fake pulse')
html = replace_once(html, 'falloff*level + pulse*0.10 + boosted', 'falloff*level + safePulse*0.10', 'bottom glow')

for marker in ['canonical audio visualizer authority V15', 'analyser.connect(limiterNode)', 'visualGainCompensation']:
    if marker not in eq:
        raise SystemExit(f'equalizer marker missing: {marker}')
for marker in ['mffCleanEqTargetsFromMeterBus', 'canonical-meterbus-v15', 'idle-unavailable']:
    if marker not in html:
        raise SystemExit(f'html marker missing: {marker}')

eq_path.write_text(eq, encoding='utf-8')
html_path.write_text(html, encoding='utf-8')
Path('public/js/equalizer.js').write_text(eq, encoding='utf-8')
Path('public/index.html').write_text(html, encoding='utf-8')
Path('tests/audio-meter-proportional-contract.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('processed canonical graph owns proportional MeterBus', async () => {
  const eq=await read('js/equalizer.js');
  assert.match(eq,/analyser\\.connect\\(limiterNode\\)/);
  assert.match(eq,/visualGainCompensation/);
  assert.match(eq,/visualVolumeScale/);
  assert.doesNotMatch(eq,/Mobile-only visibility guard/);
  assert.equal(await read('public/js/equalizer.js'),eq);
});
test('mobile consumer has no fake sinus or boost animation', async () => {
  const html=await read('index.html');
  const synthetic=html.match(/function mffCleanEqTargetsSynthetic[\\s\\S]*?function mffCleanEqRender/)?.[0]||'';
  assert.match(html,/mffCleanEqTargetsFromMeterBus/);
  assert.match(html,/canonical-meterbus-v15/);
  assert.doesNotMatch(synthetic,/Math\\.sin|boostStage|boosted/);
  assert.equal(await read('public/index.html'),html);
});
""", encoding='utf-8')
