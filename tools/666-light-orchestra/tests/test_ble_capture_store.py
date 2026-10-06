"""Offline tests for local BLE evidence storage."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ble_capture_store import save_capture_evidence, load_capture_evidence


class BleCaptureStoreTests(unittest.TestCase):
    def sample(self):
        return {
            "ok": True,
            "hardware_io": "READ_ONLY",
            "device_id": "lenze_1",
            "family": "lenze",
            "experiment_label": "official_app_power_on",
            "notes": "user tapped power in original app",
            "capture": {
                "samples": [{"payload_hex": "01 02 03 04"}],
                "characteristics": [{"characteristic_uuid": "fff4"}],
                "write_operations": 0,
            },
            "analysis": {"hardware_verified": False, "rows": []},
        }

    def test_save_and_load_roundtrip(self):
        with tempfile.TemporaryDirectory() as td:
            saved = save_capture_evidence(self.sample(), td)
            self.assertTrue(saved["ok"])
            self.assertFalse(saved["hardware_io"])
            path = Path(saved["path"])
            self.assertTrue(path.is_file())
            loaded = load_capture_evidence(path)
            self.assertEqual(loaded["sha256"], saved["sha256"])
            self.assertEqual(loaded["payload"]["device_id"], "lenze_1")
            self.assertEqual(loaded["payload"]["experiment_label"], "official_app_power_on")
            self.assertEqual(loaded["payload"]["notes"], "user tapped power in original app")
            self.assertEqual(loaded["payload"]["capture"]["write_operations"], 0)

    def test_tampering_is_detected(self):
        with tempfile.TemporaryDirectory() as td:
            saved = save_capture_evidence(self.sample(), td)
            path = Path(saved["path"])
            record = json.loads(path.read_text(encoding="utf-8"))
            record["payload"]["device_id"] = "oc21w_1"
            path.write_text(json.dumps(record), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "evidence_hash_mismatch"):
                load_capture_evidence(path)

    def test_non_readonly_result_is_rejected(self):
        data = self.sample()
        data["hardware_io"] = "WRITE"
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaisesRegex(ValueError, "only_read_only"):
                save_capture_evidence(data, td)

    def test_missing_device_id_rejected(self):
        data = self.sample()
        data["device_id"] = ""
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaisesRegex(ValueError, "device_id"):
                save_capture_evidence(data, td)


if __name__ == "__main__":
    unittest.main()
