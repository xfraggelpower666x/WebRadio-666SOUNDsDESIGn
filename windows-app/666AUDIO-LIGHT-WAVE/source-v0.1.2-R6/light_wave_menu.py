"""Dateipfade aus dem interaktiven Windows-Menü an die Player weitergeben."""
import os
from pathlib import Path
import subprocess
import sys

from light_wave_start import main as start_player


def audio_file(value, *, cinematic=False):
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    path = Path(value).expanduser().resolve()
    supported = {".wav"} if cinematic else {".wav", ".mp3", ".flac"}
    if not value or path.suffix.lower() not in supported or not path.is_file():
        formats = "WAV" if cinematic else "WAV, MP3 oder FLAC"
        raise ValueError(f"Keine vorhandene Audiodatei ({formats}): {value}")
    return path


def choose_audio(*, cinematic):
    typed = os.environ.get("LWT_CUSTOM_AUDIO", "").strip()
    if typed:
        return audio_file(typed, cinematic=cinematic)
    try:
        import tkinter as tk
        from tkinter import filedialog
    except ImportError as error:
        raise RuntimeError("Dateiauswahl fehlt. Die Datei aus dem Explorer ins Menü ziehen.") from error
    try:
        window = tk.Tk()
        window.withdraw()
        window.attributes("-topmost", True)
        try:
            patterns = "*.wav" if cinematic else "*.wav *.mp3 *.flac"
            selected = filedialog.askopenfilename(parent=window, title="Eigene Musik öffnen",
                                                  filetypes=[("Audiodateien", patterns)])
        finally:
            window.destroy()
    except tk.TclError as error:
        raise RuntimeError("Dateiauswahl konnte nicht öffnen. Die Datei aus dem Explorer ins Menü ziehen.") from error
    return audio_file(selected, cinematic=cinematic) if selected else None


def image_folder(variable, label):
    value = os.environ.get(variable, "").strip().strip('"')
    path = Path(value).expanduser().resolve()
    if not value or not path.is_dir():
        raise ValueError(f"{label} ist kein vorhandener Ordner: {value}")
    return path


def main(action):
    try:
        if action == "audio":
            view = os.environ.get("LWT_AUDIO_VIEW", "spectrum")
            cinematic = view == "effects"
            track = choose_audio(cinematic=cinematic)
            if track is None:
                return 0
            if cinematic:
                return start_player(["--audio", str(track), "--edition", "CUSTOM", "--windowed"])
            from light_wave_visualizer import play_local
            play_local(track, spectrum=view != "quiet")
            return 0
        if action == "studio":
            from light_wave_studio import run_studio
            return run_studio()
        if action == "player":
            from light_wave_controls import run_player
            return run_player()
        if action == "radio":
            from light_wave_radio import play_radio
            return play_radio()
        if action == "vr":
            from importlib.util import find_spec

            left = image_folder("LWT_VR_LEFT", "Linker Bildordner")
            right = image_folder("LWT_VR_RIGHT", "Rechter Bildordner")
            if find_spec("openvr") is None:
                raise ValueError("OpenVR fehlt in der Projektumgebung. Siehe START_REPAIR.md.")
            script = Path(__file__).resolve().with_name("2.5D_vr_main.py")
            return subprocess.run([sys.executable, str(script), str(left), str(right)], check=False).returncode
        raise ValueError(f"Unbekannter Menümodus: {action}")
    except (OSError, ValueError, RuntimeError) as error:
        print(f"666AUDIO LIGHT WAVE: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) == 2 else ""))
