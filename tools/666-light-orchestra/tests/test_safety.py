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

    def test_govee_discovery_candidate_without_probe_does_not_unlock_writes(self):
        g = core.GoveeLan({"enabled": True, "device_ip": None, "model": "H6047"})
        with mock.patch.object(g, "_discover", return_value="192.168.2.32"), mock.patch.object(
            g, "_probe_ip_sync", return_value={"ok": False, "reason": "no_matching_udp_response"}
        ), mock.patch.object(g, "_send") as sender:
            result = asyncio.run(g.discover())
            self.assertTrue(result["ok"])
            self.assertEqual(result["hardware_io"], "READ_ONLY_DISCOVERY")
            self.assertEqual(result["ip"], "192.168.2.32")
            self.assertFalse(result["hardware_verified"])
            self.assertFalse(result["write_allowed"])
            self.assertFalse(g.online)
            with self.assertRaisesRegex(RuntimeError, "GOVEE_LAN_UNVERIFIED"):
                asyncio.run(g.set_power(True))
            sender.assert_not_called()

    def test_govee_discovery_checks_configured_ip_before_multicast(self):
        g = core.GoveeLan({"enabled": True, "device_ip": "192.168.2.32", "model": "H6047"})
        with mock.patch.object(
            g, "_probe_ip_sync", return_value={"ok": True, "status": {"onOff": 1, "brightness": 40}}
        ) as probe, mock.patch.object(g, "_discover") as multicast:
            result = asyncio.run(g.discover())
        self.assertTrue(result["ok"])
        self.assertEqual(result["source"], "configured_ip_probe")
        self.assertEqual(result["ip"], "192.168.2.32")
        self.assertTrue(result["write_allowed"])
        self.assertTrue(g.online)
        probe.assert_called_once_with("192.168.2.32")
        multicast.assert_not_called()

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


    def test_master_disabled_blocks_manual_commands(self):
        import tempfile
        from device_registry import DeviceRegistry
        with tempfile.TemporaryDirectory() as tmp:
            registry = DeviceRegistry(Path(tmp) / "registry.json")
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            engine.enabled = False
            with mock.patch.object(engine.govee, "_send") as sender:
                self.assertEqual(asyncio.run(engine.set_power(True))["error"], "MASTER_DISABLED")
                self.assertEqual(asyncio.run(engine.set_color(5, 15, 25))["error"], "MASTER_DISABLED")
                with self.assertRaisesRegex(RuntimeError, "MASTER_DISABLED"):
                    asyncio.run(engine.test_device_color("govee_h6047", 1, 2, 3))
                sender.assert_not_called()

    def test_registry_disabled_govee_prevents_all_hardware_commands(self):
        import tempfile
        from device_registry import DeviceRegistry
        with tempfile.TemporaryDirectory() as tmp:
            registry = DeviceRegistry(Path(tmp) / "registry.json")
            registry.edit("govee_h6047", {"enabled": False})
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            with mock.patch.object(engine.govee, "_send") as sender:
                power = asyncio.run(engine.set_power(True))
                color = asyncio.run(engine.set_color(1, 2, 3))
                audio = asyncio.run(engine.audio({"energy": 255, "kick": True}))
                self.assertTrue(power["ok"])
                self.assertTrue(color["ok"])
                self.assertTrue(audio["ok"])
                self.assertTrue(any(x.get("skipped") for x in color["results"]))
                with self.assertRaisesRegex(RuntimeError, "WRITE_BLOCKED"):
                    asyncio.run(engine.test_device_color("govee_h6047", 1, 2, 3))
                sender.assert_not_called()

    def test_bluetooth_controller_needs_verified_windows_addresses(self):
        import tempfile
        from device_registry import DeviceRegistry
        with tempfile.TemporaryDirectory() as tmp:
            registry = DeviceRegistry(Path(tmp) / "registry.json")
            registry.edit("oc21w_1", {"enabled": True})
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            self.assertFalse(engine._device_selected(engine.magic_lantern))
            engine.magic_lantern.devices = {"FAKE-WINDOWS": object()}
            self.assertFalse(engine._device_selected(engine.magic_lantern))


    def test_bridge_rejects_non_loopback_bindings(self):
        for host in ("0.0.0.0", "192.168.2.32", "example.com", "::"):
            with self.subTest(host=host), self.assertRaisesRegex(ValueError, "LOOPBACK_ONLY"):
                core.Bridge(object(), host, 3000)
        for host in ("127.0.0.1", "localhost", "::1"):
            bridge = core.Bridge(object(), host, 3000)
            self.assertEqual(bridge.host, host)
            bridge.loop.close()

    def test_direct_magic_mode_obeys_master_and_registry_gates(self):
        import tempfile
        from device_registry import DeviceRegistry
        with tempfile.TemporaryDirectory() as temp:
            registry = DeviceRegistry(Path(temp) / "registry.json")
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            with mock.patch.object(engine.magic_lantern, "set_mode") as send:
                engine.enabled = False
                with self.assertRaisesRegex(RuntimeError, "MASTER_DISABLED"):
                    asyncio.run(engine.set_magic_mode(1))
                engine.enabled = True
                with self.assertRaisesRegex(RuntimeError, "MAGIC_LANTERN_WRITE_BLOCKED"):
                    asyncio.run(engine.set_magic_mode(1))
                send.assert_not_called()

    def test_govee_probe_rejects_boolean_udp_status_fields(self):
        # Strict validation: Python bool is an int subclass, but not a real LAN status integer.
        import socket
        from unittest.mock import patch
        g = core.GoveeLan({"enabled": True, "device_ip": "192.168.2.32"})
        class FakeSocket:
            def __init__(self):
                self.received = False
            def settimeout(self, *_): pass
            def bind(self, *_): pass
            def close(self): pass
            def recvfrom(self, *_):
                if not self.received:
                    self.received = True
                    return (b'{"msg":{"cmd":"devStatus","data":{"onOff":true,"brightness":true}}}', ("192.168.2.32", 4003))
                raise socket.timeout()
        with patch.object(core.socket, "socket", return_value=FakeSocket()), patch.object(g, "_send"):
            status = g._probe_sync()
        self.assertFalse(status["ok"])


if __name__ == "__main__":
    unittest.main()
