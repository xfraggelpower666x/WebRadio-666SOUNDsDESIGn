"""Datei- und Cache-Vertrag für Player, Preflight und Cache-Generatoren."""
import argparse
import csv
import json
import os
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent
MODES = ("normal", "minimal", "nsfw")
MEDIA_KEYS = ("video_filenames_all_left", "video_filenames_all_right", "video_filenames_all_vertical")
MASKS = (
    "console_circuitry_layer_matrix_v3_1440p.png",
    "v2_2nd_layer_circuitry_layer_1440p.png",
    "console_circuitry_layer_matrix_v7_1440p_shader_ui.png",
    "console_circuitry_layer_matrix_v3_1440p_shader_ui_2.png",
)
MATRIX = ("matrix_code_left_mask_960p.mp4", "matrix_code_right_mask_960p.mp4")


def project_path(value):
    return ROOT / Path(value)


def load_config(path=None):
    config_path = path or os.environ.get("LWT_CONFIG") or ROOT / "CONFIG/filepaths.json"
    with open(config_path, encoding="utf-8-sig") as source:
        data = json.load(source)
    if not isinstance(data, dict):
        raise ValueError(f"Ungültige Konfiguration: {config_path}")
    return {
        group: {key: str(project_path(value)) if value else None for key, value in entries.items()}
        for group, entries in data.items()
    }


def cache_path(mode):
    if mode not in MODES:
        raise ValueError(f"Unbekannter Cache-Modus: {mode}")
    return ROOT / "CONFIG" / f"preloaded_paths_cache_{mode}.json"


def write_cache(path, data):
    # Atomar ersetzen, damit laufende Leser einen vollständigen Cache erhalten.
    path = Path(path)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as out:
        temporary = Path(out.name)
        try:
            json.dump(data, out, indent=4)
            out.close()
            temporary.replace(path)
        finally:
            out.close()
            temporary.unlink(missing_ok=True)


def scan_neural(folder):
    if not folder or not Path(folder).is_dir():
        return []
    return sorted(str(p) for p in Path(folder).iterdir() if p.is_file() and p.suffix.lower() == ".json")


def load_cache(path):
    with open(path, encoding="utf-8-sig") as source:
        data = json.load(source)
    if not isinstance(data, dict) or any(
        not isinstance(items, list) or any(not isinstance(value, str) for value in items)
        for items in data.values()
    ):
        raise ValueError(f"Ungültiger Mediencache: {path}")
    # Die Reihenfolge gültiger Einträge bleibt für indexbasierte Auswahl erhalten.
    return {
        key: items if key == "video_base_filenames_static" else
        [str(project_path(value)) for value in items if project_path(value).is_file()]
        for key, items in data.items()
    }


def input_errors(config, cache, tracks, sync_folder):
    errors = [f"Leerer Medienpool: {key}" for key in MEDIA_KEYS if not cache.get(key)]
    required = (
        [Path(config["image_filepaths"]["mask_layer_folder"]) / name for name in MASKS]
        + [Path(config["video_filepaths"]["video_folder_matrix_code"]) / name for name in MATRIX]
    )
    if not Path(config["shader_path"]["shader_path_glsl"]).is_dir():
        errors.append("Shader-Verzeichnis fehlt.")
    for track in tracks:
        required.append(track)
        required.extend(sync_folder / f"{track.stem}_{band}_keyframes.csv" for band in ("bass", "snare", "hihat"))
    for path in required:
        if not path.is_file():
            errors.append(f"Datei fehlt: {path}")
            continue
        if path.suffix.lower() == ".csv":
            with path.open(encoding="utf-8-sig", newline="") as stream:
                rows = csv.reader(stream)
                header = next(rows, [])
                if not {"Time_ms", "Bass_Amplitude"} <= set(header) or not next(rows, []):
                    errors.append(f"Ungültige oder leere Keyframe-Datei: {path}")
    for track in tracks:
        if track.suffix.lower() != ".wav":
            errors.append(f"Der Effektplayer benötigt eine WAV-Datei: {track}")
    if not tracks:
        errors.append("Keine Audiodatei gefunden. --audio angeben oder den Demo-Modus verwenden.")
    return errors


def cache_cli(generator, mode):
    parser = argparse.ArgumentParser(description=f"Mediencache für {mode} erzeugen")
    parser.add_argument("--config", type=Path)
    parser.add_argument("--output", type=Path, default=cache_path(mode))
    args = parser.parse_args()
    data = load_config(args.config)

    def get(section, default=None):
        return data.get(section, default)

    generator(get, 1, args.output)
