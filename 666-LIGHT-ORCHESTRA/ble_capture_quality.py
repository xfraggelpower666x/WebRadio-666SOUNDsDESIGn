"""Quality gates for read-only BLE experiment evidence."""
from __future__ import annotations
from collections import Counter

BASELINE_LABEL = "baseline_no_action"

def audit_capture_result(result: dict, min_samples: int = 1) -> dict:
    capture = result.get("capture", {}) if isinstance(result, dict) else {}
    samples = capture.get("samples", []) if isinstance(capture, dict) else []
    errors = capture.get("errors", []) if isinstance(capture, dict) else []
    characteristics = capture.get("characteristics", []) if isinstance(capture, dict) else []
    subscribed = capture.get("subscribed", []) if isinstance(capture, dict) else []
    writes = capture.get("write_operations")
    checks = {
        "read_only": result.get("hardware_io") == "READ_ONLY",
        "zero_writes": writes == 0,
        "has_characteristics": bool(characteristics),
        "has_subscription": bool(subscribed),
        "min_samples": isinstance(samples, list) and len(samples) >= int(min_samples),
        "no_capture_errors": not errors,
    }
    blocking = [name for name, ok in checks.items() if not ok]
    return {
        "quality_pass": not blocking,
        "checks": checks,
        "blocking_reasons": blocking,
        "sample_count": len(samples) if isinstance(samples, list) else 0,
        "error_count": len(errors) if isinstance(errors, list) else 0,
        "hardware_verified": False,
    }

def frame_counts_from_evidence(entries: list[dict], label: str | None = None) -> Counter:
    counts = Counter()
    for entry in entries:
        record = entry.get("record", {})
        payload = record.get("payload", {})
        if label is not None and payload.get("experiment_label") != label:
            continue
        capture = payload.get("capture", {})
        for sample in capture.get("samples", []) if isinstance(capture, dict) else []:
            value = str(sample.get("payload_hex") or "").strip().upper()
            if value:
                counts[value] += 1
    return counts

def subtract_baseline(action_counts: Counter, baseline_counts: Counter) -> dict:
    signal = Counter()
    suppressed = Counter()
    for frame, count in action_counts.items():
        noise = baseline_counts.get(frame, 0)
        keep = max(0, count - noise)
        if keep:
            signal[frame] = keep
        if min(count, noise):
            suppressed[frame] = min(count, noise)
    return {
        "signal": dict(signal),
        "baseline_suppressed": dict(suppressed),
        "hardware_verified": False,
    }
