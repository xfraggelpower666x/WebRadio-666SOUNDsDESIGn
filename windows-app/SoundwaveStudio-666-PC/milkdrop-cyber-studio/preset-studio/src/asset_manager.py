"""Non-destructive asset import/export and image conversion for MilkDrop Studio.
No runtime network access. No overwrite. Treat untrusted archives as data.
"""
from __future__ import annotations
from pathlib import Path, PurePosixPath
import zipfile, stat, shutil, hashlib, json, re

IMAGE_EXT={'.png','.jpg','.jpeg','.jfif','.bmp','.tga','.gif','.webp','.dds'}
EXTS={'presets':{'.milk','.milk2','.milk3'}, 'textures':IMAGE_EXT, 'sprites':IMAGE_EXT,
      'waves':{'.milk','.txt','.json'}, 'shapes':{'.milk','.txt','.json'}}
MAX_ITEM=32*1024*1024
MAX_TOTAL=768*1024*1024
MAX_ITEMS=15000

def safe_rel(name):
    if '\\' in name: name=name.replace('\\','/')
    p=PurePosixPath(name)
    if not p.parts or p.is_absolute() or any(x in ('.','..') or ':' in x or x.endswith(' ') for x in p.parts):
        raise ValueError('Unsicherer Archivpfad: '+name)
    return Path(*p.parts)

def supported(path,category):
    return path.suffix.lower() in EXTS[category]

def gather_sources(sources,category):
    """Materialize validated bytes only in memory; check all sources before first write."""
    found=[]; total=0
    for source in map(Path,sources):
        if source.is_symlink(): raise ValueError('Symlink-Quelle abgelehnt')
        if source.is_dir():
            iterator=((p.relative_to(source),p,None) for p in sorted(source.rglob('*')) if p.is_file() and supported(p,category))
        elif source.is_file() and source.suffix.lower()=='.zip':
            with zipfile.ZipFile(source) as z:
                infos=[i for i in z.infolist() if not i.is_dir()]
                if len(infos)>MAX_ITEMS or sum(i.file_size for i in infos)>MAX_TOTAL: raise ValueError('Archivlimit erreicht')
                for i in infos:
                    rel=safe_rel(i.filename)
                    if ((i.external_attr>>16)&0o170000)==stat.S_IFLNK: raise ValueError('Archiv-Symlink abgelehnt')
                    if supported(rel,category):
                        if i.file_size>MAX_ITEM:raise ValueError('Asset zu groß')
                        data=z.read(i)
                        total+=len(data)
                        if total>MAX_TOTAL:raise ValueError('Assetlimit erreicht')
                        found.append((rel,data))
            continue
        elif source.is_file() and supported(source,category):
            iterator=[(Path(source.name),source,None)]
        else: raise ValueError('Nicht unterstützte Quelle: '+str(source))
        for rel,p,_ in iterator:
            if p.is_symlink():raise ValueError('Symlink abgelehnt')
            if p.stat().st_size>MAX_ITEM:raise ValueError('Asset zu groß')
            data=p.read_bytes();total+=len(data)
            if total>MAX_TOTAL:raise ValueError('Assetlimit erreicht')
            found.append((safe_rel(rel.as_posix()),data))
        if len(found)>MAX_ITEMS:raise ValueError('Zu viele Assets')
    if not found:raise ValueError('Keine passenden Dateien gefunden')
    return found

def import_assets(sources,library,category):
    if category not in EXTS:raise ValueError('Unbekannte Kategorie')
    found=gather_sources(sources,category)
    base=Path(library).resolve()/category/'imports'
    # Unique import session instead of overwriting same-named assets.
    i=1
    while (base/f'batch_{i:05d}').exists():i+=1
    folder=base/f'batch_{i:05d}'
    names=set();records=[]
    for rel,data in found:
        k=rel.as_posix().casefold()
        if k in names:raise ValueError('Doppelter relativer Dateiname: '+str(rel))
        names.add(k)
        records.append({'path':rel.as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    created=[]
    try:
        for (rel,data) in found:
            target=folder/rel;target.parent.mkdir(parents=True,exist_ok=True)
            with target.open('xb') as f: f.write(data)
            created.append(target)
    except Exception:
        for p in created:p.unlink(missing_ok=True)
        raise
    return folder,records

def export_assets(folder,target,categories=None):
    folder=Path(folder).resolve();target=Path(target)
    if not folder.is_dir():raise ValueError('Bibliothek fehlt')
    if target.exists():raise FileExistsError('Export existiert bereits')
    cats=set(categories or EXTS)
    entries=[]
    for cat in cats:
        if cat not in EXTS:raise ValueError('Unbekannte Kategorie')
        d=folder/cat
        if d.is_dir():
            for p in sorted(d.rglob('*')):
                if p.is_file() and not p.is_symlink() and supported(p,cat):
                    if p.stat().st_size>MAX_ITEM:raise ValueError('Datei zu groß')
                    entries.append((p.relative_to(folder).as_posix(),p.read_bytes()))
    if not entries:raise ValueError('Keine Assets vorhanden')
    target.parent.mkdir(parents=True,exist_ok=True)
    try:
        with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED) as z:
            manifest=[]
            for name,data in entries:
                z.writestr(name,data)
                manifest.append({'path':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
            z.writestr('666SD_assets_manifest.json',json.dumps({'version':1,'files':manifest},indent=2))
    except Exception:
        target.unlink(missing_ok=True);raise
    return len(entries)

def convert_image(source,output,mode='RGBA',max_side=512):
    """Create a new file only, never modify the original. Pillow is optional."""
    try:from PIL import Image
    except ImportError as e:raise RuntimeError('Pillow fehlt: in Projekt-venv installieren') from e
    source=Path(source);output=Path(output)
    if source.suffix.lower() not in IMAGE_EXT or output.suffix.lower() not in IMAGE_EXT- {'.dds','.gif'}:
        raise ValueError('Nicht unterstütztes Bildformat')
    if output.exists():raise FileExistsError('Ausgabedatei existiert bereits')
    if not (16<=max_side<=4096):raise ValueError('Maximale Kantenlänge 16..4096')
    with Image.open(source) as image:
        image.load()
        image.thumbnail((max_side,max_side),Image.Resampling.LANCZOS)
        if output.suffix.lower() in ('.jpg','.jpeg','.jfif'):
            image=image.convert('RGB')
        else:image=image.convert(mode)
        output.parent.mkdir(parents=True,exist_ok=True)
        try:image.save(output)
        except Exception:
            output.unlink(missing_ok=True);raise
    return output

def classify_preset(data):
    """Heuristic format flags only; not a renderer compatibility certificate."""
    text=data.decode('utf-8-sig',errors='replace')
    return {'preset00':'[preset00]' in text.lower(),
            'shader':bool(re.search(r'(?m)^(warp|comp)_\\d+=',text)),
            'milkdrop2':bool(re.search(r'(?m)^MILKDROP_PRESET_VERSION=',text)),
            'custom_waves':len(re.findall(r'(?m)^wavecode_\\d+_enabled=1',text)),
            'custom_shapes':len(re.findall(r'(?m)^shapecode_\\d+_enabled=1',text))}
