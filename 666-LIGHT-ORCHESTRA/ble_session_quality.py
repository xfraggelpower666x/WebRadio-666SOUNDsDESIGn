"""Session-level quality audit for read-only BLE experiment evidence.

This module operates only on stored evidence referenced by a guided session.
It never performs BLE IO and never promotes hardware verification.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path

from ble_capture_quality import BASELINE_LABEL, audit_capture_result, frame_counts_from_evidence, subtract_baseline
from ble_capture_store import load_capture_evidence
from ble_experiment_session import progress


def _session_record(session: dict) -> dict:
    if not isinstance(session, dict):
        raise ValueError("invalid_session")
    if "payload" in session:
        return session
    nested = session.get("session")
    if isinstance(nested, dict) and "payload" in nested:
        return nested
    raise ValueError("invalid_session")


def _load_session_evidence(session: dict) -> tuple[dict, list[dict], list[dict]]:
    record = _session_record(session)
    payload = record["payload"]
    valid = []
    invalid = []
    seen_sha = set()
    for step in payload.get("plan", []):
        label = str(step.get("label") or "")
        for item in step.get("evidence", []):
            path = str(item.get("path") or "")
            expected_sha = str(item.get("sha256") or "")
            try:
                ev = load_capture_evidence(Path(path))
                ep = ev["payload"]
                fresh = audit_capture_result(ep, min_samples=1)
                reasons = []
                if expected_sha and ev.get("sha256") != expected_sha:
                    reasons.append("session_sha_mismatch")
                if ev.get("sha256") in seen_sha:
                    reasons.append("duplicate_evidence_sha")
                if ep.get("device_id") != payload.get("device_id"):
                    reasons.append("device_mismatch")
                if ep.get("family") != payload.get("family"):
                    reasons.append("family_mismatch")
                if ep.get("experiment_label") != label:
                    reasons.append("label_mismatch")
                stored_quality = ep.get("quality")
                if not isinstance(stored_quality, dict) or stored_quality.get("quality_pass") is not True:
                    reasons.append("stored_quality_failed")
                if fresh.get("quality_pass") is not True:
                    reasons.extend(f"quality:{x}" for x in fresh.get("blocking_reasons", []))
                row = {"path": path, "record": ev, "label": label, "fresh_quality": fresh}
                if reasons:
                    invalid.append({**row, "reasons": sorted(set(reasons))})
                else:
                    valid.append(row)
                    seen_sha.add(ev.get("sha256"))
            except Exception as exc:
                invalid.append({"path": path, "label": label, "reasons": [str(exc)]})
    return payload, valid, invalid


def _payload_counter(entries: list[dict], label: str) -> Counter:
    return frame_counts_from_evidence(entries, label=label)


def _repeatability(counts: Counter) -> dict:
    total = sum(counts.values())
    if total <= 0:
        return {"sample_count": 0, "unique_frames": 0, "dominant_count": 0, "dominant_ratio": 0.0}
    dominant_count = counts.most_common(1)[0][1]
    return {
        "sample_count": total,
        "unique_frames": len(counts),
        "dominant_count": dominant_count,
        "dominant_ratio": round(dominant_count / total, 4),
    }


def session_quality_report(session: dict) -> dict:
    payload, valid, invalid = _load_session_evidence(session)
    p = progress(_session_record(session))

    by_label = defaultdict(list)
    for entry in valid:
        by_label[entry["label"]].append(entry)

    baseline_counts = _payload_counter(valid, BASELINE_LABEL)
    baseline_present = bool(by_label.get(BASELINE_LABEL))
    baseline_repeat = _repeatability(baseline_counts)

    label_reports = {}
    duplicate_payloads = 0
    total_payload_samples = 0
    action_signal_labels = 0
    action_labels_with_samples = 0

    for step in payload.get("plan", []):
        label = str(step.get("label") or "")
        entries = by_label.get(label, [])
        counts = _payload_counter(entries, label)
        repeat = _repeatability(counts)
        total_payload_samples += repeat["sample_count"]
        duplicate_payloads += max(0, repeat["sample_count"] - repeat["unique_frames"])
        signal = None
        if label != BASELINE_LABEL and counts:
            action_labels_with_samples += 1
            signal = subtract_baseline(counts, baseline_counts)
            if signal["signal"]:
                action_signal_labels += 1
        label_reports[label] = {
            "required_captures": int(step.get("required", 0)),
            "valid_captures": len(entries),
            "capture_requirement_met": len(entries) >= int(step.get("required", 0)),
            "repeatability": repeat,
            "signal_vs_baseline": signal,
        }

    duplicate_ratio = 0.0 if total_payload_samples == 0 else round(duplicate_payloads / total_payload_samples, 4)
    blocking = []
    if invalid:
        blocking.append("invalid_or_mismatched_evidence")
    if not baseline_present:
        blocking.append("baseline_missing")
    if not p.get("complete"):
        blocking.append("session_incomplete")
    if baseline_present and baseline_repeat["sample_count"] == 0:
        blocking.append("baseline_has_no_samples")
    if action_labels_with_samples and action_signal_labels == 0:
        blocking.append("no_action_signal_after_baseline")

    report_pass = not blocking
    return {
        "session_id": payload.get("session_id"),
        "family": payload.get("family"),
        "device_id": payload.get("device_id"),
        "hardware_io": "READ_ONLY_ONLY",
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "session_complete": bool(p.get("complete")),
        "quality_pass": report_pass,
        "blocking_reasons": blocking,
        "valid_evidence_count": len(valid),
        "invalid_evidence_count": len(invalid),
        "invalid_evidence": invalid,
        "baseline": {
            "present": baseline_present,
            "repeatability": baseline_repeat,
        },
        "payload_sample_count": total_payload_samples,
        "duplicate_payload_count": duplicate_payloads,
        "duplicate_payload_ratio": duplicate_ratio,
        "action_labels_with_samples": action_labels_with_samples,
        "action_labels_with_signal_after_baseline": action_signal_labels,
        "labels": label_reports,
        "rule": "Session quality PASS is evidence-quality only; it never verifies hardware protocol semantics.",
    }
