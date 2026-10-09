from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class WindowsBootstrapContractTests(unittest.TestCase):
    def read(self, name):
        return (ROOT / name).read_text(encoding="utf-8", errors="replace")

    def test_one_click_entrypoints_exist(self):
        for name in (
            "bootstrap_windows.bat",
            "START_SYMPHONY.bat",
            "start.bat",
            "BUILD_EXE.bat",
            "build_windows.bat",
            "ONE_CLICK_SETUP_BUILD_RUN.bat",
            "README_FIRST_WINDOWS.txt",
        ):
            self.assertTrue((ROOT / name).is_file(), name)

    def test_bootstrap_checks_and_updates_required_tools(self):
        text = self.read("bootstrap_windows.bat").lower()
        self.assertIn("winget install", text)
        self.assertIn("python.python.3.12", text)
        self.assertIn("-m ensurepip --upgrade", text)
        self.assertIn("-m venv .venv", text)
        self.assertIn("pip install --upgrade pip setuptools wheel", text)
        self.assertIn("pip install --upgrade -r requirements.txt", text)
        self.assertIn("import tkinter, bleak, pyinstaller", text)

    def test_build_creates_all_expected_executables(self):
        text = self.read("BUILD_EXE.bat")
        self.assertIn('666_LIGHT_ORCHESTRA_SYMPHONY', text)
        self.assertIn('666_LIGHT_ORCHESTRA_LAB', text)
        self.assertIn('666_LIGHT_ORCHESTRA"', text)
        self.assertIn("bootstrap_windows.bat", text)

    def test_one_click_builds_then_runs_symhony(self):
        text = self.read("ONE_CLICK_SETUP_BUILD_RUN.bat")
        self.assertIn("BUILD_EXE.bat", text)
        self.assertIn("dist\\666_LIGHT_ORCHESTRA_SYMPHONY.exe", text)

if __name__ == "__main__":
    unittest.main()
