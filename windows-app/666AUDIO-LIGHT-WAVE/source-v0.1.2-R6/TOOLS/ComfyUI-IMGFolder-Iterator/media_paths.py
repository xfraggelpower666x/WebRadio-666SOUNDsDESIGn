"""Dateigrenzen für ComfyUI-Workflows mit frei wählbaren Medienpfaden."""
import os
from pathlib import Path


def media_path(value):
    candidate = Path(value).expanduser().resolve()
    root_value = os.environ.get("LWT_COMFY_MEDIA_ROOT")
    if not root_value:
        if os.environ.get("LWT_COMFY_TRUST_LOCAL") == "1":
            return candidate
        raise ValueError("LWT_COMFY_MEDIA_ROOT muss auf die freigegebene Medienbibliothek zeigen.")
    root = Path(root_value).expanduser().resolve(strict=True)
    if not root.is_dir() or not candidate.is_relative_to(root):
        raise ValueError("Medienpfad liegt außerhalb der freigegebenen Bibliothek.")
    return candidate
