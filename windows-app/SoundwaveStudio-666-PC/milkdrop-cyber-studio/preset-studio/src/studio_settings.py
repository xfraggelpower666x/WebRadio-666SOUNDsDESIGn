"""666SD Studio: sicherer Settings-Store und Audio-Routing-Profile (no implicit capture)."""
from __future__ import annotations
import json
import os
from pathlib import Path
import tempfile

DEFAULTS = {
    "schema_version": 1,
    "language": "en-US",
    "renderer": "",
    "quality_preference": "High",
    "display_mode": "windowed",
    "display_width": 1280,
    "display_height": 720,
    "display_x": 100,
    "display_y": 100,
    "monitor_index": 0,
    "gpu_preference": "renderer-default",
    "fps_limit": 60,
    "shader_quality": "renderer-default",
    "texture_quality": "renderer-default",
    "canvas_scale": 1.0,
    "mesh_x": 48,
    "mesh_y": 36,
    "overlay_topmost": False,
    "overlay_alpha": 1.0,
    "audio_mode": "off",
    "audio_device": "",
    "audio_process_id": 0,
    "audio_browser": "edge",
    "audio_tab": "",
    "help_tooltips": True,
    "help_detail": "expanded",
    "library": "",
}
MODES = ("off", "input-device", "system-loopback", "process-loopback", "browser-tab")
BROWSERS = ("edge", "chrome", "firefox", "safari")
RESOLUTIONS = ((640, 360), (800, 600), (1024, 768), (1280, 720), (1600, 900), (1920, 1080), (2560, 1440), (3840, 2160))

def validate(data):
    if not isinstance(data, dict): raise ValueError("Configuration must be JSON object")
    output = dict(DEFAULTS)
    output.update(data)
    for key in ("display_width", "display_height", "fps_limit", "mesh_x", "mesh_y", "monitor_index", "audio_process_id"):
        try: output[key] = int(output[key])
        except (ValueError, TypeError): raise ValueError(f"Invalid {key}") from None
    if not 320 <= output['display_width'] <= 7680: raise ValueError('Invalid width')
    if not 240 <= output['display_height'] <= 4320: raise ValueError('Invalid height')
    if not 1 <= output['fps_limit'] <= 240: raise ValueError('Invalid FPS')
    if not 8 <= output['mesh_x'] <= 128 or not 6 <= output['mesh_y'] <= 96: raise ValueError('Invalid mesh')
    if output['monitor_index'] < 0 or output['audio_process_id'] < 0: raise ValueError('Invalid monitor/PID')
    for k,lo,hi in (("overlay_alpha",0.2,1.0),("canvas_scale",0.5,4.0)):
        try: output[k] = float(output[k])
        except (TypeError,ValueError): raise ValueError(f'Invalid {k}') from None
        if not lo <= output[k] <= hi: raise ValueError(f'Invalid {k}')
    if output['audio_mode'] not in MODES: raise ValueError('Invalid audio mode')
    if output['audio_browser'] not in BROWSERS: raise ValueError('Invalid browser')
    if output['display_mode'] not in ('windowed','borderless','fullscreen'): raise ValueError('Invalid display mode')
    if output['language'] not in ('en-US','de-DE'): raise ValueError('Invalid language')
    for k in ('renderer','audio_device','audio_tab','library','gpu_preference','shader_quality','texture_quality'):
        if not isinstance(output[k],str) or len(output[k]) > 4096: raise ValueError('Invalid '+k)
    return output

def load(path):
    path = Path(path)
    if not path.exists(): return dict(DEFAULTS)
    return validate(json.loads(path.read_text(encoding='utf-8')))

def save(path, data):
    target=Path(path)
    obj=validate(data)
    target.parent.mkdir(parents=True,exist_ok=True)
    # Atomarer Write mit gleicher Volume; originale Konfiguration bei Fehler erhalten.
    fd,tmp=tempfile.mkstemp(prefix='.settings-',suffix='.json',dir=target.parent)
    try:
        with os.fdopen(fd,'w',encoding='utf-8',newline='\n') as f:
            json.dump(obj,f,indent=2,ensure_ascii=False)
            f.flush();os.fsync(f.fileno())
        os.replace(tmp,target)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    return obj

def source_capability(mode, browser='edge'):
    """Beschreibt Implementierungsstand, NIE eine Aufnahme vortäuschen."""
    if mode == 'off': return ('READY','Audioquelle ausgeschaltet')
    if mode == 'input-device':return ('DISCOVERY','Mikrofon/Line-in: Geräteauflistung, kein MilkDrop-Audio-Bridge-Feed')
    if mode == 'system-loopback':return ('PLANNED','WASAPI endpoint loopback braucht nativen Capture-Adapter')
    if mode == 'process-loopback':return ('PLANNED','Windows process loopback braucht nativen Capture-Adapter')
    if mode == 'browser-tab':
        if browser in ('edge','chrome'):return ('PLANNED','Chromium tabCapture erfordert Erweiterung + Nutzerinteraktion + Audio-Bridge')
        if browser=='firefox':return ('UNVERIFIED','Keine verifizierte tabCapture-Parität; separater Browseradapter nötig')
        return ('UNSUPPORTED_ON_WINDOWS','Safari-Tab-Capture unter Windows nicht verfügbar')
    raise ValueError('Unknown source')
