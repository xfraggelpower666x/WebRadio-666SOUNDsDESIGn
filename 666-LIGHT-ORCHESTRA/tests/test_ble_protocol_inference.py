"""Offline tests for BLE protocol inference and readiness gates."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ble_capture_store import save_capture_evidence
from ble_evidence_learning import load_evidence_directory
from ble_protocol_inference import experiment_plan, readiness, infer_candidate_fields


class BleProtocolInferenceTests(unittest.TestCase):
    def capture(self, device, family, label, frames, notes=""):
        return {
            "ok": True,
            "hardware_io": "READ_ONLY",
            "device_id": device,
            "family": family,
            "experiment_label": label,
            "notes": notes,
            "capture": {
                "samples": [{"characteristic_uuid": "fff4", "payload_hex": frame} for frame in frames],
                "characteristics": [{"characteristic_uuid": "fff4"}],
                "write_operations": 0,
            },
            "analysis": {"hardware_verified": False, "rows": []},
        }

    def test_plan_is_known_but_never_auto_promotes(self):
        plan = experiment_plan("lenze")
        self.assertTrue(any(x["label"] == "official_app_power_on" for x in plan))
        with self.assertRaisesRegex(ValueError, "unknown_protocol_family"):
            experiment_plan("mystery")

    def test_readiness_reports_missing_experiments(self):
        with tempfile.TemporaryDirectory() as td:
            save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_on", ["01 02 03 04", "01 02 03 04"]), td)
            loaded = load_evidence_directory(td)
            gate = readiness(loaded["valid"], "lenze")
            self.assertFalse(gate["hardware_verified"])
            self.assertFalse(gate["automatic_promotion_allowed"])
            self.assertFalse(gate["ready_for_manual_inference_review"])
            self.assertGreater(len(gate["missing"]), 0)

    def test_two_samples_in_one_evidence_do_not_count_as_two_captures(self):
        with tempfile.TemporaryDirectory() as td:
            save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_on", ["01 02", "01 02"]), td)
            loaded = load_evidence_directory(td)
            gate = readiness(loaded["valid"], "lenze")
            row = next(x for x in gate["missing"] if x["label"] == "official_app_power_on")
            self.assertEqual(row["captures"], 1)
            self.assertEqual(row["samples"], 2)
            self.assertIn("independent evidence records", gate["counting_rule"])

    def test_inference_finds_stable_cross_label_difference(self):
        with tempfile.TemporaryDirectory() as td:
            for i, frame in enumerate(("01 02 10 04", "01 02 10 04")):
                save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_on", [frame], f"on-{i}"), td)
            for i, frame in enumerate(("01 02 00 04", "01 02 00 04")):
                save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_off", [frame], f"off-{i}"), td)
            loaded = load_evidence_directory(td)
            inferred = infer_candidate_fields(loaded["valid"], "lenze")
            self.assertFalse(inferred["hardware_verified"])
            self.assertFalse(inferred["automatic_promotion_allowed"])
            self.assertEqual(inferred["ranked_candidate_fields"][0]["index"], 2)
            self.assertEqual(inferred["ranked_candidate_fields"][0]["meaning"], "UNRESOLVED_CANDIDATE_FIELD")

    def test_within_label_noise_prevents_false_candidate(self):
        with tempfile.TemporaryDirectory() as td:
            save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_on", ["01 02 10 04", "01 02 11 04"]), td)
            save_capture_evidence(self.capture("lenze_1", "lenze", "official_app_power_off", ["01 02 00 04", "01 02 00 04"]), td)
            loaded = load_evidence_directory(td)
            inferred = infer_candidate_fields(loaded["valid"], "lenze")
            power_pair = next(x for x in inferred["pairwise_differences"] if {x["left"], x["right"]} == {"official_app_power_on", "official_app_power_off"})
            self.assertEqual(power_pair["candidate_positions"], [])

    def test_oc21w_alias_maps_to_magic_lantern(self):
        self.assertEqual(experiment_plan("oc21w"), experiment_plan("magic_lantern"))


if __name__ == "__main__":
    unittest.main()
