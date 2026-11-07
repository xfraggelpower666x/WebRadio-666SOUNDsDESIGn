"""Guided, local, read-only BLE experiment sessions.

Sessions organize labeled captures into a reproducible protocol-learning run.
They never perform BLE IO and never promote protocol verification.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

from ble_capture_quality import audit_capture_result
from ble_capture_store import default_evidence_dir, load_capture_evidence
from ble_protocol_inference import experiment_plan


SESSION_SCHEMA = 1


def default_session_dir() -> Path:
    return default_evidence_dir() / "sessions"


def _canonical(data) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _hash_payload(payload: dict) -> str:
    return hashlib.sha256(_canonical(payload).encode("utf-8")).hexdigest()


def create_session(family: str, device_id: str, directory: str | Path | None = None) -> dict:
    family = "magic_lantern" if str(family).lower() == "oc21w" else str(family).lower()
    plan = experiment_plan(family)
    device_id = str(device_id or "").strip()
    if not device_id:
        raise ValueError("device_id_required")
    created = int(time.time())
    payload = {
        "schema": SESSION_SCHEMA,
        "kind": "LIGHT_ORCHESTRA_BLE_EXPERIMENT_SESSION",
        "session_id": f"{created}-{device_id}-{family}",
        "created_at_unix": created,
        "family": family,
        "device_id": device_id,
        "hardware_io": "READ_ONLY_ONLY",
        "automatic_promotion_allowed": False,
        "plan": [
            {
                "label": item["label"],
                "purpose": item["purpose"],
                "required": int(item["min_captures"]),
                "evidence": [],
            }
            for item in plan
        ],
    }
    return save_session({"payload": payload}, directory=directory)


def _session_file(payload: dict, directory: str | Path | None = None) -> Path:
    base = Path(directory) if directory is not None else default_session_dir()
    base.mkdir(parents=True, exist_ok=True)
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in payload["session_id"])[:140]
    return base / f"{safe}.json"


def save_session(session: dict, directory: str | Path | None = None) -> dict:
    payload = session.get("payload") if isinstance(session, dict) else None
    if not isinstance(payload, dict):
        raise ValueError("invalid_session_payload")
    if payload.get("hardware_io") != "READ_ONLY_ONLY":
        raise ValueError("session_must_be_read_only")
    record = {"payload": payload, "sha256": _hash_payload(payload)}
    target = _session_file(payload, directory)
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
    return {"ok": True, "path": str(target), "sha256": record["sha256"], "session": record}


def load_session(path: str | Path) -> dict:
    record = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(record, dict) or not isinstance(record.get("payload"), dict) or not isinstance(record.get("sha256"), str):
        raise ValueError("invalid_session_record")
    if _hash_payload(record["payload"]) != record["sha256"]:
        raise ValueError("session_hash_mismatch")
    return record


def _step(payload: dict, label: str) -> dict:
    for item in payload.get("plan", []):
        if item.get("label") == label:
            return item
    raise ValueError("experiment_label_not_in_session_plan")


def _revalidate_quality(ep: dict) -> dict:
    """Recompute capture quality instead of trusting stored quality metadata."""
    fresh = audit_capture_result(ep, min_samples=1)
    stored = ep.get("quality")
    if not isinstance(stored, dict) or stored.get("quality_pass") is not True:
        raise ValueError("evidence_quality_not_passed")
    if fresh.get("quality_pass") is not True:
        reasons = ",".join(fresh.get("blocking_reasons", [])) or "unknown"
        raise ValueError(f"evidence_quality_reaudit_failed:{reasons}")
    return fresh


def register_evidence(session: dict, evidence_path: str | Path, directory: str | Path | None = None) -> dict:
    record = session if "payload" in session and "sha256" in session else session.get("session", session)
    payload = json.loads(json.dumps(record["payload"]))
    evidence = load_capture_evidence(evidence_path)
    ep = evidence["payload"]
    if ep.get("hardware_io") != "READ_ONLY":
        raise ValueError("evidence_not_read_only")
    if ep.get("device_id") != payload.get("device_id"):
        raise ValueError("evidence_device_mismatch")
    if ep.get("family") != payload.get("family"):
        raise ValueError("evidence_family_mismatch")
    _revalidate_quality(ep)
    label = ep.get("experiment_label") or ""
    step = _step(payload, label)
    sha = evidence["sha256"]
    if sha not in [x.get("sha256") for x in step["evidence"]]:
        step["evidence"].append({
            "sha256": sha,
            "path": str(evidence_path),
            "captured_at_unix": ep.get("captured_at_unix"),
        })
    return save_session({"payload": payload}, directory=directory)


def progress(session: dict) -> dict:
    record = session if "payload" in session else session.get("session", session)
    payload = record["payload"]
    rows = []
    total_required = 0
    total_done = 0
    next_label = None
    for item in payload.get("plan", []):
        required = int(item.get("required", 0))
        done = len(item.get("evidence", []))
        complete = done >= required
        rows.append({
            "label": item.get("label"),
            "purpose": item.get("purpose"),
            "required": required,
            "completed": done,
            "complete": complete,
        })
        total_required += required
        total_done += min(done, required)
        if next_label is None and not complete:
            next_label = item.get("label")
    pct = 100.0 if total_required == 0 else round(total_done * 100.0 / total_required, 1)
    return {
        "session_id": payload.get("session_id"),
        "family": payload.get("family"),
        "device_id": payload.get("device_id"),
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "completed_required_captures": total_done,
        "total_required_captures": total_required,
        "progress_percent": pct,
        "next_required_label": next_label,
        "complete": next_label is None,
        "steps": rows,
    }


def list_sessions(directory: str | Path | None = None) -> list[dict]:
    base = Path(directory) if directory is not None else default_session_dir()
    if not base.exists():
        return []
    result = []
    for path in sorted(base.glob("*.json")):
        try:
            record = load_session(path)
            result.append({"path": str(path), "session": record, "progress": progress(record)})
        except Exception as exc:
            result.append({"path": str(path), "error": str(exc)})
    return result
