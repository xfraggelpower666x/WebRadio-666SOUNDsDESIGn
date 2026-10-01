"""Offline-Regression: No LAN/BLE hardware required or contacted."""
from __future__ import annotations

import asyncio
import importlib
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
core = importlib.import_module("666_light_orchestra")


class SafetyRegression(unittest.TestCase):
    def test_govee_requires_confirmed_lan_before_power_or_color(self):
        g = core.GoveeLan({"enabled": True, "device_ip": "192.168.2.32"})
        with mock.patch.object(g, "_send") as sender:
            with self.assertRaisesRegex(RuntimeError, "GOVEE_LAN_UNVERIFIED"):
                asyncio.run(g.set_power(True))
            with self.assertRaisesRegex(RuntimeError, "GOVEE_LAN_UNVERIFIED"):
                asyncio.run(g.set_color(100, 20, 50))
            sender.assert_not_called()

    def test_govee_probe_unlocks_but_expires(self):
        g = core.GoveeLan({"enabled": True, "device_ip": "192.168.2.32"})
        with mock.patch.object(g, "_probe_sync", return_value={"ok": True, "status": {"onOff": 1, "brightness": 40}}):
            self.assertTrue(asyncio.run(g.probe())["ok"])
        with mock.patch.object(g, "_send") as sender:
            asyncio.run(g.set_color(7, 20, 90, 70))
            self.assertEqual(sender.call_count, 2)
            g._last_probe_ok -= 301
            with self.assertRaisesRegex(RuntimeError, "GOVEE_LAN_UNVERIFIED_OR_STALE"):
                asyncio.run(g.set_color(1, 2, 3))
            self.assertEqual(sender.call_count, 2)

    def test_govee_audio_rate_limited(self):
        g = core.GoveeLan({"enabled": True, "device_ip": "192.168.2.32"})
        with mock.patch.object(g, "_probe_sync", return_value={"ok": True, "status": {"onOff": 1, "brightness": 50}}):
            asyncio.run(g.probe())
        with mock.patch.object(g, "_send") as sender:
            first = asyncio.run(g.audio({"energy": 200, "bass": 150, "mid": 75, "high": 30}))
            second = asyncio.run(g.audio({"energy": 100, "bass": 200, "mid": 60, "high": 20}))
            self.assertTrue(first["ok"])
            self.assertTrue(second["throttled"])
            self.assertEqual(sender.call_count, 2)

    def test_magic_requires_hardware_protocol_proof_and_allowlist(self):
        cfg = {**core.DEFAULT_CONFIG["magic_lantern"], "write_enabled": True}
        device = core.MagicLanternFleet(cfg)
        with self.assertRaisesRegex(RuntimeError, "MAGIC_LANTERN_WRITE_BLOCKED"):
            asyncio.run(device.set_power(True))
        cfg["protocol_verified"] = True
        with self.assertRaisesRegex(RuntimeError, "MAGIC_LANTERN_WRITE_BLOCKED"):
            asyncio.run(device.set_power(True))

    def test_engine_reports_adapter_failure(self):
        engine = core.Engine(core.merge(core.DEFAULT_CONFIG, {"govee": {"enabled": False}}))
        class FakeAdapter:
            def __init__(self, name, value=None, raises=False):
                self.name, self.value, self.raises = name, value, raises
            def status(self):
                return {"kind": self.name}
            async def audio(self, _):
                if self.raises:
                    raise RuntimeError("offline failure")
                return self.value
        engine.devices = [
            FakeAdapter("govee", {"ok": False, "reason": "probe_required"}),
            FakeAdapter("lenze", raises=True),
            FakeAdapter("magic_lantern", {"ok": True, "skipped": "safety_block"}),
        ]
        result = asyncio.run(engine.audio({"energy": 0}))
        self.assertFalse(result["ok"])
        self.assertEqual({v["device"] for v in result["errors"]}, {"govee", "lenze"})

    def test_version_and_security_defaults(self):
        self.assertEqual(core.VERSION, "0.5.0-dev")
        self.assertFalse(core.DEFAULT_CONFIG["magic_lantern"]["write_enabled"])
        self.assertFalse(core.DEFAULT_CONFIG["magic_lantern"]["protocol_verified"])
        self.assertEqual(core.DEFAULT_CONFIG["magic_lantern"]["approved_windows_addresses"], [])
        self.assertNotIn("*", core.DEFAULT_CONFIG["server"]["allowed_origins"])


if __name__ == "__main__":
    unittest.main()
