from pathlib import Path
import re

ROOT = Path('.')


def replace_once(text: str, pattern: str, replacement: str, label: str, flags=0) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return updated


def repair_index(path: Path) -> None:
    text = path.read_text(encoding='utf-8')

    text = replace_once(
        text,
        r"\n\s*function pcMobileEqTimerTick\(\)\{.*?\n\s*function averageRange\(",
        "\n\n  /* Mobile EQ writing is owned exclusively by js/equalizer.js. */\n  function averageRange(",
        f'{path}: remove mobile EQ interval writer',
        flags=re.S,
    )

    text = text.replace("    startPcMobileEqTimer();\n", "    if(window.__S666VisualizerRefreshTargets){window.__S666VisualizerRefreshTargets();}\n")
    if "startPcMobileEqTimer();" in text:
        raise SystemExit(f'{path}: startPcMobileEqTimer call remains')

    text = replace_once(
        text,
        r"\n\s*document\.addEventListener\('DOMContentLoaded',function\(\)\{install\(\);setTimeout\(install,150\);setTimeout\(install,650\);setTimeout\(install,1500\);setTimeout\(install,3200\);setTimeout\(install,6000\)\}\);\n\s*window\.addEventListener\('load',install,\{passive:true\}\);\n\s*window\.addEventListener\('resize',install,\{passive:true\}\);",
        "\n  var mffInstalledOnce=false;\n  function installOnce(){\n    if(mffInstalledOnce)return;\n    mffInstalledOnce=true;\n    install();\n  }\n  if(document.readyState==='loading'){\n    document.addEventListener('DOMContentLoaded',installOnce,{once:true});\n  }else{\n    installOnce();\n  }",
        f'{path}: replace repeated installation',
        flags=re.S,
    )

    if "setTimeout(install,150)" in text or "window.addEventListener('resize',install" in text:
        raise SystemExit(f'{path}: repeated installer remains')
    if "window.setInterval(pcMobileEqTimerTick,110)" in text:
        raise SystemExit(f'{path}: competing interval remains')

    path.write_text(text, encoding='utf-8')


def repair_equalizer(path: Path) -> None:
    text = path.read_text(encoding='utf-8')

    anchor = "  const mobileLike = () => window.innerWidth <= 860;\n"
    addition = """  const mobileLike = () => window.innerWidth <= 860;

  const refreshVisualizerTargets = () => {
    if (!mobileLike()) return;
    const mobileBars = Array.from(document.querySelectorAll('#mffEqBars i'));
    if (mobileBars.length && (bars.length !== mobileBars.length || bars[0] !== mobileBars[0])) {
      bars.splice(0, bars.length, ...mobileBars);
      bandEnvelope = new Array(mobileBars.length).fill(0.012);
      bandReference = new Array(mobileBars.length).fill(24);
    }
    const mobileBottom = Array.from(document.querySelectorAll('#mffBottomBars i'));
    if (mobileBottom.length && (bottomMeterSegments.length !== mobileBottom.length || bottomMeterSegments[0] !== mobileBottom[0])) {
      bottomMeterSegments.splice(0, bottomMeterSegments.length, ...mobileBottom);
    }
  };

  window.__S666VisualizerRefreshTargets = refreshVisualizerTargets;
"""
    if anchor not in text:
        raise SystemExit(f'{path}: mobileLike anchor missing')
    text = text.replace(anchor, addition, 1)

    text = text.replace("  const renderFallbackFrame = () => {\n  if (!running) return;", "  const renderFallbackFrame = () => {\n  if (!running) return;\n  refreshVisualizerTargets();", 1)
    text = text.replace("  const idleState = () => {\n  const eq = bars.map((bar) => {", "  const idleState = () => {\n  refreshVisualizerTargets();\n  const eq = bars.map((bar) => {", 1)
    text = text.replace("    const frame = (timestamp = performance.now()) => {\n      if (!running) return;", "    const frame = (timestamp = performance.now()) => {\n      if (!running) return;\n      refreshVisualizerTargets();", 1)

    for required in (
        "window.__S666VisualizerRefreshTargets = refreshVisualizerTargets;",
        "document.querySelectorAll('#mffEqBars i')",
        "document.querySelectorAll('#mffBottomBars i')",
    ):
        if required not in text:
            raise SystemExit(f'{path}: missing {required}')

    path.write_text(text, encoding='utf-8')


for file_name in ('index.html', 'public/index.html'):
    repair_index(ROOT / file_name)
for file_name in ('js/equalizer.js', 'public/js/equalizer.js'):
    repair_equalizer(ROOT / file_name)

if (ROOT / 'index.html').read_bytes() != (ROOT / 'public/index.html').read_bytes():
    raise SystemExit('index mirrors differ')
if (ROOT / 'js/equalizer.js').read_bytes() != (ROOT / 'public/js/equalizer.js').read_bytes():
    raise SystemExit('equalizer mirrors differ')
