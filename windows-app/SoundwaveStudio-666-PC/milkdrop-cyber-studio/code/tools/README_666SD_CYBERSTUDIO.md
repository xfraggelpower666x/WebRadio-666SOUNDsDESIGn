# 666SOUNDsDESIGn Cyber Studio — Direct Repo R09

Authority: this repository, development branch `666sd-cyberstudio-direct-r09-20261106`.
Base readback: `main@6b39088f789441e18cc1665519ee7ffe439cece5`.

## Working integration

`CHECK_PRESETS_666SD.bat "C:\MilkDrop3\presets"` calls the Python standard-library-only
`code/tools/666sd_preset_audit.py` and writes a JSON report to `reports/`.
The original presets, shaders and renderer are never rewritten. No ZIP or external
binary is pulled into this repository during this step.

## Evidence and next native build gates

| Strand | Result | Required next evidence |
| --- | --- | --- |
| CodeForge / inventory | SOURCE COMMITTED | Windows batch execution and real library scan |
| SuperCodeForge / native C++ | READ | VS solution build, DLL/DirectX dependency validation |
| SCEERI / source comparison | READ | license and interface matrix per source family |
| Visual Intelligence UI | OPEN | Windows GUI + real screenshot review |
| Spout2 GPU sender | OPEN | native DirectX capture hook, receiver readback |
| Shader hot reload | OPEN | renderer source edit + compile + GPU test |
| WASAPI process audio | OPEN | process loopback capture + audible verification |
| Browser-tab audio | OPEN | Chromium extension user gesture + local bridge |
| Overlay / GPU selection | OPEN | dedicated monitor/GPU API and renderer execution |
| Portable EXE | OPEN | Windows build + clean host smoke test |

Do not advertise host GPU/Windows PASS based on repository-only inspection.
Do not merge Syphon/Java macOS JNI into the Windows build.
Do not bundle upstream MilkDrop3 binaries without checking their separate license.
Modern DXC targets DXIL/SPIR-V, not automatically legacy DX9 shader bytecode.
The MilkDrop3 README documents q1-q64, 16 waves/shapes and its existing color keys;
avoid duplicate implementation.

## Test this branch

```bat
CHECK_PRESETS_666SD.bat "C:\MilkDrop3\presets"
```

Check the JSON report outside the scanned library and inspect the full path,
hashes, and any warning entries. Local Python fixture tests are not equivalent
to an installed Windows renderer test.
