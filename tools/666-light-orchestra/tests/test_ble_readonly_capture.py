"""Offline tests for Windows BLE binding and read-only capture architecture."""
from __future__ import annotations

import asyncio
import importlib
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

core = importlib.import_module("666_light_orchestra")
capture = importlib.import_module("ble_readonly_capture")
from device_registry import DeviceRegistry


class FakeChar:
    def __init__(self, uuid, properties):
        self.uuid = uuid
        self.properties = properties


class FakeService:
    def __init__(self, uuid, chars):
        self.uuid = uuid
        self.characteristics = chars


class FakeClient:
    def __init__(self, address):
        self.address = address
        self.is_connected = False
        self.services = [FakeService("fff0", [FakeChar("fff3", ["write-without-response"]), FakeChar("fff4", ["notify"])])]
        self.notifications = {}
        self.writes = []

    async def connect(self, timeout=10.0):
        self.is_connected = True

    async def start_notify(self, uuid, callback):
        self.notifications[uuid] = callback
        callback(uuid, bytes.fromhex("7e 04 04 01 00 01 ff 00 ef"))

    async def stop_notify(self, uuid):
        self.notifications.pop(uuid, None)

    async def disconnect(self):
        self.is_connected = False

    async def write_gatt_char(self, *args, **kwargs):
        self.writes.append((args, kwargs))
        raise AssertionError("read-only capture must never write")


class BleReadOnlyCaptureTests(unittest.TestCase):
    def test_registry_binding_persists_but_disables_device(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "registry.json"
            registry = DeviceRegistry(path)
            result = registry.bind_windows_address("lenze_1", "AA:BB:CC:DD:EE:01")
            self.assertEqual(result["windows_ble_address"], "AA:BB:CC:DD:EE:01")
            self.assertFalse(result["enabled"])
            loaded = DeviceRegistry(path).get("lenze_1")
            self.assertEqual(loaded["windows_ble_address"], "AA:BB:CC:DD:EE:01")
            self.assertFalse(loaded["enabled"])

    def test_registry_rejects_non_ble_binding_and_bad_address(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            with self.assertRaisesRegex(ValueError, "only for BLE"):
                registry.bind_windows_address("govee_h6047", "AA:BB")
            with self.assertRaises(ValueError):
                registry.bind_windows_address("lenze_1", "bad\naddress")

    def test_read_only_capture_collects_services_and_notifications_without_writes(self):
        result = asyncio.run(capture.capture_read_only(
            "AA:BB:CC:DD:EE:01",
            ["fff4"],
            duration_s=0.1,
            client_factory=FakeClient,
        ))
        self.assertTrue(result["ok"])
        self.assertEqual(result["hardware_io"], "READ_ONLY")
        self.assertEqual(result["write_operations"], 0)
        self.assertEqual(len(result["samples"]), 1)
        self.assertEqual(result["samples"][0]["payload_hex"], "7E 04 04 01 00 01 FF 00 EF")
        self.assertEqual(result["characteristics"][1]["characteristic_uuid"], "fff4")

    def test_engine_binding_does_not_enable_write_path(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            result = engine.bind_windows_ble("oc21w_1", "11:22:33:44:55:66")
            self.assertTrue(result["ok"])
            self.assertFalse(result["device"]["enabled"])
            self.assertFalse(engine._device_selected(engine.magic_lantern))

    def test_engine_read_only_capture_analysis_marks_candidate_not_verified(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            registry.bind_windows_address("oc21w_1", "11:22:33:44:55:66")
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            fake_capture = {
                "ok": True,
                "hardware_io": "READ_ONLY",
                "samples": [{
                    "characteristic_uuid": core.MAGIC_NOTIFY_UUID,
                    "payload_hex": "7E 04 04 01 00 01 FF 00 EF",
                }],
                "write_operations": 0,
            }
            with mock.patch.object(core, "ble_capture_read_only", return_value=fake_capture):
                result = asyncio.run(engine.capture_ble_read_only("oc21w_1", 0.1))
            self.assertTrue(result["ok"])
            self.assertFalse(result["analysis"]["hardware_verified"])
            self.assertEqual(result["analysis"]["candidate_commands"]["power_candidate"], 1)

    def test_capture_requires_explicit_windows_binding(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            with self.assertRaisesRegex(ValueError, "windows_ble_address_not_bound"):
                asyncio.run(engine.capture_ble_read_only("lenze_1", 0.1))


if __name__ == "__main__":
    unittest.main()
