import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from gui import inspect_preset
from generator import render,Settings

class GUITests(unittest.TestCase):
    def test_inspect_does_not_modify(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'generated.milk'
            orig=render(Settings()).encode()
            p.write_bytes(orig)
            result=inspect_preset(p)
            self.assertTrue(result['header'])
            self.assertGreater(result['per_frame'],0)
            self.assertGreater(result['per_pixel'],0)
            self.assertEqual(p.read_bytes(),orig)

if __name__=='__main__':unittest.main()
