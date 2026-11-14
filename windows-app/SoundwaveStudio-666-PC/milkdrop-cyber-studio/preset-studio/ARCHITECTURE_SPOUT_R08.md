# Parallel R08 · Spout2 / Syphon adapter evaluation

## VERIFIZIERT from uploaded archives
Spout2-master.zip includes `SPOUTSDK/SpoutLibrary/SpoutLibrary.h`, DirectX9/11/12 support and prebuilt `SpoutLibrary.dll`, BSD-2-Clause LICENSE. C-interface implemented internally as C++ vtable/factory; direct ctypes calling of C++ virtual methods is **not** safe without a tested wrapper.
Java-master.zip has `JSyphon` JNI, Xcode project and macOS Syphon dependencies. Included Windows LWJGL libraries are NOT a Syphon implementation for Windows.

## Implemented R08
- Non-executing archive diagnostics, PE header architecture inspection; original source ZIPs remain external
- GUI diagnostic actions and optional Windows CHECK_SPOUT_BRIDGE.bat
- No automatic installation, no proprietary renderer bundling, no GPU runtime claims

## OPEN next gates
1. Native Windows C++ Spout Sender Adapter connected to a verified MilkDrop3 rendered frame (requires renderer code access and license review)
2. Spout Receiver output proof with independent tool, timing/frame verification, GPU compatibility
3. Window overlay geometry and second-monitor output controls
4. WASAPI application/system loopback and Edge/Chrome tab audio bridging
5. Live shader recompile proof on original renderer
6. MAKE_EXE.bat Windows compilation and portable host test

No productive writes or external account modification.
