"""Originale Theme-Daten und Import von LightwaveExplorer-Simulationsergebnissen."""
from colorsys import hsv_to_rgb
from functools import lru_cache
import json
from math import isfinite
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

import numpy as np
from light_wave_config import ROOT

DATA = ROOT / "DATA/integrations"
OPTICAL_EFFECT = "Optik · Importiertes Spektrum"


@lru_cache(maxsize=1)
def lifx_themes():
    with (DATA / "lifx/themes.jsonl").open(encoding="utf-8") as stream:
        records = [json.loads(line) for line in stream if line.strip()]
    return {f"{record['category']} · {record['name']}": record for record in records}


def palette_rgb(name):
    palette = lifx_themes()[name]["colors"]
    return tuple(hsv_to_rgb(c["hue"] / 360.0, c["saturation"], c["brightness"]) for c in palette)


@lru_cache(maxsize=1)
def hud_themes():
    return {doc["name"]: doc for path in sorted((DATA / "glimhud").glob("*.glimtheme.json"))
            for doc in [json.loads(path.read_text(encoding="utf-8-sig"))]}


def load_optical_spectrum(path):
    """Liest die drei Spektralkanäle des ersten gültigen Simulationslaufs."""
    with ZipFile(path) as archive:
        pairs = [(entry, entry.removesuffix("_spectrum.dat") + ".txt")
                 for entry in archive.namelist() if entry.endswith("_spectrum.dat")]
        if len(pairs) != 1:
            raise ValueError("Das Ergebnis-ZIP muss genau ein LightwaveExplorer-Spektrum enthalten.")
        binary, metadata = pairs[0]
        if PurePosixPath(binary).is_absolute() or metadata not in archive.namelist():
            raise ValueError("Die passende LightwaveExplorer-Parameterdatei fehlt.")
        if archive.getinfo(metadata).file_size > 1_000_000:
            raise ValueError("Die Parameterdatei ist zu groß.")
        settings = dict((key.strip().lower(), value.strip())
                        for key, _, value in (line.partition(":") for line in
                                              archive.read(metadata).decode("utf-8-sig").splitlines())
                        if _)
        try:
            dt, span = float(settings["dt"]), float(settings["time span"])
            ratio = span / (8 * dt)
            if not isfinite(ratio) or dt <= 0 or not 1 <= ratio <= 32768:
                raise ValueError
            count = 4 * round(ratio) + 1
        except (ValueError, KeyError, ZeroDivisionError, OverflowError):
            raise ValueError("Ungültige Simulationswerte für dt oder Time span.") from None
        with archive.open(binary) as stream:
            data = stream.read(24 * count)
        if len(data) != 24 * count:
            raise ValueError("Die Spektraldatei enthält keinen vollständigen Simulationslauf.")
    spectrum = np.frombuffer(data, dtype="<f8").reshape(3, count)
    if not np.isfinite(spectrum).all() or np.any(spectrum < 0):
        raise ValueError("Spektraldaten enthalten ungültige Werte.")
    maximum = np.max(spectrum)
    if maximum == 0:
        raise ValueError("Die Spektraldaten enthalten kein Signal.")
    # Max-Pooling erhält schmale physikalische Peaks beim Upload auf die GPU.
    spectrum = spectrum / maximum
    if count > 1024:
        starts = np.arange(1024) * count // 1024
        spectrum = np.maximum.reduceat(spectrum, starts, axis=1)
    display = np.log1p(spectrum * 999) / np.log(1000)
    return np.ascontiguousarray(display.T, dtype=np.float32), .5 / dt / 1e12
