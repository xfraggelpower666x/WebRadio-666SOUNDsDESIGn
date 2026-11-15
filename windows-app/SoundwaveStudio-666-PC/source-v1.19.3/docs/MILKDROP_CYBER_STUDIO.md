# MilkDrop Cyber Studio

The Windows dock opens a separate bundled preset and asset editor. It is not a
MilkDrop renderer or an audio capture bridge. To use a generated `.milk` preset
in RADIO WAVE, save it in Studio and import it through the MilkDrop controls.
Studio stores its configuration and default library under Electron's
`userData\milkdrop-cyber-studio` directory; it does not overwrite existing
library files. The installed and portable applications do not need Python.

## Building from source on Windows x64

`npm start`, `npm run dist`, and `npm run package` automatically prepare the
Studio before starting or packaging. The electron-builder hook and the legacy
packager also prepare it when invoked directly. A verified current bundle is
reused. A missing or stale bundle is built in a separate staging directory;
the previous output is retained under `build\cyber-studio-backups`.

The builder needs network access on the first build for missing prerequisites.
It uses Python 3.13.17 x64 with Tk and the exact versions in
`tools\milkdrop-cyber-studio\build-requirements.txt`. A matching existing
virtual environment may be supplied using the absolute path in
`CYBER_STUDIO_PYTHON`; it is only reused when all pinned packages are present.
Otherwise the builder creates a project-local venv in
`build\cyber-studio-env`, installing only missing pinned packages there. If
Python 3.13.17 is unavailable, the official Python.org Windows runtime ZIP is
downloaded into project build files, checked against a pinned SHA-256, and
extracted locally. No WinGet, system Python installation, or global pip
installation is used by this Studio preparation.

The generated bundle is `build\cyber-studio`; intermediate builds and
downloaded runtime files are retained in `build\cyber-studio-work` and
`build\cyber-studio-env`. Failed builds leave the old bundle unchanged.
An incompatible or incomplete pre-existing project venv or a stale
`build\cyber-studio.lock` stops the build with an error; inspect and preserve
those paths before moving them yourself. The builder does not clear user
caches or overwrite an existing environment.

Run focused tests with:

```powershell
node --test tests\cyber-studio-build.test.cjs tests\cyber-studio.test.cjs
$env:CYBER_STUDIO_REAL_EXE_TEST='1'
node --test tests\cyber-studio.test.cjs
```

The optional real-executable test starts Studio and checks Tcl/Tk, TkDND,
Pillow and PortAudio with Python removed from `PATH`; it needs an interactive
Windows desktop. The installer and portable EXE should additionally be tested
on a clean Windows PC.

## Third-party notices

The build copies notices from the exact selected Python runtime and pinned
wheel metadata into `build\cyber-studio\notices`, which is included alongside
the Studio executable in packaged application resources. The Python and Tk
notices come from the runtime; wheel notices include PyInstaller's bootloader
exception, Pillow's bundled-library notices, tkinterdnd2 and sounddevice.
The pinned source notices for Tcl, TkDND and PortAudio are maintained in
`tools\milkdrop-cyber-studio\licenses`. The PortAudio wheel's build metadata
identifies upstream v19.7.0. Only its non-ASIO x64 DLL is bundled; ASIO
variants are not distributed by this build.

- Tcl: https://github.com/tcltk/tcl/blob/core-8-6-branch/license.terms
- TkDND: https://github.com/petasis/tkdnd/blob/master/license.terms
- PortAudio v19.7.0: https://github.com/PortAudio/portaudio/blob/v19.7.0/LICENSE.txt

The supplied archive's 15 sample presets match their manifest hashes, but no
explicit redistribution license for those files was found in the Studio
archive. They are therefore not bundled or copied into user libraries. Do not
assume the sibling RADIO WAVE package's MIT declaration covers them.
