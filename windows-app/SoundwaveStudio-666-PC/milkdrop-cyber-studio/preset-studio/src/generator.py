"""666SOUNDsDESIGn MilkDrop Preset Generator v0.1.0. Standardbibliothek only.
Generates deterministic, bounded EEL .milk presets. No user files overwritten.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import random
import re
from dataclasses import dataclass
from pathlib import Path

STYLES = {
    'dark-techno': {'palette':[(0.98,0.06,0.40),(0.42,0.12,1.0),(0.04,0.86,0.95)],'warp':0.28,'rot':0.010,'zoom':0.012,'wave':0},
    'psytechno': {'palette':[(0.94,0.08,0.75),(0.03,0.92,0.93),(0.58,0.18,1.0)],'warp':0.48,'rot':0.018,'zoom':0.015,'wave':4},
    'psytrance': {'palette':[(0.28,0.96,0.42),(0.95,0.12,0.65),(0.18,0.80,1.0)],'warp':0.65,'rot':0.026,'zoom':0.018,'wave':6},
    'cyberpunk': {'palette':[(0.98,0.04,0.54),(0.00,0.96,0.98),(0.52,0.16,0.96)],'warp':0.36,'rot':0.014,'zoom':0.014,'wave':2},
    'bunker': {'palette':[(0.98,0.22,0.08),(0.70,0.02,0.10),(0.44,0.16,0.92)],'warp':0.16,'rot':0.006,'zoom':0.009,'wave':0},
    'forest': {'palette':[(0.13,0.80,0.41),(0.48,0.10,0.75),(0.02,0.75,0.70)],'warp':0.72,'rot':0.025,'zoom':0.012,'wave':5},
}
VARIANTS=('tunnel','spiral','vortex','pulse','drift')

@dataclass(frozen=True)
class Settings:
    style: str = 'dark-techno'
    variant: str = 'tunnel'
    bpm: float = 146.0
    intensity: float = 0.7
    seed: int = 666


def clamp(x, low, high):
    return max(low, min(high, x))

def fmt(value):
    if isinstance(value, int): return str(value)
    if not math.isfinite(value): raise ValueError('Non-finite value')
    return f'{value:.6f}'

def base_parameters(s: Settings, rng: random.Random) -> list[tuple[str, str]]:
    sty = STYLES[s.style]
    color = rng.choice(sty['palette'])
    params = [
        ('fRating', '5.000'), ('fGammaAdj','1.500'), ('fDecay','0.976'),
        ('fVideoEchoZoom','1.000'), ('fVideoEchoAlpha','0.000'), ('nVideoEchoOrientation','0'),
        ('nWaveMode',str(sty['wave'])),('bAdditiveWaves','0'),('bWaveDots','0'),('bWaveThick','1'),
        ('bModWaveAlphaByVolume','0'), ('bMaximizeWaveColor','0'),('bTexWrap','1'),
        ('bDarkenCenter','1'), ('bRedBlueStereo','0'), ('bBrighten','0'),
        ('bDarken','0'), ('bSolarize','0'), ('bInvert','0'),
        ('fWaveAlpha','0.78'),('fWaveScale','0.85'),('fWaveSmoothing','0.72'),
        ('fWaveParam','0.000'),('fModWaveAlphaStart','0.750'),('fModWaveAlphaEnd','0.950'),
        ('fWarpAnimSpeed','1.00'),('fWarpScale','1.000'),('fZoomExponent','1.000'),('fShader','0.000'),
        ('zoom','1.000'),('rot','0.000'),('cx','0.500'),('cy','0.500'),
        ('dx','0.000'),('dy','0.000'),('warp',fmt(sty['warp'])),('sx','1.000'),('sy','1.000'),
        ('wave_r',fmt(color[0])),('wave_g',fmt(color[1])),('wave_b',fmt(color[2])),
        ('wave_x','0.500'),('wave_y','0.500'),
        ('ob_size','0.004'), ('ob_r',fmt(color[0])),('ob_g',fmt(color[1])),
        ('ob_b',fmt(color[2])),('ob_a','0.20'),
        ('ib_size','0.005'),('ib_r','0.030'),('ib_g','0.030'),('ib_b','0.060'),('ib_a','0.12'),
        ('nMotionVectorsX','16'),('nMotionVectorsY','12'),('mv_dx','0.000'),
        ('mv_dy','0.000'),('mv_l','0.600'),('mv_r',fmt(color[0])),
        ('mv_g',fmt(color[1])),('mv_b',fmt(color[2])),('mv_a','0.060'),
        ('b1n','0.000'),('b2n','0.000'),('b3n','0.000'),
        ('b1x','1.000'),('b2x','1.000'),('b3x','1.000'),('b1ed','0.250'),
    ]
    # Explicitly disable unused slots, so no host-dependent old geometry is inherited.
    for n in range(4):
        params.extend([(f'wavecode_{n}_enabled','0'),(f'shapecode_{n}_enabled','0')])
    return params


def equations(s: Settings, rng: random.Random):
    style = STYLES[s.style]
    amp = s.intensity
    hz = s.bpm / 60.0
    phase = rng.uniform(0, 6.28)
    # Eigene Per-Frame-Variablen speichern den Filterzustand. q1/q2 übertragen ihn an andere Stufen.
    init = ['bass_smooth=1;', 'treb_smooth=1;', 'q1=1;', 'q2=1;']
    frame = [
        'bass_smooth=0.82*bass_smooth+0.18*bass;q1=bass_smooth;',
        'treb_smooth=0.90*treb_smooth+0.10*treb;q2=treb_smooth;',
        f'beat=sin(time*{fmt(2*math.pi*hz)}+{fmt(phase)});',
        'kick=max(0,min(2,q1-0.65));',
        f'zoom=1+{fmt(style["zoom"]*amp)}*beat+{fmt(0.014*amp)}*kick;',
        f'rot={fmt(style["rot"]*amp)}*sin(time*0.37+{fmt(phase)});',
        f'warp={fmt(style["warp"]*amp)}+{fmt(0.10*amp)}*max(0,min(2,q2-0.6));',
        f'decay={fmt(clamp(0.985-0.016*amp,0.94,0.995))};',
        f'wave_a={fmt(clamp(0.48+0.35*amp,0.0,1.0))};',
        'wave_r=max(0,min(1,wave_r));',
        'wave_g=max(0,min(1,wave_g));',
        'wave_b=max(0,min(1,wave_b));',
    ]
    # Spatial computations are per-vertex only, not expensive per-frame.
    variant = s.variant
    if variant=='tunnel':
        pixel=[f'zoom=zoom+{fmt(0.08*amp)}*rad;', f'rot=rot+{fmt(0.008*amp)}*sin(ang*6+time*0.4);']
    elif variant=='spiral':
        pixel=[f'rot=rot+{fmt(0.045*amp)}*(1-rad)*sin(ang*3+time*0.3);',f'zoom=zoom+{fmt(0.045*amp)}*rad;']
    elif variant=='vortex':
        pixel=[f'rot=rot+{fmt(0.075*amp)}*(1-rad);',f'zoom=zoom+{fmt(0.035*amp)}*sin(ang*4+rad*8);']
    elif variant=='pulse':
        pixel=[f'zoom=zoom+{fmt(0.065*amp)}*sin(rad*10-time*0.5);']
    else:
        pixel=[f'dx=dx+{fmt(0.011*amp)}*sin(y*9+time*0.24);',f'dy=dy+{fmt(0.011*amp)}*cos(x*9-time*0.20);']
    return init,frame,pixel


def render(s: Settings) -> str:
    if s.style not in STYLES or s.variant not in VARIANTS: raise ValueError('Unknown style/variant')
    if not 60 <= s.bpm <= 220: raise ValueError('BPM must be between 60 and 220')
    if not 0 <= s.intensity <= 1: raise ValueError('Intensity must be between 0 and 1')
    rng = random.Random(s.seed)
    data = ['MILKDROP_PRESET_VERSION=200','PSVERSION=2','PSVERSION_WARP=0','PSVERSION_COMP=0','[preset00]']
    data.extend(f'{key}={value}' for key,value in base_parameters(s,rng))
    init, frame, pixel = equations(s,rng)
    for prefix, series in [('per_frame_init_',init),('per_frame_',frame),('per_pixel_',pixel)]:
        data.extend(f'{prefix}{i}={stmt}' for i,stmt in enumerate(series,1))
    return '\n'.join(data)+'\n'


def validate(content: str) -> list[str]:
    errors=[]
    if '[preset00]' not in content: errors.append('Missing preset00 section')
    keys=set()
    for line in content.splitlines():
        if not line or line.startswith('['):continue
        if '=' not in line: errors.append('Invalid line: '+line[:40]);continue
        k,v=line.split('=',1)
        if k in keys: errors.append('Duplicate key: '+k)
        keys.add(k)
        if re.match(r'^(per_frame_init_|per_frame_|per_pixel_)\d+$', k):
            if not v.endswith(';'): errors.append('Unterminated expression: '+k)
            if re.search(r'\b(eval|exec|import)\b',v): errors.append('Forbidden expression: '+k)
        elif k in ('fDecay','fWaveAlpha','warp','zoom'):
            try:
                value=float(v)
                if not math.isfinite(value):errors.append('Invalid numeric: '+k)
            except ValueError: errors.append('Invalid numeric: '+k)
    return errors


def generate(output: Path, style: str, variant: str, bpm: float, intensity: float, seed: int, count: int) -> list[dict]:
    if not 1<=count<=1000: raise ValueError('Count must be between 1 and 1000')
    output.mkdir(parents=True,exist_ok=True)
    result=[]
    for i in range(count):
        item_seed=seed+i
        settings=Settings(style, variant if variant!='mix' else VARIANTS[i%len(VARIANTS)],bpm,intensity,item_seed)
        name=f'666SD_{style}_{settings.variant}_{item_seed:08d}.milk'
        path=output/name
        if path.exists(): raise FileExistsError(f'Existing preset protected: {path}')
        content=render(settings)
        errors=validate(content)
        if errors:raise ValueError('; '.join(errors))
        path.write_text(content,encoding='utf-8',newline='\n')
        result.append({'file':name,'style':style,'variant':settings.variant,'bpm':bpm,'intensity':intensity,'seed':item_seed,'sha256':hashlib.sha256(content.encode()).hexdigest()})
    return result


def main():
    parser=argparse.ArgumentParser(description='666SOUNDsDESIGn: deterministic MilkDrop .milk generator')
    parser.add_argument('--style',choices=list(STYLES),default='dark-techno')
    parser.add_argument('--variant',choices=[*VARIANTS,'mix'],default='mix')
    parser.add_argument('--bpm',type=float,default=146)
    parser.add_argument('--intensity',type=float,default=0.7)
    parser.add_argument('--seed',type=int,default=666)
    parser.add_argument('--count',type=int,default=5)
    parser.add_argument('--output',type=Path,default=Path('presets'))
    args=parser.parse_args()
    try:
        manifest=generate(args.output,args.style,args.variant,args.bpm,args.intensity,args.seed,args.count)
        metadata=args.output/'manifest.json'
        if metadata.exists(): raise FileExistsError(f'Manifest protected: {metadata}')
        metadata.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        print(f'OK: {len(manifest)} presets in {args.output}')
    except (ValueError,FileExistsError,OSError) as exc:
        parser.exit(2,f'ERROR: {exc}\n')

if __name__=='__main__': main()
