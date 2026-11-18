import argparse
import ast
import gzip
from http.client import HTTPConnection
from io import BytesIO
import json
from pathlib import Path
import pickle
from queue import Queue
import subprocess
import sys
import tempfile
from threading import Event, Thread
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from CONFIG.config_preload_path_names import save_paths_to_cache
from light_wave_config import load_cache, load_config
from light_wave_runtime import drain_clips, select_output_device, video_loader
from NeuralTrainer.sequence_data import split_sequence
from OFFSHOOT_USAGE.media_server import MediaCatalog, MediaHandler, ThreadingHTTPServer
from TOOLS.precalc_neural.index_serialization import load_indices


class RepairTests(unittest.TestCase):
    def test_preflight_from_another_directory(self):
        process = subprocess.run(
            [sys.executable, "-B", str(ROOT / "light_wave_start.py"), "--demo", "--check"],
            cwd=ROOT.parent, capture_output=True, text=True,
        )
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertIn("Preflight OK", process.stdout)

    def test_original_snapshot_reports_missing_media(self):
        process = subprocess.run(
            [sys.executable, "-B", str(ROOT / "light_wave_start.py"), "--check"],
            capture_output=True, text=True,
        )
        self.assertEqual(process.returncode, 2)
        self.assertIn("Leerer Medienpool", process.stderr)

    def test_four_tracks_use_four_video_sessions(self):
        # Originalfunktion ohne Import nativer Grafik- und Audio-Treiber laden.
        source = next(ROOT.glob("32-bit*.py"))
        tree = ast.parse(source.read_bytes())
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "play_tracks")
        calls = []
        display = argparse.Namespace(init=lambda: None, get_init=lambda: True)
        namespace = {
            "pygame": argparse.Namespace(display=display, font=display, quit=lambda: None),
            "os": argparse.Namespace(environ={}),
            "config": {"audio_filepaths": {"sync_folder": "."}},
            "gc": argparse.Namespace(collect=lambda: None),
            "run_video_init": lambda: (["left"], ["right"]),
            "play_video_fullscreen": lambda *args, **options: calls.append(options["playlist_index"]),
        }
        exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), "exec"), namespace)
        namespace["play_tracks"]([(ROOT / "DATA/demo/light_wave_test.wav", "CUSTOM")] * 4)
        self.assertEqual(calls, [0, 1, 2, 3])

    def test_cache_sort_mixed_and_numeric_names(self):
        with tempfile.TemporaryDirectory() as scratch:
            path = Path(scratch)
            for name in ("10.mp4", "clip.mp4", "2.mp4"):
                (path / name).touch()
            config = load_config()
            config["video_filepaths"]["video_folder_all_horizontal"] = str(path)
            output = path / "normal.json"
            save_paths_to_cache(config.get, 1, output)
            cache = load_cache(output)
            names = [Path(value).name for value in cache["video_filenames_all_left"]]
            self.assertEqual(names, ["2.mp4", "10.mp4", "clip.mp4"])

    def test_device_fallback_does_not_assume_wasapi(self):
        fake = argparse.Namespace(
            query_hostapis=lambda: [],
            query_devices=lambda **kwargs: {"max_output_channels": 2},
        )
        self.assertEqual(select_output_device(fake), (None, 2))

    def test_video_worker_releases_active_and_queued_clips(self):
        queue = Queue(maxsize=1)
        stop = Event()
        started = Event()
        closed = []
        def open_clip(name):
            if name == "clip-b":
                started.set()
            return argparse.Namespace(close=lambda: closed.append(name))
        thread = Thread(target=video_loader, args=(["clip-a", "clip-b"], queue, stop, open_clip), daemon=True)
        thread.start()
        try:
            self.assertTrue(started.wait(timeout=3))
        finally:
            stop.set()
            thread.join(timeout=3)
            drain_clips(queue, lambda clip: clip.close() if clip is not None else None)
        self.assertFalse(thread.is_alive())
        self.assertCountEqual(["clip-a", "clip-b"], closed)

    def test_train_validation_have_disjoint_windows(self):
        train, validation = split_sequence(",".join(str(i) for i in range(100)), 0.2, 8)
        self.assertEqual(len(train), 80)
        self.assertEqual(len(validation), 20)
        self.assertLess(train[-1], validation[0])
        with self.assertRaises(ValueError):
            split_sequence("1,2,3,4", 0.2, 4)

    def test_finished_audio_is_finite_and_peak_limited(self):
        try:
            from light_wave_dsp import finalize_output
            import numpy as np
            from scipy.signal import resample_poly
        except ModuleNotFoundError as error:
            self.skipTest(str(error))
        data = np.ones((128, 8), dtype=np.float32) * 1.5
        output = finalize_output(data)
        self.assertEqual(output.shape, data.shape)
        self.assertLessEqual(np.max(np.abs(resample_poly(output, 4, 1, axis=0))), 0.892)
        self.assertTrue(np.max(finalize_output(np.zeros((32, 2)))) == 0)

    def test_pickle_index_files_are_data_only(self):
        for value in ([1, 2, 3], {"test": [2, 3]}):
            self.assertEqual(load_indices(BytesIO(pickle.dumps(value))), value)
        sample = next((ROOT / "TOOLS/precalc_neural/neural_indices_pkl").glob("*.pkl.gz"))
        with gzip.open(sample, "rb") as stream:
            self.assertIsInstance(load_indices(stream), (list, tuple, dict))
        with self.assertRaises((ValueError, pickle.UnpicklingError, EOFError)):
            load_indices(BytesIO(b"not a cache"))

    def test_catalog_refresh_rebuilds_media_and_indices(self):
        with tempfile.TemporaryDirectory() as scratch:
            path = Path(scratch)
            media = path / "video_1"
            media.mkdir()
            (media / "clip.mp4").touch()
            catalog = MediaCatalog(path, ("video_1",))
            self.assertEqual(catalog.take(2), ["video_1/clip.mp4"] * 2)
            (media / "clip.mp4").unlink()
            self.assertEqual(catalog.refresh(), 0)
            self.assertEqual(catalog.take(2), [])

    def test_loopback_browser_workflow(self):
        with tempfile.TemporaryDirectory() as scratch, ThreadingHTTPServer(("127.0.0.1", 0), MediaHandler) as server:
            server.catalog = MediaCatalog(scratch, ("video_1",))
            thread = Thread(target=server.serve_forever, daemon=True)
            thread.start()
            http = HTTPConnection("127.0.0.1", server.server_port, timeout=3)
            try:
                http.request("GET", "/api/media?limit=1")
                response = http.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(json.loads(response.read()), [])
                http.request("POST", "/api/refresh", headers={
                    "Origin": f"http://127.0.0.1:{server.server_port}",
                    "X-LWT-Refresh": "1",
                })
                response = http.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(json.loads(response.read())["total_files"], 0)
            finally:
                http.close()
                server.shutdown()
                thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
