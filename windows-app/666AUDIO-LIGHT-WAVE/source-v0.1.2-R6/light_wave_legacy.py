"""Grafisch gestartete klassische Modi mit getrenntem Renderer-Prozess."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from light_wave_config import MODES, ROOT, load_config

EDITIONS = ("CORE", "SUMMER", "PSY_TRANCE", "HARDWAVE", "CUSTOM", "ALL")


def launch_legacy(arguments, log_path):
    command = [sys.executable]
    if not getattr(sys, "frozen", False):
        command += [str(ROOT / "light_wave_desktop.py")]
    with log_path.open("w", encoding="utf-8") as log:
        return subprocess.Popen(
            [*command, "--legacy", *arguments], stdout=log, stderr=subprocess.STDOUT,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            env={**os.environ, "PYTHONUTF8": "1", "LWT_DESKTOP_LOG": str(log_path)},
        )


def run_legacy(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("effects", "playlist", "vr"))
    parser.add_argument("--audio", type=Path)
    parser.add_argument("--clips", type=Path)
    parser.add_argument("--sync-folder", type=Path)
    parser.add_argument("--music-folder", type=Path)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--left", type=Path)
    parser.add_argument("--right", type=Path)
    parser.add_argument("--edition", choices=EDITIONS, default="CORE")
    parser.add_argument("--mode", choices=MODES, default="normal")
    args = parser.parse_args(argv)
    if args.action == "vr":
        if not all(path and path.is_dir() for path in (args.left, args.right)):
            parser.error("Zwei vorhandene Bildordner auswählen.")
        if getattr(sys, "frozen", False):
            import light_wave_vr_core
            light_wave_vr_core.main((args.left, args.right))
            return 0
        return subprocess.run([sys.executable, str(ROOT / "2.5D_vr_main.py"),
                               str(args.left), str(args.right)], check=False).returncode

    from CONFIG import config_preload_path_names, minimal_config_preload_path_names, nsfw_config_preload_path_names
    from light_wave_start import main

    config = load_config(args.config)
    if args.music_folder:
        locations = config["audio_filepaths"]
        locations["music_folder"] = str(args.music_folder)
        for edition in EDITIONS[:-1]:
            locations[f"music_folder_{edition.lower()}"] = str(args.music_folder)
    if args.clips:
        for name in ("all_horizontal", "all_vertical_1", "all_vertical_2"):
            config["video_filepaths"][f"video_folder_{name}"] = str(args.clips)
    generators = {
        "normal": config_preload_path_names.save_paths_to_cache,
        "minimal": minimal_config_preload_path_names.save_paths_to_cache,
        "nsfw": nsfw_config_preload_path_names.save_paths_to_cache,
    }
    with tempfile.TemporaryDirectory(prefix="LightWaveTech-") as work:
        config_path = Path(work) / "filepaths.json"
        cache_path = Path(work) / "cache.json"
        config_path.write_text(json.dumps(config, ensure_ascii=False), encoding="utf-8")
        generators[args.mode](config.get, 1, cache_path)
        command = ["--config", str(config_path), "--cache", str(cache_path),
                   "--mode", args.mode, "--edition", args.edition, "--windowed"]
        if args.audio:
            command += ["--audio", str(args.audio)]
        if args.sync_folder:
            command += ["--sync-folder", str(args.sync_folder)]
        return main(command)
