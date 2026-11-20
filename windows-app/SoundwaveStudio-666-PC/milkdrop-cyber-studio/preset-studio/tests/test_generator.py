import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'))
from generator import Settings,render,validate,generate,STYLES,VARIANTS

class GeneratorTests(unittest.TestCase):
    def test_all_profiles(self):
        for style in STYLES:
            for variant in VARIANTS:
                data=render(Settings(style,variant))
                self.assertEqual(validate(data),[])
                self.assertIn('per_frame_1=',data)
                self.assertIn('per_pixel_1=',data)
                self.assertIn('bass;',data)
    def test_reproducible(self):
        self.assertEqual(render(Settings()),render(Settings()))
        self.assertNotEqual(render(Settings(seed=1)),render(Settings(seed=2)))
    def test_safety(self):
        for cfg in [Settings(intensity=2),Settings(bpm=500),Settings(style='bad')]:
            with self.assertRaises(ValueError):render(cfg)
    def test_non_destructive(self):
        with tempfile.TemporaryDirectory() as t:
            out=Path(t)
            files=generate(out,'psytechno','mix',148,0.8,10,5)
            self.assertEqual(len(files),5)
            with self.assertRaises(FileExistsError):generate(out,'psytechno','mix',148,0.8,10,5)
            self.assertEqual(len(list(out.glob('*.milk'))),5)
if __name__=='__main__':unittest.main()
