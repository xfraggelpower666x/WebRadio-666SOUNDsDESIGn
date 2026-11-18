from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile

import numpy as np

from light_wave_integrations import hud_themes, lifx_themes, load_optical_spectrum, palette_rgb
from light_wave_shapes import DEFAULT_POINTS, faceted_face_mesh, load_shape, revolution_mesh, save_shape, spline_curve
from light_wave_visualizer import Spectrum


class StudioIntegrationTest(unittest.TestCase):
    def test_form_survives_json_round_trip_and_has_valid_mesh_indices(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "Shape.json"
            save_shape(path, DEFAULT_POINTS)
            points = load_shape(path)
        self.assertEqual(points, DEFAULT_POINTS)
        np.testing.assert_allclose(spline_curve(points)[[0, -1]], [points[0], points[-1]])
        for vertices, indices in (revolution_mesh(points), faceted_face_mesh()):
            self.assertTrue(np.isfinite(vertices).all())
            self.assertLess(indices.max(), vertices.size // 4)

    def test_theme_collections_and_palette_values(self):
        self.assertEqual(len(lifx_themes()), 378)
        self.assertEqual(set(hud_themes()), {"Classic", "Capsule", "Slate", "Terminal", "Paper"})
        for name in lifx_themes():
            rgb = np.asarray(palette_rgb(name))
            self.assertEqual(rgb.shape[1], 3)
            self.assertTrue(np.all((rgb >= 0) & (rgb <= 1)))

    def test_result_zip_reads_real_layout_and_rejects_short_payload(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "Result.zip"
            for truncated in (False, True):
                with ZipFile(path, "w") as archive:
                    archive.writestr("experiment.txt", "Time span: 6.4e-14\ndt: 1e-15\n")
                    sample = np.linspace(0, 1, 99, dtype="<f8").tobytes()
                    archive.writestr("experiment_spectrum.dat", sample[:8] if truncated else sample)
                if truncated:
                    with self.assertRaises(ValueError):
                        load_optical_spectrum(path)
                else:
                    spectrum, max_thz = load_optical_spectrum(path)
                    self.assertEqual(spectrum.shape, (33, 3))
                    self.assertAlmostEqual(max_thz, 500)
                    self.assertAlmostEqual(float(spectrum[-1, 2]), 1)

    def test_fft_adaptive_profile_exposes_quiet_signal_without_moving_silence(self):
        seconds = np.arange(4096) / 48000
        tone = np.sin(2 * np.pi * 1000 * seconds).astype(np.float32) * .02
        fixed = Spectrum(tone, 48000)
        adaptive = Spectrum(tone, 48000, adaptive=True)
        self.assertEqual(adaptive.update_block(np.zeros_like(tone), 1).max(), 0)
        self.assertGreater(adaptive.update_block(tone, 1).max(), fixed.update_block(tone, 1).max())
