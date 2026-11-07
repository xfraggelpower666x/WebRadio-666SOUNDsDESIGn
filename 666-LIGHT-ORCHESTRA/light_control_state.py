"""Controller state, grouping and scene persistence for LIGHT ORCHESTRA.

Pure-Python support layer: no network, BLE or hardware IO.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

COLOR_SCHEMES = {
    "Cyber Pink": {"rgb": [255, 20, 210], "brightness": 82},
    "Neon Cyan": {"rgb": [0, 235, 255], "brightness": 80},
    "Violet Pulse": {"rgb": [152, 45, 255], "brightness": 78},
    "Rainbow Wave": {"rgb": [255, 70, 180], "brightness": 88},
    "Sunset Laser": {"rgb": [255, 85, 10], "brightness": 84},
}
MOTION_SCHEMES = {
    "Static": {"mode": 0, "speed": 20},
    "Pulse": {"mode": 1, "speed": 45},
    "Chase": {"mode": 2, "speed": 60},
    "Wave": {"mode": 3, "speed": 55},
    "Orbit": {"mode": 4, "speed": 50},
    "Spectrum Rise": {"mode": 5, "speed": 70},
    "Symmetry": {"mode": 6, "speed": 50},
}
PAIR_GROUPS = {
    "PAIR A": ["lenze_1", "lenze_2"],
    "PAIR B": ["oc21w_1", "oc21w_2"],
    "PAIR C": ["oc21w_3", "oc21w_4"],
}
DEFAULT_SCENES = {
    "Neon Dream": {"color": "Violet Pulse", "motion": "Wave", "brightness": 76, "audio": True},
    "Club Energy": {"color": "Cyber Pink", "motion": "Chase", "brightness": 92, "audio": True},
    "Rainbow Symphony": {"color": "Rainbow Wave", "motion": "Spectrum Rise", "brightness": 88, "audio": True},
    "Chill Ambient": {"color": "Neon Cyan", "motion": "Static", "brightness": 42, "audio": False},
}


def normalize_device_ids(ids, known):
    known_ids = {str(x) for x in known}
    result = []
    for value in ids or []:
        value = str(value)
        if value in known_ids and value not in result:
            result.append(value)
    return result


def resolve_targets(mode, known_ids, selected_id=None, pair_name=None, custom_ids=None):
    known = [str(x) for x in known_ids]
    mode = str(mode or "single").lower()
    if mode == "all":
        return known
    if mode == "pair":
        return normalize_device_ids(PAIR_GROUPS.get(str(pair_name or ""), []), known)
    if mode == "custom":
        return normalize_device_ids(custom_ids or [], known)
    return normalize_device_ids([selected_id] if selected_id else [], known)


def default_scene_dir() -> Path:
    return Path.home() / ".666soundsdesign" / "light-orchestra" / "scenes"


class SceneStore:
    def __init__(self, directory=None):
        self.directory = Path(directory) if directory is not None else default_scene_dir()

    def list_scenes(self):
        scenes = dict(DEFAULT_SCENES)
        if self.directory.exists():
            for path in sorted(self.directory.glob("*.json")):
                try:
                    data = json.loads(path.read_text(encoding="utf-8"))
                    if isinstance(data, dict) and data.get("name"):
                        scenes[str(data["name"])] = dict(data.get("scene") or {})
                except Exception:
                    continue
        return scenes

    def save(self, name, scene):
        name = str(name or "").strip()
        if not name or len(name) > 80:
            raise ValueError("scene_name_required")
        if not isinstance(scene, dict):
            raise ValueError("scene_must_be_dict")
        safe = "".join(ch if ch.isalnum() or ch in "-_ " else "_" for ch in name).strip().replace(" ", "_")[:80]
        self.directory.mkdir(parents=True, exist_ok=True)
        target = self.directory / f"{safe}.json"
        temp = target.with_suffix(".tmp")
        payload = {"schema": 1, "name": name, "scene": scene}
        encoded = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        try:
            with temp.open("w", encoding="utf-8", newline="\n") as fh:
                fh.write(encoded)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(temp, target)
        finally:
            if temp.exists():
                temp.unlink()
        return target

    def delete(self, name):
        for path in self.directory.glob("*.json") if self.directory.exists() else []:
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            if data.get("name") == name:
                path.unlink()
                return True
        return False
