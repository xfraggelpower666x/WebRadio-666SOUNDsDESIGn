import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
class BootstrapContractTests(unittest.TestCase):
    def test_launchers_exist(self):
        for name, action in [('START_STUDIO.bat','start'),('MAKE_EXE.bat','build'),('CHECK_TOOLS.bat','check')]:
            txt=(ROOT/name).read_text(encoding='ascii')
            self.assertIn('bootstrap.ps1',txt)
            self.assertIn('-Action '+action,txt)
    def test_guardrails(self):
        ps=(ROOT/'scripts/bootstrap.ps1').read_text(encoding='utf-8')
        for needle in ('Get-AuthenticodeSignature','Start-Transcript','LASTEXIT','PyInstaller','if (Test-Path $outfile)','SetupVenv','Check'):
            self.assertIn(needle.lower(),ps.lower())
    def test_frozen_config_is_external(self):
        gui=(ROOT/'src/gui.py').read_text(encoding='utf-8')
        self.assertIn("getattr(sys, 'frozen', False)",gui)
        self.assertIn('Path(sys.executable).resolve().parent',gui)
if __name__ == '__main__':unittest.main()
