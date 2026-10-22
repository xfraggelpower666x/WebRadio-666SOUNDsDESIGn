"""Offline-only tests for BLE protocol design. No BLE hardware is contacted."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ble_protocol_design import (
    LENZE_PROFILE,
    OC21W_PROFILE,
    Verification,
    CommandIntent,
    audio_intent,
    oc21w_frame,
    plan_command,
)


class BleProtocolDesignTests(unittest.TestCase):
    def test_lenze_is_conceptual_but_write_unverified(self):
        self.assertFalse(LENZE_PROFILE.hardware_writes_allowed)
        self.assertEqual(LENZE_PROFILE.frame_verification, Verification.UNKNOWN)
        self.assertTrue(LENZE_PROFILE.capabilities["rgb"].supported)
        self.assertEqual(
            plan_command(LENZE_PROFILE, CommandIntent("rgb", {"r": 1, "g": 2, "b": 3}, "lenze")).status,
            "needs_protocol_capture",
        )

    def test_oc21w_candidate_frames_are_offline_only(self):
        self.assertFalse(OC21W_PROFILE.hardware_writes_allowed)
        plan = plan_command(
            OC21W_PROFILE,
            CommandIntent("rgb", {"r": 255, "g": 20, "b": 220}, "magic_lantern"),
        )
        self.assertEqual(plan.status, "candidate_only")
        self.assertEqual(plan.candidate_frames_hex, ("7E 07 05 03 FF 14 DC 10 EF",))

    def test_oc21w_known_candidate_encoders(self):
        cases = {
            "power": ("7E 04 04 01 00 01 FF 00 EF", {"on": True}),
            "brightness": ("7E 04 01 64 01 FF FF 00 EF", {"value": 100}),
            "mode": ("7E 05 03 83 03 FF FF 00 EF", {"mode": 3}),
            "speed": ("7E 04 02 FF FF FF FF 00 EF", {"speed": 999}),
        }
        for command, (expected, params) in cases.items():
            with self.subTest(command=command):
                plan = plan_command(OC21W_PROFILE, CommandIntent(command, params, "magic_lantern"))
                self.assertEqual(plan.status, "candidate_only")
                self.assertEqual(plan.candidate_frames_hex[0], expected)

    def test_audio_intent_is_protocol_independent(self):
        a = audio_intent("lenze", {"energy": 255, "drop": True})
        b = audio_intent("magic_lantern", {"energy": 255, "drop": True})
        self.assertEqual(a.command, "rgb")
        self.assertEqual(a.params, b.params)
        self.assertEqual(a.params["brightness"], 100)
        self.assertEqual((a.params["r"], a.params["g"], a.params["b"]), (255, 20, 220))

    def test_frame_encoder_is_pure(self):
        frame = oc21w_frame(4, 4, 1, 0, 1, 255, 0)
        self.assertEqual(frame, bytes.fromhex("7e 04 04 01 00 01 ff 00 ef"))


if __name__ == "__main__":
    unittest.main()
