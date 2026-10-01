"""Offline-Sicherheits- und Registry-Tests. Keine echten Bluetooth/LAN-Kommandos."""
import asyncio
import importlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from device_registry import DeviceRegistry
core = importlib.import_module("666_light_orchestra")


class RegistryTests(unittest.TestCase):
    def test_seed_inventory_and_addresses(self):
        with tempfile.TemporaryDirectory() as folder:
            r=DeviceRegistry(Path(folder)/"registry.json")
            devices=r.all()
            self.assertEqual(len(devices),8)
            self.assertEqual(sum(x["family"]=="magic_lantern" for x in devices),4)
            self.assertEqual(sum(x["family"]=="lenze" for x in devices),2)
            self.assertEqual(r.get("govee_h6047")["host"],"192.168.2.32")
            self.assertFalse(r.get("govee_tv")["enabled"])
            for d in devices:
                if d["transport"]=="ble":
                    self.assertIsNone(d["windows_ble_address"])

    def test_persistence_and_authority_fields(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"registry.json"
            r=DeviceRegistry(path)
            r.edit("oc21w_1",{"label":"BASS LEFT","role":"sub","enabled":True})
            reloaded=DeviceRegistry(path)
            self.assertEqual(reloaded.get("oc21w_1")["role"],"sub")
            self.assertEqual(reloaded.get("oc21w_1")["label"],"BASS LEFT")
            self.assertIsNone(reloaded.get("oc21w_1")["windows_ble_address"])
            with self.assertRaises(ValueError):
                r.edit("oc21w_1",{"windows_ble_address":"FAKE"})

    def test_bad_schema_fails_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"registry.json"
            path.write_text(json.dumps({"schema":999,"devices":[]}),encoding="utf-8")
            with self.assertRaises(ValueError):
                DeviceRegistry(path)

    def test_magic_write_blocked(self):
        fleet=core.MagicLanternFleet(dict(core.DEFAULT_CONFIG["magic_lantern"]))
        with self.assertRaises(RuntimeError):
            asyncio.run(fleet.set_power(True))

    def test_nine_byte_frame(self):
        data=core.MagicLanternFleet._frame(4,4,1,0,1,255,0)
        self.assertEqual(data,bytes.fromhex("7e 04 04 01 00 01 ff 00 ef"))


if __name__=="__main__":
    unittest.main()
