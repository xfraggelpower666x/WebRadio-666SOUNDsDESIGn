"""Offline tests for session-level BLE evidence quality."""
from __future__ import annotations

import tempfile
import unittest

from ble_capture_quality import audit_capture_result
from ble_capture_store import save_capture_evidence
from ble_experiment_session import create_session, load_session, register_evidence
from ble_session_quality import session_quality_report


class SessionQualityTests(unittest.TestCase):
    def capture(self, device, family, label, frame):
        result = {
            "ok": True,
            "hardware_io": "READ_ONLY",
            "device_id": device,
            "family": family,
            "experiment_label": label,
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

    def add(self, record, td, device, family, label, frame):
        ev = save_capture_evidence(self.capture(device, family, label, frame), td)
        return register_evidence(record, ev["path"], td)["session"]

    def test_incomplete_session_blocks_quality_pass(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            record = self.add(record, td, "lenze_1", "lenze", "baseline_no_action", "AA")
            report = session_quality_report(record)
            self.assertFalse(report["quality_pass"])
            self.assertIn("session_incomplete", report["blocking_reasons"])
            self.assertTrue(report["baseline"]["present"])

    def test_baseline_missing_blocks(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            record = self.add(record, td, "lenze_1", "lenze", "official_app_power_on", "AB")
            report = session_quality_report(record)
            self.assertIn("baseline_missing", report["blocking_reasons"])

    def test_signal_after_baseline_is_reported(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            record = self.add(record, td, "lenze_1", "lenze", "baseline_no_action", "AA")
            record = self.add(record, td, "lenze_1", "lenze", "official_app_power_on", "AB")
            report = session_quality_report(record)
            power = report["labels"]["official_app_power_on"]
            self.assertEqual(power["signal_vs_baseline"]["signal"], {"AB": 1})
            self.assertEqual(report["action_labels_with_signal_after_baseline"], 1)
            self.assertFalse(report["hardware_verified"])

    def test_duplicate_payload_ratio_is_counted(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            record = self.add(record, td, "lenze_1", "lenze", "baseline_no_action", "AA")
            record = self.add(record, td, "lenze_1", "lenze", "baseline_no_action", "AA")
            report = session_quality_report(record)
            self.assertGreater(report["duplicate_payload_count"], 0)
            self.assertGreater(report["duplicate_payload_ratio"], 0)

    def test_report_never_promotes_hardware(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("magic_lantern", "oc21w_1", td)
            report = session_quality_report(load_session(created["path"]))
            self.assertFalse(report["hardware_verified"])
            self.assertFalse(report["automatic_promotion_allowed"])
            self.assertEqual(report["hardware_io"], "READ_ONLY_ONLY")


if __name__ == "__main__":
    unittest.main()
