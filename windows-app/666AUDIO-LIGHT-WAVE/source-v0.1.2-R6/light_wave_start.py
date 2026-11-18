"""Startet dieselbe Player-Pipeline nach einer Prüfung ohne Hardwareimporte."""
import argparse
import importlib.util
import os
from pathlib import Path
import random
import re
import sys

from light_wave_config import (
    ROOT, MEDIA_KEYS, MODES, cache_path, input_errors, load_cache, load_config,
)

PLAYER = ROOT / "32-bit_STEREO_EQ__light_wave_tech_v1.1.10.py"
DEMO = ROOT / "DATA/demo"


def project_tracks(config, edition):
    import audio_vars_playlist as playlists

    groups = {
        "CORE": getattr(playlists, "songs_supagood", playlists.SUNO_AUDIO_CORE),
        "SUMMER": playlists.SUNO_AUDIO_SUMMER,
        "PSY_TRANCE": playlists.SUNO_AUDIO_PSY_TRANCE,
        "HARDWAVE": playlists.SUNO_AUDIO_HARDWAVE,
        "CUSTOM": playlists.SUNO_AUDIO_CUSTOM,
    }
    audio_config = config["audio_filepaths"]
    tracks = []
    for name, files in groups.items():
        if edition not in (name, "ALL"):
            continue
        base = Path(audio_config.get(f"music_folder_{name.lower()}") or audio_config["music_folder"])
        tracks.extend((base / name / file, name) for file in files if (base / name / file).is_file())
    random.shuffle(tracks)
    return tracks


def main(argv=None):
    parser = argparse.ArgumentParser(description="666AUDIO LIGHT WAVE in der reparierten Projektkopie")
    sources = parser.add_mutually_exclusive_group()
    sources.add_argument("--demo", action="store_true", help="Mitgelieferte, synthetische Medien abspielen")
    sources.add_argument("--audio", action="append", type=Path, help="WAV abspielen, mehrfach möglich")
    parser.add_argument("--check", action="store_true", help="Nur Pfade und Eingaben prüfen")
    parser.add_argument("--config", type=Path, help="Alternative Konfiguration")
    parser.add_argument("--cache", type=Path, help="Alternativer Mediencache")
    parser.add_argument("--mode", choices=MODES, default="normal")
    parser.add_argument("--edition", choices=("CORE", "SUMMER", "PSY_TRANCE", "HARDWAVE", "CUSTOM", "ALL"), default="CORE")
    parser.add_argument("--sync-folder", type=Path, help="Ordner mit den drei CSV-Spuren je Titel")
    parser.add_argument("--strict-quantum", action="store_true")
    parser.add_argument("--reduced-flash", action="store_true", help="Ruhige Audioansicht ohne Effekt-Renderer")
    parser.add_argument("--windowed", action="store_true")
    parser.add_argument("--resolution", help="Ausgabeauflösung BREITExHÖHE")
    parser.add_argument("--av-offset-ms", type=int, default=0)
    args = parser.parse_args(argv)
    if args.windowed and not args.resolution:
        args.resolution = "1280x720"
    if args.resolution and not re.fullmatch(r"[1-9][0-9]{1,4}[xX][1-9][0-9]{1,4}", args.resolution):
        parser.error("--resolution erwartet BREITExHÖHE, z. B. 1920x1080.")

    try:
        config = load_config(args.config)
        selected_cache = (DEMO / "cache.json" if args.demo else args.cache or cache_path(args.mode)).resolve()
        sync = (DEMO if args.demo else args.sync_folder or Path(config["audio_filepaths"]["sync_folder"])).resolve()
        edition = "CUSTOM" if args.edition == "ALL" else args.edition
        if args.demo:
            tracks = [(DEMO / "light_wave_test.wav", "CUSTOM")]
        elif args.audio:
            tracks = [(path.resolve(), edition) for path in args.audio]
        else:
            tracks = project_tracks(config, args.edition)

        audio_paths = [path for path, _ in tracks]
        if args.reduced_flash:
            errors = [f"Audiodatei fehlt: {path}" for path in audio_paths if not path.is_file()]
            if not tracks:
                errors.append("Keine Audiodatei gefunden.")
        else:
            cache = load_cache(selected_cache)
            errors = input_errors(config, cache, audio_paths, sync)
            if args.strict_quantum and not any((ROOT / "DATA/quantum_json_batches").glob("*.json")):
                errors.append("Strikter Modus benötigt JSON-Paare in DATA/quantum_json_batches.")
        if errors:
            for error in errors:
                print(error, file=sys.stderr)
            if not args.demo:
                print("Details und Cache-Erstellung stehen in START_REPAIR.md.", file=sys.stderr)
            return 2
        if args.check:
            print(f"Preflight OK · {len(tracks)} WAV-Quelle(n) · {selected_cache.name}")
            return 0

        if args.config:
            os.environ["LWT_CONFIG"] = str(args.config.resolve())
        os.environ.update({
            "LWT_CACHE": str(selected_cache),
            "LWT_MODE": args.mode,
            "LWT_SYNC_DIR": str(sync),
            "LWT_AV_OFFSET_MS": str(args.av_offset_ms),
            "LWT_STRICT_QUANTUM": str(int(args.strict_quantum)),
            "LWT_WINDOWED": str(int(args.windowed)),
            "LWT_DEMO": str(int(args.demo)),
        })
        if args.resolution:
            os.environ["LWT_RESOLUTION"] = args.resolution

        # Der vorhandene Shaderbestand verwendet projektrelative Materialpfade.
        os.chdir(ROOT)
        if getattr(sys, "frozen", False):
            import light_wave_classic_core as player
        else:
            spec = importlib.util.spec_from_file_location("light_wave_player", PLAYER)
            player = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(player)
        player.play_tracks(tracks, reduced_flash=args.reduced_flash)
        return 0
    except ModuleNotFoundError as error:
        print(f"Abhängigkeit fehlt: {error.name}.", file=sys.stderr)
        return 3
    except (KeyError, TypeError, ValueError, OSError, RuntimeError) as error:
        print(f"666AUDIO LIGHT WAVE: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
