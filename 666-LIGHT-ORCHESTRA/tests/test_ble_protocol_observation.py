"""Offline tests for BLE observation/evidence analysis."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ble_protocol_observation import Observation, analyze, evidence_summary, normalize_hex


class BleProtocolObservationTests(unittest.TestCase):
    def test_normalize_hex_accepts_common_separators(self):
        self.assertEqual(normalize_hex("7e:04-04 01 00 01 ff 00 ef"), "7E 04 04 01 00 01 FF 00 EF")

    def test_invalid_hex_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "invalid_hex|hex_length"):
            normalize_hex("ZZ")

    def test_oc21w_candidate_classification(self):
        result = analyze(Observation(
            family="oc21w",
            direction="tx",
            characteristic_uuid="fff3",
            payload_hex="7E 07 05 03 FF 14 DC 10 EF",
            label="pink",
        ))
        self.assertTrue(result.valid_hex)
        self.assertEqual(result.frame_family, "7e-length-command-5payload-ef")
        self.assertEqual(result.command_byte, 0x05)
        self.assertEqual(result.candidate_command, "rgb_candidate")
        self.assertEqual(result.confidence, "candidate_match")

    def test_lenze_does_not_inherit_oc21w_semantics(self):
        result = analyze(Observation(
            family="lenze",
            direction="tx",
            characteristic_uuid="fff3",
            payload_hex="7E 07 05 03 FF 14 DC 10 EF",
        ))
        self.assertTrue(result.valid_hex)
        self.assertIsNone(result.candidate_command)
        self.assertIn("Do not transfer OC21W semantics", result.notes[0])

    def test_unknown_lenze_payload_is_preserved_as_observation(self):
        result = analyze(Observation(
            family="lenze",
            direction="notify",
            characteristic_uuid="fff4",
            payload_hex="01 02 03 04",
        ))
        self.assertEqual(result.frame_family, "lenze_unresolved_capture")
        self.assertEqual(result.confidence, "observation_only")
        self.assertFalse(any("verified" in n.lower() for n in result.notes))

    def test_evidence_summary_never_claims_hardware_verified(self):
        summary = evidence_summary([
            Observation("oc21w", "tx", "fff3", "7E 04 04 01 00 01 FF 00 EF"),
            Observation("lenze", "notify", "fff4", "01 02 03 04"),
        ])
        self.assertEqual(summary["observation_count"], 2)
        self.assertFalse(summary["hardware_verified"])
        self.assertEqual(summary["candidate_commands"]["power_candidate"], 1)


if __name__ == "__main__":
    unittest.main()
