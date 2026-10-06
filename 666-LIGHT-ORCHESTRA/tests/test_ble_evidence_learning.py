"""Offline tests for BLE evidence learning."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ble_capture_store import save_capture_evidence
from ble_evidence_learning import (
    compare_frames,
    learning_summary,
    load_evidence_directory,
)


class BleEvidenceLearningTests(unittest.TestCase):
    def make_capture(self, device_id, family, frames):
        return {
            "ok": True,
            "hardware_io": "READ_ONLY",
            "device_id": device_id,
            "family": family,
            "capture": {
                "samples": [
                    {"characteristic_uuid": "fff4", "payload_hex": frame}
                    for frame in frames
                ],
                "characteristics": [{"characteristic_uuid": "fff4"}],
                "write_operations": 0,
            },
            "analysis": {"hardware_verified": False, "rows": []},
        }

    def test_load_directory_verifies_hashes_and_reports_invalid(self):
        with tempfile.TemporaryDirectory() as td:
            save_capture_evidence(self.make_capture("lenze_1", "lenze", ["01 02 03 04"]), td)
            bad = Path(td) / "bad.json"
            bad.write_text(json.dumps({"payload": {"device_id": "x"}, "sha256": "broken"}), encoding="utf-8")
            result = load_evidence_directory(td)
            self.assertEqual(result["valid_count"], 1)
            self.assertEqual(result["invalid_count"], 1)

    def test_lenze_learning_shows_variability_without_verification(self):
        with tempfile.TemporaryDirectory() as td:
            save_capture_evidence(self.make_capture("lenze_1", "lenze", ["01 02 03 04", "01 02 09 04"]), td)
            loaded = load_evidence_directory(td)
            summary = learning_summary(loaded["valid"], family="lenze")
            self.assertEqual(summary["sample_count"], 2)
            self.assertFalse(summary["hardware_verified"])
            self.assertFalse(summary["automatic_promotion_allowed"])
            variable = summary["variability_by_length"]["4"]["variable_positions"]
            self.assertEqual(variable, [{"index": 2, "values_hex": ["03", "09"]}])

    def test_oc21w_candidate_counts_are_structural_only(self):
        with tempfile.TemporaryDirectory() as td:
            save_capture_evidence(self.make_capture("oc21w_1", "magic_lantern", [
                "7E 04 04 01 00 01 FF 00 EF",
                "7E 07 05 03 FF 14 DC 10 EF",
            ]), td)
            loaded = load_evidence_directory(td)
            summary = learning_summary(loaded["valid"], family="magic_lantern")
            self.assertEqual(summary["candidate_command_counts"]["power_candidate"], 1)
            self.assertEqual(summary["candidate_command_counts"]["rgb_candidate"], 1)
            self.assertFalse(summary["hardware_verified"])

    def test_compare_frames_lists_only_changed_positions(self):
        result = compare_frames("01 02 03 04", "01 02 09 04")
        self.assertFalse(result["equal"])
        self.assertEqual(result["differences"], [{"index": 2, "a": "03", "b": "09"}])

    def test_filter_by_device(self):
        with tempfile.TemporaryDirectory() as td:
            save_capture_evidence(self.make_capture("lenze_1", "lenze", ["01 01"]), td)
            save_capture_evidence(self.make_capture("lenze_2", "lenze", ["02 02"]), td)
            loaded = load_evidence_directory(td)
            summary = learning_summary(loaded["valid"], family="lenze", device_id="lenze_2")
            self.assertEqual(summary["sample_count"], 1)
            self.assertEqual(summary["device_counts"], {"lenze_2": 1})


if __name__ == "__main__":
    unittest.main()
