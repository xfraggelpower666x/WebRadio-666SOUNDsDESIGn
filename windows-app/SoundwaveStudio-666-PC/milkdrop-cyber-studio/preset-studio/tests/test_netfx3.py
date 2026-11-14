import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class TestNetFx3(unittest.TestCase):
 def test_batch_actions(self):
  for act in ("check","enable"):
   p=ROOT/(act.upper()+"_NETFX3.bat")
   self.assertTrue(p.is_file())
   self.assertIn("-Action "+act,p.read_text(encoding="ascii"))
 def test_isolated_windows_feature(self):
  p=(ROOT/"scripts/netfx3.ps1").read_text(encoding="utf-8")
  for key in ("Get-WindowsOptionalFeature","FeatureName NetFx3","Enable-Feature","NoRestart","LATEST_NETFX3.log","Administrator","NETFX3_READBACK_OK"):
   self.assertIn(key,p)
 def test_sdk_preflight_non_mutating(self):
  p=(ROOT/"scripts/directx_sdk.ps1").read_text(encoding="utf-8")
  self.assertIn("Get-WindowsOptionalFeature -Online -FeatureName NetFx3",p)
  self.assertIn("WRITE_BLOCKED: .NET Framework 3.5",p)
  self.assertNotIn("Enable-Feature",p)
 def test_studio_not_blocked(self):
  bootstrap=(ROOT/"scripts/bootstrap.ps1").read_text(encoding="utf-8")
  self.assertNotIn("netfx3.ps1",bootstrap.lower())
if __name__ == '__main__': unittest.main()
