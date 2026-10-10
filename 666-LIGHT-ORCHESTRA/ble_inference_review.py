"""Build a manual inference-review package from one validated BLE session.

The package is strictly read-only, scoped to one session/device, and never
promotes candidate protocol semantics to hardware-verified state.
"""
from __future__ import annotations

from ble_protocol_inference import infer_candidate_fields
from ble_session_quality import _load_session_evidence, _session_record, session_quality_report


def build_inference_review(session: dict) -> dict:
    record = _session_record(session)
    payload, valid, invalid = _load_session_evidence(record)
    quality = session_quality_report(record)
    inference = infer_candidate_fields(valid, payload.get("family"))

    blocking = list(quality.get("blocking_reasons", []))
    readiness = inference.get("readiness", {})
    if not readiness.get("ready_for_manual_inference_review"):
        blocking.append("capture_plan_incomplete")
    if invalid and "invalid_or_mismatched_evidence" not in blocking:
        blocking.append("invalid_or_mismatched_evidence")

    candidates = inference.get("ranked_candidate_fields", [])
    if quality.get("quality_pass") and readiness.get("ready_for_manual_inference_review") and not candidates:
        blocking.append("no_stable_cross_label_candidate_fields")

    review_ready = not blocking
    return {
        "session_id": payload.get("session_id"),
        "family": payload.get("family"),
        "device_id": payload.get("device_id"),
        "hardware_io": "READ_ONLY_ONLY",
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "manual_review_ready": review_ready,
        "blocking_reasons": sorted(set(blocking)),
        "quality": quality,
        "readiness": readiness,
        "dominant_frames": inference.get("dominant_frames", {}),
        "ranked_candidate_fields": candidates,
        "pairwise_differences": inference.get("pairwise_differences", []),
        "within_label_stability": inference.get("within_label_stability", {}),
        "review_rule": (
            "This package may guide human protocol review only. Real hardware write validation "
            "is required before any protocol or capability can become VERIFIED."
        ),
    }
