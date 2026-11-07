"""Offline tests for Windows BLE binding and read-only capture architecture."""
from __future__ import annotations

import asyncio
import importlib
import sys
import tempfile
import unittest
from types import SimpleNamespace
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

    def test_bluetooth_preflight_reports_ready_physical_adapter(self):
        payload = {
            "service_status": "Running",
            "devices": [
                {"FriendlyName": "Intel(R) Wireless Bluetooth(R)", "Status": "OK", "InstanceId": "USB\\VID_1", "Problem": 0},
                {"FriendlyName": "Microsoft Bluetooth LE Enumerator", "Status": "OK", "InstanceId": "BTH\\MS", "Problem": 0},
            ],
            "drivers": [{"DeviceName":"Intel(R) Wireless Bluetooth(R)","DriverVersion":"23.1.2.3","Manufacturer":"Intel","DriverProviderName":"Intel","InfName":"oem42.inf"}],
        }
        proc = SimpleNamespace(returncode=0, stdout=__import__("json").dumps(payload), stderr="")
        with mock.patch.object(capture.platform, "system", return_value="Windows"), mock.patch.object(
            capture.subprocess, "run", return_value=proc
        ):
            result = capture.bluetooth_preflight()
        self.assertTrue(result["ok"])
        self.assertEqual(result["adapter_state"], "READY")
        self.assertEqual(result["service_state"], "RUNNING")
        self.assertEqual(len(result["adapters"]), 1)
        self.assertIn("Intel", result["adapters"][0]["name"])
        self.assertEqual(result["drivers"][0]["DriverVersion"], "23.1.2.3")

    def test_bluetooth_preflight_reports_missing_adapter(self):
        payload = {
            "service_status": "Stopped",
            "devices": [
                {"FriendlyName": "Microsoft Bluetooth LE Enumerator", "Status": "OK", "InstanceId": "BTH\\MS", "Problem": 0}
            ],
        }
        proc = SimpleNamespace(returncode=0, stdout=__import__("json").dumps(payload), stderr="")
        with mock.patch.object(capture.platform, "system", return_value="Windows"), mock.patch.object(
            capture.subprocess, "run", return_value=proc
        ):
            result = capture.bluetooth_preflight()
        self.assertFalse(result["ok"])
        self.assertEqual(result["adapter_state"], "NO_PHYSICAL_ADAPTER")
        self.assertEqual(result["reason"], "ONLY_BLUETOOTH_ENUMERATORS_FOUND")

    def test_engine_broad_scan_stops_when_adapter_preflight_fails(self):
        with mock.patch.object(core, "ble_bluetooth_preflight", return_value={
            "ok": False, "adapter_state": "MISSING", "reason": "BLUETOOTH_ADAPTER_NOT_AVAILABLE"
        }), mock.patch.object(core, "ble_scan_all") as scanner:
            engine = core.Engine(core.DEFAULT_CONFIG)
            result = asyncio.run(engine.scan_all_ble(1.0))
        self.assertFalse(result["ok"])
        self.assertEqual(result["error"], "BLUETOOTH_ADAPTER_NOT_AVAILABLE")
        scanner.assert_not_called()

    def test_scan_all_keeps_unknown_devices_and_uses_advertisement_name(self):
        class Dev:
            def __init__(self, name, address):
                self.name, self.address = name, address
        class Adv:
            def __init__(self, local_name, rssi, service_uuids=None, manufacturer_data=None, service_data=None):
                self.local_name, self.rssi = local_name, rssi
                self.service_uuids = service_uuids or []
                self.manufacturer_data = manufacturer_data or {}
                self.service_data = service_data or {}
        class Scanner:
            @staticmethod
            async def discover(timeout=5.0, return_adv=False):
                self_map = {
                    "A": (Dev(None, "AA"), Adv("LENZE-RGB X", -42, ["fff0"], {1234: b"\x01\x02"}, {"fff0": b"\x03"})),
                    "B": (Dev(None, "BB"), Adv(None, -65, [])),
                    "C": (Dev("Other BLE", "CC"), Adv("Other BLE", -55, [])),
                }
                return self_map if return_adv else [x[0] for x in self_map.values()]
        with mock.patch.object(capture, "BleakScanner", Scanner):
            rows = asyncio.run(capture.scan_all(0.1))
        self.assertEqual(len(rows), 3)
        by_address = {x.address: x for x in rows}
        self.assertEqual(by_address["AA"].family, "lenze")
        self.assertEqual(by_address["AA"].advertised_name, "LENZE-RGB X")
        self.assertEqual(by_address["AA"].manufacturer_data, ((1234, "0102"),))
        self.assertEqual(by_address["AA"].service_data, (("fff0", "03"),))
        self.assertEqual(len(by_address["AA"].fingerprint), 64)
        self.assertEqual(by_address["BB"].family, "unknown")
        self.assertEqual(by_address["CC"].family, "unknown")

    def test_classify_name_accepts_embedded_known_names(self):
        self.assertEqual(capture.classify_name("LED LENZE-RGB Living"), "lenze")
        self.assertEqual(capture.classify_name("Magic OC21W Strip"), "magic_lantern")
        self.assertEqual(capture.classify_name("MELK-OC21"), "magic_lantern")
        self.assertEqual(capture.classify_name("MELK-FLOOR-LAMP"), "magic_lantern")
        self.assertIsNone(capture.classify_name("Generic BLE"))

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

    def test_registry_rejects_duplicate_ble_address_and_fingerprint(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            fp = "a" * 64
            first = registry.bind_windows_identity("lenze_1", "AA:BB:CC:DD:EE:01", fp)
            self.assertEqual(first["ble_fingerprint"], fp)
            with self.assertRaisesRegex(ValueError, "already bound"):
                registry.bind_windows_identity("lenze_2", "AA:BB:CC:DD:EE:01", "b" * 64)
            with self.assertRaisesRegex(ValueError, "already bound"):
                registry.bind_windows_identity("lenze_2", "AA:BB:CC:DD:EE:02", fp)

    def test_registry_rejects_non_ble_binding_and_bad_address(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            with self.assertRaisesRegex(ValueError, "only for BLE"):
                registry.bind_windows_address("govee_h6047", "AA:BB")
            with self.assertRaises(ValueError):
                registry.bind_windows_address("lenze_1", "bad\naddress")

    def test_read_only_gatt_verify_enumerates_expected_profile_without_writes(self):
        result = asyncio.run(capture.verify_gatt_read_only(
            "AA:BB:CC:DD:EE:01",
            expected_service_uuid="fff0",
            expected_write_uuid="fff3",
            expected_notify_uuid="fff4",
            client_factory=FakeClient,
        ))
        self.assertTrue(result["ok"])
        self.assertEqual(result["hardware_io"], "READ_ONLY_GATT_VERIFY")
        self.assertEqual(result["write_operations"], 0)
        self.assertTrue(result["checks"]["connected"])
        self.assertTrue(result["checks"]["service_uuid"])
        self.assertTrue(result["checks"]["write_characteristic_present"])
        self.assertTrue(result["checks"]["notify_characteristic_present"])
        self.assertFalse(result["hardware_verified"])

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

    def test_engine_verify_all_bound_ble_is_read_only_and_collects_failures(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            registry.bind_windows_address("lenze_1", "AA:01")
            registry.bind_windows_address("oc21w_1", "BB:01")
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)

            async def fake_verify(device_id):
                if device_id == "lenze_1":
                    return {"ok": True, "device_id": device_id, "write_operations": 0, "hardware_verified": False}
                raise RuntimeError("offline")

            with mock.patch.object(engine, "verify_ble_gatt", side_effect=fake_verify):
                result = asyncio.run(engine.verify_all_bound_ble())
            self.assertFalse(result["ok"])
            self.assertEqual(result["bound_device_count"], 2)
            self.assertEqual(result["write_operations"], 0)
            self.assertFalse(result["hardware_verified"])
            self.assertEqual({x["device_id"] for x in result["results"]}, {"lenze_1", "oc21w_1"})

    def test_capture_requires_explicit_windows_binding(self):
        with tempfile.TemporaryDirectory() as td:
            registry = DeviceRegistry(Path(td) / "registry.json")
            with mock.patch.object(core, "DeviceRegistry", return_value=registry):
                engine = core.Engine(core.DEFAULT_CONFIG)
            with self.assertRaisesRegex(ValueError, "windows_ble_address_not_bound"):
                asyncio.run(engine.capture_ble_read_only("lenze_1", 0.1))


if __name__ == "__main__":
    unittest.main()
