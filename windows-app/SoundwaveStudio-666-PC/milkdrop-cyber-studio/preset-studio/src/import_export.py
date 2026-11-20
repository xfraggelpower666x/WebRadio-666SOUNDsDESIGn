"""666SOUNDsDESIGn v0.2.0: verlustfreier MilkDrop Import/Export.

Nur .milk; Originalbytes unverändert; keine Überschreibungen; ZIP-Pfadprüfung.
Standardbibliothek, keine Netzwerke oder fremden Abhängigkeiten.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import zipfile

MAX_FILE = 8 * 1024 * 1024
MAX_TOTAL = 256 * 1024 * 1024
MAX_COUNT = 10000


def check_preset(data: bytes, filename: str) -> None:
    if not filename.lower().endswith('.milk'):
        raise ValueError('Kein .milk-Preset: ' + filename)
    if len(data) > MAX_FILE:
        raise ValueError('Preset zu gross: ' + filename)
    if b'\x00' in data:
        raise ValueError('Binaerdaten statt Text: ' + filename)
    # BOM und Codepage-Presets sind erlaubt; keine Dekodierung und keine Normalisierung.
    if not re.search(rb'(?m)^\s*\[preset00\]\s*\r?$', data, re.IGNORECASE):
        raise ValueError('Kein [preset00]-Abschnitt: ' + filename)


def safe_name(name: str) -> Path:
    name = name.replace('\\', '/')
    p = PurePosixPath(name)
    if (p.is_absolute() or not p.parts or any(x in ('..', '.') for x in p.parts)
            or any(':' in x for x in p.parts) or name.startswith('//')):
        raise ValueError('Unsicherer Dateipfad: ' + name)
    return Path(*p.parts)


def source_items(source: Path):
    if source.is_dir():
        for path in sorted(source.rglob('*')):
            if path.is_symlink():
                if path.suffix.lower() == '.milk':
                    raise ValueError('Symlink nicht erlaubt: ' + str(path))
                continue
            if path.is_file() and path.suffix.lower() == '.milk':
                rel = path.relative_to(source)
                if path.stat().st_size > MAX_FILE:
                    raise ValueError('Preset zu gross: ' + str(path))
                yield rel, path.read_bytes()
    elif source.is_file() and source.suffix.lower() == '.milk':
        yield Path(source.name), source.read_bytes()
    elif source.is_file() and zipfile.is_zipfile(source):
        with zipfile.ZipFile(source) as z:
            infos = [i for i in z.infolist() if not i.is_dir() and i.filename.lower().endswith('.milk')]
            if len(infos) > MAX_COUNT or sum(i.file_size for i in infos) > MAX_TOTAL:
                raise ValueError('ZIP-Limits ueberschritten')
            for info in infos:
                path = safe_name(info.filename)
                if (info.external_attr >> 16) & 0o170000 == stat.S_IFLNK:
                    raise ValueError('ZIP-Symlink nicht erlaubt: ' + info.filename)
                if info.file_size > MAX_FILE:
                    raise ValueError('ZIP-Preset zu gross: ' + info.filename)
                yield path, z.read(info)
    else:
        raise ValueError('Quelle muss .milk, .zip oder Ordner sein: ' + str(source))


def collect(source: Path) -> list[tuple[Path, bytes]]:
    result = []
    seen = set()
    total = 0
    for rel, data in source_items(source):
        rel = safe_name(rel.as_posix())
        check_preset(data, str(rel))
        key = rel.as_posix().casefold()
        if key in seen:
            raise ValueError('Kollidierender Dateiname: ' + str(rel))
        seen.add(key)
        total += len(data)
        result.append((rel, data))
        if len(result) > MAX_COUNT or total > MAX_TOTAL:
            raise ValueError('Groessenlimit erreicht')
    if not result:
        raise ValueError('Keine .milk-Presets gefunden')
    return result


def import_presets(source: Path, destination: Path) -> list[dict]:
    """Importiert kopierend, mit Vorabpruefung und Byte-Hash; niemals overwrite."""
    items = collect(source)
    target_root = destination.resolve()
    records = []
    for rel, data in items:
        target = target_root / rel
        if target.exists() or target.is_symlink():
            raise FileExistsError('Ziel bereits vorhanden: ' + str(target))
        # Bestehende symlink-parent-Verzeichnisse duerfen nicht durchquert werden.
        for parent in list(target.parents)[:-1]:
            if parent == target_root.parent:
                break
            if parent.is_symlink():
                raise ValueError('Symlink im Zielpfad: ' + str(parent))
        records.append({'path': rel.as_posix(), 'size': len(data),
                        'sha256': hashlib.sha256(data).hexdigest()})
    created = []
    try:
        for rel, data in items:
            target = target_root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            # 'xb' ist atomarer Ueberschreibschutz auch bei konkurrierenden Prozessen.
            with target.open('xb') as f:
                created.append(target)
                f.write(data)
    except Exception:
        for path in created:
            path.unlink(missing_ok=True)
        raise
    return records


def export_presets(source: Path, destination_zip: Path) -> list[dict]:
    items = collect(source)
    if destination_zip.exists():
        raise FileExistsError('Export bereits vorhanden: ' + str(destination_zip))
    records = [{'path': rel.as_posix(), 'size': len(data),
                'sha256': hashlib.sha256(data).hexdigest()} for rel, data in items]
    destination_zip.parent.mkdir(parents=True, exist_ok=True)
    try:
        # x: niemals existierendes Archiv ersetzen; keine Eingriffe in Quell-Presets.
        with zipfile.ZipFile(destination_zip, 'x', compression=zipfile.ZIP_DEFLATED) as z:
            for rel, data in items:
                z.writestr(rel.as_posix(), data)
            z.writestr('666SD_export_manifest.json', json.dumps({
                'format': '666SD MilkDrop Preset Pack', 'version': '0.2.0',
                'files': records}, ensure_ascii=False, indent=2) + '\n')
    except Exception:
        destination_zip.unlink(missing_ok=True)
        raise
    return records


def main():
    parser = argparse.ArgumentParser(description='666SD MilkDrop Preset Import/Export (bytegenau)')
    sub = parser.add_subparsers(dest='command', required=True)
    for command in ('import', 'export'):
        p = sub.add_parser(command)
        p.add_argument('--source', type=Path, required=True)
        p.add_argument('--output', type=Path, required=True,
                       help='Import: Zielordner / Export: neue ZIP-Datei')
    args = parser.parse_args()
    try:
        records = (import_presets(args.source, args.output) if args.command == 'import'
                   else export_presets(args.source, args.output))
        print(json.dumps({'status': 'VERIFIED_BYTES', 'count': len(records),
                          'output': str(args.output), 'files': records}, indent=2, ensure_ascii=False))
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(2, 'ERROR: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
