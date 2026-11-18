"""Grafischer Programmeinstieg für Quellstart und Windows-EXE."""
import multiprocessing
import os
from pathlib import Path
import sys
import traceback

VERSION = "0.1.2-R6"


def app_folder():
    path = Path(os.environ.get("LOCALAPPDATA") or Path.home() / ".local/state") / "LightWaveTech"
    path.mkdir(parents=True, exist_ok=True)
    return path


def desktop_main():
    from light_wave_studio import run_studio
    return run_studio()


def smoke_test():
    import av
    import certifi
    import cv2
    import moderngl
    import openvr
    import pygame
    import sounddevice
    import tkinter
    from PIL import Image
    from light_wave_config import ROOT
    from light_wave_start import main

    assert Path(certifi.where()).is_file(), "CA-Zertifikate fehlen"
    with Image.open(ROOT / "radio_wave_banner.webp") as banner:
        banner.verify()
    for codec in ("libx264", "aac", "libvpx-vp9", "libopus", "libmp3lame",
                  "pcm_s16le", "pcm_s24le", "pcm_s32le", "pcm_f32le", "flac"):
        av.Codec(codec, "w")
    for effect_name in ("geometry.glsl", "light_zones.glsl", "optical_fields.glsl", "imported_spectrum.glsl"):
        assert (ROOT / "DATA/studio_effects" / effect_name).is_file(), f"{effect_name} fehlt"
    from light_wave_integrations import hud_themes, lifx_themes
    assert len(lifx_themes()) == 378 and len(hud_themes()) == 5
    tkinter.Tcl()
    return main(["--demo", "--check"])


def main():
    # Worker hinterlegen bei einer fensterlosen EXE ebenfalls ein Startprotokoll.
    if sys.stdout is None or sys.stderr is None:
        log_path = os.environ.get("LWT_DESKTOP_LOG") or app_folder() / "desktop.log"
        log = Path(log_path).open("a", encoding="utf-8", buffering=1)
        if sys.stdout is None:
            sys.stdout = log
        if sys.stderr is None:
            sys.stderr = log
        if sys.__stdout__ is None:
            sys.__stdout__ = sys.stdout

    if sys.argv[1:] == ["--smoke-test"]:
        return smoke_test()
    if len(sys.argv) > 1 and sys.argv[1] == "--legacy":
        from light_wave_legacy import run_legacy
        return run_legacy(sys.argv[2:])
    try:
        return desktop_main()
    except Exception as error:
        traceback.print_exc()
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                None, f"{error}\n\nProtokoll: {app_folder() / 'desktop.log'}",
                "666AUDIO LIGHT WAVE", 0x10,
            )
        return 2


if __name__ == "__main__":
    multiprocessing.freeze_support()
    raise SystemExit(main())
