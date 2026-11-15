"""Read-only source and local DLL diagnostics for a future Windows Spout bridge.
No foreign DLL is loaded and no renderer is launched by this module.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys
import zipfile

MAX_UNCOMPRESSED = 200 * 1024 * 1024
SPOUT_HEADER = "SPOUTSDK/SpoutLibrary/SpoutLibrary.h"

def analyze_zip(path: Path, kind: str) -> dict:
    path = Path(path)
    result = {'archive': str(path), 'kind': kind, 'status': 'UNVERIFIED', 'sha256': None, 'files': 0, 'notes': []}
    if not path.is_file():
        result['status']='MISSING'; return result
    result['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        if any(n.startswith('/') or '..' in Path(n.replace('\\','/')).parts for n in names):
            result['status']='UNSAFE_ARCHIVE'; return result
        result['files']=len(names)
        if kind=='spout':
            headers=[n for n in names if n.endswith(SPOUT_HEADER)]
            licenses=[n for n in names if n.endswith('/LICENSE')]
            result['has_c_api_header']=bool(headers)
            result['has_license']=bool(licenses)
            result['embedded_dlls']=[n for n in names if n.lower().endswith('.dll')]
            if headers:
                info=z.getinfo(headers[0]); s=z.read(info).decode('utf-8','replace') if info.file_size<MAX_UNCOMPRESSED else ''
                result['has_receiver_api']='ReceiveTexture' in s and 'ReceiveImage' in s
                result['has_sender_api']='SendTexture' in s and 'SendImage' in s
            result['status']='SOURCE_INSPECTED' if result.get('has_c_api_header') and result.get('has_license') else 'PARTIAL'
            result['notes']=['Native GPU texture transfer requires Windows renderer instrumentation and a verified sender/receiver runtime.', 'Do not treat a bundled DLL as an active or trusted bridge.']
        elif kind=='syphon':
            result['has_xcode_project']=any(n.endswith('.xcodeproj/project.pbxproj') for n in names)
            result['has_java_jar']=any(n.endswith('jsyphon.jar') for n in names)
            result['status']='SOURCE_INSPECTED'
            result['notes']=['Syphon JNI library targets macOS; Windows LWJGL binaries do not make Syphon run on Windows.']
        else:
            raise ValueError('Unsupported kind')
    return result

def inspect_dll(path: Path) -> dict:
    path=Path(path)
    result={'dll':str(path), 'status':'MISSING'}
    if not path.is_file(): return result
    with path.open('rb') as f: data=f.read(4096)
    result['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
    if len(data)<64 or data[:2]!=b'MZ':
        result['status']='INVALID_PE';return result
    off=struct.unpack_from('<I',data,0x3c)[0]
    if off+6>len(data) or data[off:off+4]!=b'PE\x00\x00':
        result['status']='INVALID_PE';return result
    machine=struct.unpack_from('<H',data,off+4)[0]
    result['architecture']={0x8664:'x64',0x14c:'x86',0xaa64:'ARM64'}.get(machine,hex(machine))
    result['status']='PE_HEADER_INSPECTED_NOT_LOADED'
    return result

def main(argv=None):
    ap=argparse.ArgumentParser(description='Read-only Spout2/Syphon archive and DLL inspection')
    ap.add_argument('--spout',type=Path)
    ap.add_argument('--syphon',type=Path)
    ap.add_argument('--dll',type=Path)
    ap.add_argument('--output',type=Path)
    args=ap.parse_args(argv)
    report={'checks':[],'gpu_runtime_verified':False,'spout_sender_integrated':False}
    if args.spout:report['checks'].append(analyze_zip(args.spout,'spout'))
    if args.syphon:report['checks'].append(analyze_zip(args.syphon,'syphon'))
    if args.dll:report['checks'].append(inspect_dll(args.dll))
    body=json.dumps(report,indent=2,ensure_ascii=False)
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(body+'\n',encoding='utf-8')
    print(body)
    return 1 if not report['checks'] or any(c['status'] in ('MISSING','UNSAFE_ARCHIVE','INVALID_PE') for c in report['checks']) else 0

if __name__=='__main__':raise SystemExit(main())
