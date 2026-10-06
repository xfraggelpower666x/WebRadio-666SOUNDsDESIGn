"""Offline tests for guided BLE experiment sessions."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from ble_capture_store import save_capture_evidence
from ble_experiment_session import create_session, load_session, register_evidence, progress, list_sessions


class BleExperimentSessionTests(unittest.TestCase):
    def capture(self, device, family, label):
        return {
            "ok": True,
            "hardware_io": "READ_ONLY",
            "device_id": device,
            "family": family,
            "experiment_label": label,
            "capture": {"samples": [], "characteristics": [], "write_operations": 0},
            "analysis": {"hardware_verified": False, "rows": []},
            "quality": {"quality_pass": True},
        }

    def test_create_session_is_read_only_and_has_plan(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            self.assertEqual(record["payload"]["hardware_io"], "READ_ONLY_ONLY")
            self.assertFalse(record["payload"]["automatic_promotion_allowed"])
            p = progress(record)
            self.assertFalse(p["complete"])
            self.assertEqual(p["next_required_label"], "official_app_power_on")

    def test_register_evidence_advances_progress(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            evidence = save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_on"), td)
            saved = register_evidence(record, evidence["path"], td)
            p = progress(saved["session"])
            self.assertEqual(p["completed_required_captures"], 1)
            self.assertEqual(p["next_required_label"], "official_app_power_on")

    def test_duplicate_evidence_is_idempotent(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            evidence = save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_on"), td)
            first = register_evidence(record, evidence["path"], td)
            second = register_evidence(first["session"], evidence["path"], td)
            p = progress(second["session"])
            self.assertEqual(p["completed_required_captures"], 1)

    def test_wrong_device_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            evidence = save_capture_evidence(self.capture("lenze_2", "lenze", "official_app_power_on"), td)
            with self.assertRaisesRegex(ValueError, "device_mismatch"):
                register_evidence(record, evidence["path"], td)

    def test_label_outside_plan_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            created = create_session("lenze", "lenze_1", td)
            record = load_session(created["path"])
            evidence = save_capture_evidence(self.capture("lenze_1", "lenze", "unlabeled"), td)
            with self.assertRaisesRegex(ValueError, "label_not_in_session_plan"):
                register_evidence(record, evidence["path"], td)

    def test_list_sessions_reads_valid_records(self):
        with tempfile.TemporaryDirectory() as td:
            create_session("magic_lantern", "oc21w_1", td)
            rows = list_sessions(td)
            self.assertEqual(len(rows), 1)
            self.assertIn("progress", rows[0])
            self.assertFalse(rows[0]["progress"]["hardware_verified"])


if __name__ == "__main__":
    unittest.main()
