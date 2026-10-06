"""Persistent SHA-256 bound final reports for LIGHT ORCHESTRA BLE sessions."""
from __future__ import annotations
import hashlib, json, os
from pathlib import Path
from ble_capture_store import canonical_json, default_evidence_dir
from ble_inference_review import build_inference_review
from ble_session_quality import _load_session_evidence, _session_record

REPORT_SCHEMA = 1

def default_report_dir() -> Path:
    return default_evidence_dir() / "reports"

def _sha256_json(value) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()

def build_final_report(session: dict, source_commit: str = "") -> dict:
    record = _session_record(session)
    payload, valid, invalid = _load_session_evidence(record)
    review = build_inference_review(record)
    evidence = sorted(
        [{"sha256": e["record"].get("sha256"), "label": e.get("label")} for e in valid],
        key=lambda x: (str(x.get("label") or ""), str(x.get("sha256") or "")),
    )
    report = {
        "schema": REPORT_SCHEMA,
        "kind": "LIGHT_ORCHESTRA_BLE_SESSION_FINAL_REPORT",
        "session_id": payload.get("session_id"),
        "session_sha256": record.get("sha256"),
        "family": payload.get("family"),
        "device_id": payload.get("device_id"),
        "source_commit": str(source_commit or ""),
        "hardware_io": "READ_ONLY_ONLY",
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "manual_review_ready": bool(review.get("manual_review_ready")),
        "evidence": evidence,
        "invalid_evidence_count": len(invalid),
        "review": review,
        "integrity": {"algorithm": "SHA-256", "mode": "CONTENT_HASH"},
    }
    seal_input = json.loads(json.dumps(report))
    report["integrity"]["content_sha256"] = _sha256_json(seal_input)
    return report

def verify_final_report(report: dict) -> dict:
    if not isinstance(report, dict) or report.get("kind") != "LIGHT_ORCHESTRA_BLE_SESSION_FINAL_REPORT":
        return {"valid": False, "reason": "invalid_report_kind"}
    integrity = report.get("integrity")
    if not isinstance(integrity, dict) or integrity.get("algorithm") != "SHA-256":
        return {"valid": False, "reason": "invalid_integrity_metadata"}
    expected = integrity.get("content_sha256")
    if not isinstance(expected, str) or len(expected) != 64:
        return {"valid": False, "reason": "missing_integrity_hash"}
    candidate = json.loads(json.dumps(report))
    candidate["integrity"].pop("content_sha256", None)
    actual = _sha256_json(candidate)
    return {"valid": actual == expected, "expected_sha256": expected, "actual_sha256": actual, "hardware_verified": False}

def save_final_report(session: dict, directory: str | Path | None = None, source_commit: str = "") -> dict:
    report = build_final_report(session, source_commit=source_commit)
    base = Path(directory) if directory is not None else default_report_dir()
    base.mkdir(parents=True, exist_ok=True)
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in str(report["session_id"]))[:140]
    target = base / f"{safe}.final-report.json"
    temp = target.with_suffix(".tmp")
    encoded = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "
"
    try:
        with temp.open("w", encoding="utf-8", newline="
") as fh:
            fh.write(encoded); fh.flush(); os.fsync(fh.fileno())
        os.replace(temp, target)
    finally:
        if temp.exists(): temp.unlink()
    return {"ok": True, "path": str(target), "content_sha256": report["integrity"]["content_sha256"], "manual_review_ready": report["manual_review_ready"], "hardware_verified": False}

def load_final_report(path: str | Path) -> dict:
    report = json.loads(Path(path).read_text(encoding="utf-8"))
    verification = verify_final_report(report)
    if not verification.get("valid"):
        raise ValueError("final_report_integrity_mismatch")
    return report

def resume_final_report(path: str | Path) -> dict:
    report = load_final_report(path)
    return {
        "report": report,
        "session_id": report.get("session_id"),
        "family": report.get("family"),
        "device_id": report.get("device_id"),
        "source_commit": report.get("source_commit"),
        "manual_review_ready": bool(report.get("manual_review_ready")),
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
    }

def _candidate_strengths(report: dict) -> dict:
    review = report.get("review", {}) if isinstance(report, dict) else {}
    rows = review.get("ranked_candidate_fields", []) if isinstance(review, dict) else []
    result = {}
    for row in rows if isinstance(rows, list) else []:
        if isinstance(row, dict) and isinstance(row.get("index"), int):
            result[row["index"]] = int(row.get("cross_label_difference_count", 0))
    return result

def compare_final_reports(left: dict, right: dict) -> dict:
    if left.get("family") != right.get("family"):
        raise ValueError("report_family_mismatch")
    if left.get("device_id") != right.get("device_id"):
        raise ValueError("report_device_mismatch")
    left_fields = _candidate_strengths(left)
    right_fields = _candidate_strengths(right)
    shared = sorted(set(left_fields) & set(right_fields))
    return {
        "family": left.get("family"),
        "device_id": left.get("device_id"),
        "left_session_id": left.get("session_id"),
        "right_session_id": right.get("session_id"),
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "shared_candidate_indexes": shared,
        "added_candidate_indexes": sorted(set(right_fields) - set(left_fields)),
        "removed_candidate_indexes": sorted(set(left_fields) - set(right_fields)),
        "changed_candidate_strength": [
            {"index": i, "left_count": left_fields[i], "right_count": right_fields[i]}
            for i in shared if left_fields[i] != right_fields[i]
        ],
        "stable_candidate_indexes": [
            i for i in shared if left_fields[i] == right_fields[i]
        ],
        "rule": "Evidence progression only; never hardware verification.",
    }

def compare_final_report_files(left_path: str | Path, right_path: str | Path) -> dict:
    return compare_final_reports(load_final_report(left_path), load_final_report(right_path))
