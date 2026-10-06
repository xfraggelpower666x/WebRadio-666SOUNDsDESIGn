"""Offline tests for session-scoped BLE inference review packages."""
from __future__ import annotations

import tempfile
import unittest

from ble_capture_quality import audit_capture_result
from ble_capture_store import save_capture_evidence
from ble_experiment_session import create_session, load_session, register_evidence
from ble_inference_review import build_inference_review


class InferenceReviewTests(unittest.TestCase):
    def capture(self, device, family, label, frame, notes):
        result = {
            "ok": True,
            "hardware_io": "READ_ONLY",
            "device_id": device,
            "family": family,
            "experiment_label": label,
            "notes": notes,
            "capture": {
                "samples": [{"payload_hex": frame, "characteristic_uuid": "fff4"}],
                "errors": [],
                "characteristics": [{"characteristic_uuid": "fff4"}],
                "subscribed": ["fff4"],
                "write_operations": 0,
            },
            "analysis": {"hardware_verified": False, "rows": []},
        }
        result["quality"] = audit_capture_result(result)
        return result

    def add(self, record, td, label, frame, index):
        payload = record["payload"]
        ev = save_capture_evidence(
            self.capture(payload["device_id"], payload["family"], label, frame, f"{label}-{index}"),
            td,
        )
        return register_evidence(record, ev["path"], td)["session"]

    def test_incomplete_session_review_is_blocked(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            record = self.add(record, td, "baseline_no_action", "01 02 00 04", 1)
            review = build_inference_review(record)
            self.assertFalse(review["manual_review_ready"])
            self.assertIn("session_incomplete", review["blocking_reasons"])
            self.assertIn("capture_plan_incomplete", review["blocking_reasons"])
            self.assertFalse(review["hardware_verified"])

    def test_complete_session_can_be_review_ready_but_never_verified(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            plan = list(record["payload"]["plan"])
            for step_no, step in enumerate(plan):
                label = step["label"]
                frame = f"01 02 {step_no + 1:02X} 04"
                for i in range(step["required"]):
                    record = self.add(record, td, label, frame, i)
            review = build_inference_review(record)
            self.assertTrue(review["quality"]["quality_pass"])
            self.assertTrue(review["readiness"]["ready_for_manual_inference_review"])
            self.assertTrue(review["manual_review_ready"])
            self.assertGreater(len(review["ranked_candidate_fields"]), 0)
            self.assertFalse(review["hardware_verified"])
            self.assertFalse(review["automatic_promotion_allowed"])


if __name__ == "__main__":
    unittest.main()
