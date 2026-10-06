"""Tests for pure BLE GUI model; no Tk and no hardware."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ble_gui_model import ble_registry_entries, propose_bindings, capture_summary, protocol_badge


class BleGuiModelTests(unittest.TestCase):
    def setUp(self):
        self.registry = [
            {"id": "lenze_1", "family": "lenze", "transport": "ble", "windows_ble_address": None},
            {"id": "lenze_2", "family": "lenze", "transport": "ble", "windows_ble_address": None},
            {"id": "oc21w_1", "family": "magic_lantern", "transport": "ble", "windows_ble_address": "11:22"},
            {"id": "govee_h6047", "family": "govee", "transport": "lan"},
        ]

    def test_ble_registry_filter(self):
        ids = [x["id"] for x in ble_registry_entries(self.registry)]
        self.assertEqual(ids, ["lenze_1", "lenze_2", "oc21w_1"])

    def test_binding_proposals_are_non_mutating_and_deterministic(self):
        before = [dict(x) for x in self.registry]
        result = propose_bindings([
            {"name": "LENZE-RGB A", "address": "AA", "family": "lenze", "rssi": -50},
            {"name": "LENZE-RGB B", "address": "BB", "family": "lenze", "rssi": -60},
            {"name": "OC21W", "address": "11:22", "family": "magic_lantern", "rssi": -70},
        ], self.registry)
        self.assertEqual(result[0]["suggested_device_id"], "lenze_1")
        self.assertEqual(result[1]["suggested_device_id"], "lenze_2")
        self.assertEqual(result[2]["binding_state"], "BOUND")
        self.assertEqual(self.registry, before)

    def test_capture_summary_never_promotes_hardware(self):
        summary = capture_summary({
            "device_id": "oc21w_1",
            "family": "magic_lantern",
            "hardware_io": "READ_ONLY",
            "capture": {
                "samples": [{"payload_hex": "7E"}],
                "characteristics": [{"characteristic_uuid": "fff4"}],
                "subscribed": ["fff4"],
                "errors": [],
            },
            "analysis": {
                "hardware_verified": False,
                "candidate_commands": {"power_candidate": 1},
                "rows": [{"analysis": {"confidence": "candidate_match"}}],
            },
        })
        self.assertEqual(summary["samples"], 1)
        self.assertFalse(summary["hardware_verified"])
        self.assertEqual(summary["candidate_commands"]["power_candidate"], 1)

    def test_protocol_badge(self):
        self.assertEqual(protocol_badge({"frame_verification": "candidate", "hardware_writes_allowed_by_design": False}), "CANDIDATE · WRITE-BLOCKED")


if __name__ == "__main__":
    unittest.main()
