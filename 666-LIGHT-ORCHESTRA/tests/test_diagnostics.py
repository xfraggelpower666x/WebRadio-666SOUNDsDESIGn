from __future__ import annotations

import importlib
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
diag = importlib.import_module("666_light_orchestra_diagnostics")


class DiagnosticsTests(unittest.TestCase):
    def test_windows_network_context_is_read_only_and_parsed(self):
        payload={
            "profiles":[{"Name":"Home","InterfaceAlias":"Ethernet","NetworkCategory":"Private","IPv4Connectivity":"Internet"}],
            "firewall":[{"Name":"Private","Enabled":True,"DefaultInboundAction":"NotConfigured","DefaultOutboundAction":"NotConfigured"}],
        }
        proc=SimpleNamespace(returncode=0,stdout=json.dumps(payload),stderr="")
        with mock.patch.object(diag.platform,"system",return_value="Windows"), mock.patch.object(diag.subprocess,"run",return_value=proc):
            result=diag.windows_network_context()
        self.assertTrue(result["ok"])
        self.assertEqual(result["profiles"][0]["NetworkCategory"],"Private")
        self.assertTrue(result["firewall"][0]["Enabled"])

    def test_ping_host_reports_without_mutation(self):
        proc=SimpleNamespace(returncode=0,stdout="reply",stderr="")
        with mock.patch.object(diag.platform,"system",return_value="Windows"), mock.patch.object(diag.subprocess,"run",return_value=proc) as run:
            result=diag.ping_host("192.168.2.32")
        self.assertTrue(result["ok"])
        self.assertEqual(result["reason"],"ICMP_REACHABLE")
        self.assertIn("ping", run.call_args.args[0][0].lower())


if __name__ == "__main__":
    unittest.main()
