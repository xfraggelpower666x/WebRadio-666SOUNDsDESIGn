"""Offline tests for BLE capture quality gates."""
from collections import Counter
import unittest

from ble_capture_quality import audit_capture_result, subtract_baseline

class BleCaptureQualityTests(unittest.TestCase):
    def good(self):
        return {
            "hardware_io":"READ_ONLY",
            "capture":{
                "samples":[{"payload_hex":"01 02"}],
                "errors":[],
                "characteristics":[{"characteristic_uuid":"fff4"}],
                "subscribed":["fff4"],
                "write_operations":0,
            },
        }

    def test_good_capture_passes(self):
        q=audit_capture_result(self.good())
        self.assertTrue(q["quality_pass"])
        self.assertEqual(q["blocking_reasons"],[])

    def test_write_or_empty_capture_blocks(self):
        bad=self.good()
        bad["capture"]["write_operations"]=1
        bad["capture"]["samples"]=[]
        q=audit_capture_result(bad)
        self.assertFalse(q["quality_pass"])
        self.assertIn("zero_writes",q["blocking_reasons"])
        self.assertIn("min_samples",q["blocking_reasons"])

    def test_baseline_subtraction(self):
        r=subtract_baseline(Counter({"AA":3,"BB":2}),Counter({"AA":2,"CC":9}))
        self.assertEqual(r["signal"],{"AA":1,"BB":2})
        self.assertEqual(r["baseline_suppressed"],{"AA":2})
        self.assertFalse(r["hardware_verified"])

if __name__=="__main__":
    unittest.main()
