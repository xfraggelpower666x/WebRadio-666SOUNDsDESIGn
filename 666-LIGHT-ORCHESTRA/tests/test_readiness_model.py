from __future__ import annotations
import unittest

from readiness_model import build_readiness


class ReadinessModelTests(unittest.TestCase):
    def test_ble_flow_moves_from_adapter_to_binding_to_gatt_to_protocol_gate(self):
        registry=[{"id":"lenze_1","family":"lenze","transport":"ble","enabled":False,"windows_ble_address":None}]
        no_bt=build_readiness(registry,[],{"ok":False},{})
        self.assertEqual(no_bt["rows"][0]["state"],"ADAPTER_REQUIRED")

        bound=[{**registry[0],"windows_ble_address":"AA"}]
        no_gatt=build_readiness(bound,[],{"ok":True},{})
        self.assertEqual(no_gatt["rows"][0]["state"],"VERIFY_REQUIRED")

        passed=build_readiness(bound,[],{"ok":True},{"lenze_1":{"ok":True}})
        self.assertEqual(passed["rows"][0]["state"],"WRITE_BLOCKED")
        self.assertFalse(passed["hardware_verified"])

    def test_govee_requires_ip_then_probe(self):
        registry=[{"id":"govee_h6047","family":"govee","enabled":True,"host":None}]
        missing=build_readiness(registry,[{"kind":"govee","online":False,"ip":None}],{"ok":True},{})
        self.assertEqual(missing["rows"][0]["state"],"IP_REQUIRED")

        probe=build_readiness(registry,[{"kind":"govee","online":False,"ip":"192.168.2.32"}],{"ok":True},{})
        self.assertEqual(probe["rows"][0]["state"],"READ_ONLY_PROBE_REQUIRED")

        ready=build_readiness(registry,[{"kind":"govee","online":True,"ip":"192.168.2.32"}],{"ok":True},{})
        self.assertEqual(ready["rows"][0]["state"],"SESSION_PROBE_READY")
        self.assertFalse(ready["rows"][0]["hardware_verified"])

    def test_unverified_transport_never_promotes(self):
        result=build_readiness([{"id":"govee_tv","family":"govee_tv","enabled":False}],[],{"ok":True},{})
        self.assertEqual(result["rows"][0]["state"],"UNVERIFIED_TRANSPORT")
        self.assertFalse(result["automatic_promotion_allowed"])


if __name__ == "__main__":
    unittest.main()
