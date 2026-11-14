"""Read-only MilkDrop preset and asset library inventory. No renderer mutations."""
import argparse
import hashlib
import json
import re
from pathlib import Path

EXTENSIONS = {'.milk', '.milk2', '.milk3', '.wave', '.shape'}
CODE_RE = re.compile(r'^(per_frame|per_pixel|per_frame_init|warp|comp|wavecode_\d+_per_frame|wavecode_\d+_per_point|shapecode_\d+_per_frame)_\d+=', re.I)
Q_RE = re.compile(r'\bq(\d+)\b', re.I)
T_RE = re.compile(r'\bt(\d+)\b', re.I)


def scan_file(path: Path, root: Path) -> dict:
    data = path.read_bytes()
    result = {'path': path.relative_to(root).as_posix(), 'bytes': len(data),
              'sha256': hashlib.sha256(data).hexdigest(), 'extension': path.suffix.lower()}
    if path.suffix.lower() not in ('.milk', '.milk2', '.milk3'):
        return result
    content = data.decode('utf-8-sig', errors='replace')
    result['preset_header'] = '[preset00]' in content.lower()
    result['equation_lines'] = sum(bool(CODE_RE.match(line)) for line in content.splitlines())
    result['shader_warp'] = bool(re.search(r'^warp_\d+=', content, re.M | re.I))
    result['shader_comp'] = bool(re.search(r'^comp_\d+=', content, re.M | re.I))
    result['max_q'] = max((int(x) for x in Q_RE.findall(content)), default=0)
    result['max_t'] = max((int(x) for x in T_RE.findall(content)), default=0)
    result['warnings'] = []
    if result['max_q'] > 64:
        result['warnings'].append('q variable index above documented MilkDrop3 q64')
    if result['max_t'] > 8:
        result['warnings'].append('t variable index above t8')
    if not result['preset_header'] and path.suffix.lower() == '.milk':
        result['warnings'].append('No [preset00] header detected; inspect manually')
    return result


def audit(root: Path) -> dict:
    if not root.is_dir():
        raise NotADirectoryError(str(root))
    files = [scan_file(p, root) for p in sorted(root.rglob('*'))
             if p.is_file() and p.suffix.lower() in EXTENSIONS]
    return {'schema': '666sd-milkdrop-inventory-v1', 'source': str(root.resolve()),
            'count': len(files), 'files': files}


def main() -> int:
    ap = argparse.ArgumentParser(description='Read-only MilkDrop library inventory')
    ap.add_argument('folder', type=Path, help='Original library folder; never modified')
    ap.add_argument('--report', type=Path, help='JSON output outside original library')
    args = ap.parse_args()
    try:
        report = audit(args.folder)
        payload = json.dumps(report, indent=2, ensure_ascii=False)
        if args.report:
            target, source = args.report.resolve(), args.folder.resolve()
            if source == target or source in target.parents:
                ap.error('--report must be outside original library')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(payload + '\n', encoding='utf-8')
        else:
            print(payload)
        return 0
    except (OSError, UnicodeError) as exc:
        ap.exit(2, f'ERROR: {exc}\n')


if __name__ == '__main__':
    raise SystemExit(main())
