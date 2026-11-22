import unittest
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
class DirectXManagerTests(unittest.TestCase):
 def test_actions_exist(self):
  for action in ('check','download','install'):
   p=BASE/({'check':'CHECK','download':'DOWNLOAD','install':'INSTALL'}[action]+'_DIRECTX_SDK.bat')
   self.assertTrue(p.is_file())
   self.assertIn('-Action '+action,p.read_text(encoding='ascii'))
 def test_official_download_and_verification(self):
  text=(BASE/'scripts/directx_sdk.ps1').read_text(encoding='utf-8')
  for marker in ('download.microsoft.com/download/a/e/7/','DXSDK_Jun10.exe','Get-AuthenticodeSignature','Get-FileHash','Start-Transcript','LATEST_DIRECTX.log','Detect-SDK','INSTALL_READBACK_OK'):
   self.assertIn(marker,text)
 def test_no_automatic_sdk_on_start(self):
  text=(BASE/'scripts/bootstrap.ps1').read_text(encoding='utf-8')
  self.assertNotIn('directx_sdk.ps1',text)
 def test_gui_check_available(self):
  text=(BASE/'src/gui.py').read_text(encoding='utf-8')
  self.assertIn('DIRECTX SDK MANAGER',text)
  self.assertIn('CHECK_DIRECTX_SDK.bat',text)
if __name__=='__main__':unittest.main()
