"""Engine integration tests for BLE protocol design. No BLE IO."""
from __future__ import annotations

import importlib
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
core = importlib.import_module("666_light_orchestra")
from device_registry import DeviceRegistry


class ProtocolEngineIntegrationTests(unittest.TestCase):
    def make_engine(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        registry = DeviceRegistry(Path(temp.name) / "registry.json")
        patcher = mock.patch.object(core, "DeviceRegistry", return_value=registry)
        patcher.start()
        self.addCleanup(patcher.stop)
        return core.Engine(core.DEFAULT_CONFIG)

    def test_status_exposes_protocol_profiles_without_hardware_io(self):
        engine = self.make_engine()
        status = engine.status()
        self.assertIn("protocol_design", status)
        self.assertFalse(status["protocol_design"]["hardware_io"])
        self.assertEqual(status["protocol_design"]["lenze"]["frame_verification"], "unknown")
        self.assertEqual(status["protocol_design"]["oc21w"]["frame_verification"], "candidate")
        self.assertFalse(status["protocol_design"]["lenze"]["hardware_writes_allowed_by_design"])
        self.assertFalse(status["protocol_design"]["oc21w"]["hardware_writes_allowed_by_design"])

    def test_lenze_dry_run_returns_capture_required(self):
        engine = self.make_engine()
        result = engine.plan_protocol_command("lenze", "rgb", {"r": 1, "g": 2, "b": 3})
        self.assertTrue(result["ok"])
        self.assertFalse(result["hardware_io"])
        self.assertEqual(result["status"], "needs_protocol_capture")
        self.assertEqual(result["candidate_frames_hex"], [])

    def test_oc21w_dry_run_generates_candidate_only_frame(self):
        engine = self.make_engine()
        result = engine.plan_protocol_command("oc21w", "brightness", {"value": 73})
        self.assertTrue(result["ok"])
        self.assertFalse(result["hardware_io"])
        self.assertEqual(result["status"], "candidate_only")
        self.assertEqual(result["candidate_frames_hex"], ["7E 04 01 49 01 FF FF 00 EF"])

    def test_audio_preview_never_writes(self):
        engine = self.make_engine()
        with mock.patch.object(engine.magic_lantern, "_write_all") as oc_write, mock.patch.object(engine.lenze, "set_color") as lenze_write:
            oc = engine.plan_audio_protocol("oc21w", {"energy": 255, "drop": True})
            le = engine.plan_audio_protocol("lenze", {"energy": 255, "drop": True})
            self.assertEqual(oc["intent"]["params"]["brightness"], 100)
            self.assertEqual(oc["status"], "candidate_only")
            self.assertEqual(le["status"], "needs_protocol_capture")
            oc_write.assert_not_called()
            lenze_write.assert_not_called()

    def test_unknown_family_fails_closed(self):
        engine = self.make_engine()
        with self.assertRaisesRegex(ValueError, "unknown_protocol_family"):
            engine.plan_protocol_command("mystery", "rgb", {})

    def test_device_status_does_not_mislabel_oc21w_protocol_as_verified(self):
        engine = self.make_engine()
        oc = engine.magic_lantern.status()
        le = engine.lenze.status()
        self.assertFalse(oc["command_protocol_verified"])
        self.assertEqual(oc["frame_verification"], "candidate")
        self.assertFalse(le["command_protocol_verified"])
        self.assertEqual(le["frame_verification"], "unknown")


if __name__ == "__main__":
    unittest.main()
