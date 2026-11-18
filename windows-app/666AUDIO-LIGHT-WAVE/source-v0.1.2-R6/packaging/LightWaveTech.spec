"""Einzel-EXE mit Studio, klassischen Engines und mitgelieferten Medien."""
from pathlib import Path
from shutil import copyfile
from PyInstaller.config import CONF
from PyInstaller.utils.hooks import collect_dynamic_libs

root = Path(SPECPATH).resolve().parent
aliases = Path(CONF["workpath"]) / "engine_modules"
aliases.mkdir(parents=True, exist_ok=True)
for source, alias in (
    ("32-bit_STEREO_EQ__light_wave_tech_v1.1.10.py", "light_wave_classic_core.py"),
    ("2.5D_vr_main.py", "light_wave_vr_core.py"),
):
    copyfile(root / source, aliases / alias)

binaries = collect_dynamic_libs("openvr")
datas = [
    (str(root / name), ".") for name in ("radio_wave_banner.webp", "unifont-17.0.03.otf", "LICENSE.txt", "packaging/CREDITS.txt")
]
datas += [(str(root / "DATA"), "DATA"), (str(root / "CONFIG" / "filepaths.json"), "CONFIG")]

a = Analysis(
    [str(root / "light_wave_desktop.py")],
    pathex=[str(root), str(aliases)],
    datas=datas,
    binaries=binaries,
    hiddenimports=["pygame.freetype", "glcontext.wgl", "glcontext.x11", "glcontext.egl"],
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz, a.scripts, a.binaries, a.datas,
    name="666AUDIO-LIGHT-WAVE",
    debug=False,
    console=False,
    upx=False,
)
