"""Standard-library smoke tests for the read-only repository preset inventory."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("inventory", HERE / "666sd_preset_audit.py")
inventory = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(inventory)


class InventoryTests(unittest.TestCase):
    def test_empty_library(self):
        with tempfile.TemporaryDirectory() as temp:
            report = inventory.audit(Path(temp))
            self.assertEqual(report["count"], 0)

    def test_shader_and_q64_detection(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / "test.milk").write_text(
                "[preset00]\nper_frame_1=q64=bass;\ncomp_1=\x60shader_body\n",
                encoding="utf-8")
            report = inventory.audit(folder)
            self.assertEqual(report["count"], 1)
            entry = report["files"][0]
            self.assertEqual(entry["max_q"], 64)
            self.assertTrue(entry["shader_comp"])
            self.assertEqual(entry["warnings"], [])

    def test_warnings_and_asset_extensions(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / "broken.milk").write_text("per_frame_1=q65+t9;", encoding="utf-8")
            (folder / "ring.shape").write_bytes(b"example")
            (folder / "image.png").write_bytes(b"ignored")
            report = inventory.audit(folder)
            self.assertEqual(report["count"], 2)
            entry = next(x for x in report["files"] if x["extension"] == ".milk")
            self.assertEqual(len(entry["warnings"]), 3)

    def test_sha256_is_original_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / "presets.milk2").write_bytes(b"\xff\x00\x01")
            entry = inventory.audit(folder)["files"][0]
            import hashlib
            self.assertEqual(entry["sha256"], hashlib.sha256(b"\xff\x00\x01").hexdigest())


if __name__ == "__main__":
    unittest.main()
