import sys, unittest, tempfile, zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from spout_bridge import analyze_zip, inspect_dll
class BridgeChecks(unittest.TestCase):
    def test_missing(self):self.assertEqual(analyze_zip(Path('/nonexistent/fixture.zip'),'spout')['status'],'MISSING')
    def test_spout(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'Spout.zip'
            with zipfile.ZipFile(p,'w') as z:
                z.writestr('Spout2-master/SPOUTSDK/SpoutLibrary/SpoutLibrary.h','SendTexture ReceiveTexture ReceiveImage SendImage')
                z.writestr('Spout2-master/LICENSE','BSD 2-Clause')
            r=analyze_zip(p,'spout');self.assertEqual(r['status'],'SOURCE_INSPECTED');self.assertTrue(r['has_receiver_api'])
    def test_reject_traversal(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.zip'
            with zipfile.ZipFile(p,'w') as z:z.writestr('../evil','')
            self.assertEqual(analyze_zip(p,'spout')['status'],'UNSAFE_ARCHIVE')
    def test_no_false_gpu_claim(self):self.assertEqual(inspect_dll(Path('/not-here.dll'))['status'],'MISSING')
if __name__=='__main__':unittest.main()
