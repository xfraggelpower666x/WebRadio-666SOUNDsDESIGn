"""Local evidence storage for read-only BLE capture sessions.

No cloud writes. Sessions are atomically written to the user's local
LIGHT ORCHESTRA data directory and include a content hash.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path


def default_evidence_dir() -> Path:
    return Path.home() / ".666soundsdesign" / "light-orchestra" / "evidence"


def canonical_json(data) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def evidence_hash(payload: dict) -> str:
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()


def save_capture_evidence(result: dict, directory: str | Path | None = None) -> dict:
    if not isinstance(result, dict) or not result.get("device_id"):
        raise ValueError("capture_result_with_device_id_required")
    if result.get("hardware_io") != "READ_ONLY":
        raise ValueError("only_read_only_capture_may_be_stored_as_evidence")

    base = Path(directory) if directory is not None else default_evidence_dir()
    base.mkdir(parents=True, exist_ok=True)

    captured_at = int(time.time())
    payload = {
        "schema": 1,
        "kind": "LIGHT_ORCHESTRA_BLE_READONLY_EVIDENCE",
        "captured_at_unix": captured_at,
        "device_id": str(result.get("device_id")),
        "family": str(result.get("family") or ""),
        "hardware_io": "READ_ONLY",
        "experiment_label": str(result.get("experiment_label") or "")[:120],
        "notes": str(result.get("notes") or "")[:1000],
        "capture": result.get("capture", {}),
        "analysis": result.get("analysis", {}),
        "quality": result.get("quality", {}),
    }
    digest = evidence_hash(payload)
    record = {
        "payload": payload,
        "sha256": digest,
    }

    safe_device = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in payload["device_id"])[:64]
    filename = f"{captured_at}_{safe_device}_{digest[:12]}.json"
    target = base / filename
    temp = target.with_suffix(".tmp")

    encoded = json.dumps(record, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    try:
        with temp.open("w", encoding="utf-8", newline="\n") as fh:
            fh.write(encoded)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(temp, target)
    finally:
        if temp.exists():
            temp.unlink()

    return {
        "ok": True,
        "path": str(target),
        "sha256": digest,
        "bytes": target.stat().st_size,
        "hardware_io": False,
    }


def load_capture_evidence(path: str | Path) -> dict:
    file = Path(path)
    record = json.loads(file.read_text(encoding="utf-8"))
    if not isinstance(record, dict) or not isinstance(record.get("payload"), dict) or not isinstance(record.get("sha256"), str):
        raise ValueError("invalid_evidence_record")
    actual = evidence_hash(record["payload"])
    if actual != record["sha256"]:
        raise ValueError("evidence_hash_mismatch")
    return record
