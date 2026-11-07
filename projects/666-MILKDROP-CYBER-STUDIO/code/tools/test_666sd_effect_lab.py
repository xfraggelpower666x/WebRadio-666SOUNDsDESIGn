"""Tests for original Cyber Effect Lab R13 (no Windows GPU claims)."""
import importlib.util
import math
import tempfile
import unittest
from pathlib import Path

MODULE = Path(__file__).with_name("666sd_effect_lab.py")
spec = importlib.util.spec_from_file_location("effect_lab", MODULE)
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class EffectLabTests(unittest.TestCase):
    def test_all_effects_and_palettes(self):
        for effect in lab.EFFECTS:
            for palette in lab.PALETTES:
                with self.subTest(effect=effect, palette=palette):
                    text = lab.generate(effect, palette)
                    self.assertIn("[preset00]", text)
                    self.assertIn("per_frame_1=", text)
                    self.assertIn("bass_att", text)
                    self.assertIn("treb_att", text)
                    self.assertIn("per_pixel_1=", text)
                    self.assertTrue(text.endswith("\n"))

    def test_determinism(self):
        self.assertEqual(lab.generate("vortex", "neon"), lab.generate("vortex", "neon"))

    def test_invalid_effect(self):
        with self.assertRaises(ValueError):
            lab.generate("unknown", "neon")

    def test_invalid_palette(self):
        with self.assertRaises(ValueError):
            lab.generate("vortex", "unknown")

    def test_nonfinite_and_out_of_bounds(self):
        for bpm, intensity in [(math.nan, 0.5), (240, 0.5),
                               (146, math.inf), (146, -1)]:
            with self.subTest(bpm=bpm, intensity=intensity):
                with self.assertRaises(ValueError):
                    lab.generate("vortex", "neon", bpm=bpm, intensity=intensity)

    def test_non_destructive_exclusive_file_semantics(self):
        with tempfile.TemporaryDirectory() as t:
            target = Path(t) / "effect.milk"
            original = b"original work"
            target.write_bytes(original)
            with self.assertRaises(FileExistsError):
                with target.open("x", encoding="utf-8") as f:
                    f.write(lab.generate("tunnel", "cyan"))
            self.assertEqual(target.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
