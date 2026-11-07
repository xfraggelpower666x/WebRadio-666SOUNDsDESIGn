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
            "RUN_DIAGNOSTICS.bat",
            "RUN_BLUETOOTH_RECOVERY.bat",
            "BLUETOOTH_RECOVERY.ps1",
            "VERIFY_PACKAGE.ps1",
            "VERIFY_PACKAGE.bat",
            "EXPORT_EVIDENCE.ps1",
            "EXPORT_EVIDENCE.bat",
            "RUN_SYSTEM_CHECK.ps1",
            "RUN_SYSTEM_CHECK.bat",
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

    def test_start_prefers_packaged_exe_and_has_source_fallback(self):
        text = self.read("START_SYMPHONY.bat")
        self.assertIn('set "SYMPHONY_EXE=dist\\666_LIGHT_ORCHESTRA_SYMPHONY.exe"', text)
        self.assertIn('if exist "%SYMPHONY_EXE%"', text)
        self.assertIn('start "" "%SYMPHONY_EXE%"', text)
        self.assertIn('set "SYMPHONY_SOURCE=666_light_orchestra_control_center.py"', text)
        self.assertIn('if not exist "%SYMPHONY_SOURCE%"', text)
        self.assertIn('bootstrap_windows.bat', text)

    def test_build_creates_all_expected_executables(self):
        text = self.read("BUILD_EXE.bat")
        self.assertIn('666_LIGHT_ORCHESTRA_SYMPHONY', text)
        self.assertIn('666_LIGHT_ORCHESTRA_LAB', text)
        self.assertIn('666_LIGHT_ORCHESTRA_DIAGNOSTICS', text)
        self.assertIn('666_LIGHT_ORCHESTRA"', text)
        self.assertIn("--hidden-import=ble_gui_model", text)
        self.assertIn("--hidden-import=readiness_model", text)
        self.assertIn("bootstrap_windows.bat", text)

    def test_bluetooth_recovery_is_minimal_and_non_destructive(self):
        text = self.read("BLUETOOTH_RECOVERY.ps1").lower()
        self.assertIn("bthserv", text)
        self.assertIn("pnputil.exe /scan-devices", text)
        self.assertNotIn("remove-pnpdevice", text)
        self.assertNotIn("uninstall", text)
        self.assertNotIn("restart-computer", text)
        self.assertIn("-Verb RunAs", self.read("BLUETOOTH_RECOVERY.ps1"))

    def test_package_verifier_checks_hashes(self):
        text = self.read("VERIFY_PACKAGE.ps1").lower()
        self.assertIn("windows_build_manifest.json", text)
        self.assertIn("get-filehash", text)
        self.assertIn("sha256", text)
        self.assertIn("hash_mismatch", text)

    def test_evidence_export_is_read_only_and_hashed(self):
        text = self.read("EXPORT_EVIDENCE.ps1").lower()
        self.assertIn("hardware_writes_performed = 0", text)
        self.assertIn("get-filehash", text)
        self.assertIn("compress-archive", text)
        self.assertIn("light_orchestra_system_check.json", text)
        self.assertNotIn("write_gatt", text)
        self.assertNotIn("devcontrol", text)

    def test_system_check_is_read_only_and_action_oriented(self):
        text = self.read("RUN_SYSTEM_CHECK.ps1").lower()
        self.assertIn("hardware_writes_performed = 0", text)
        self.assertIn("next_actions", text)
        self.assertIn("run_bluetooth_recovery.bat", text)
        self.assertIn("govee", text)
        self.assertIn("bound_ble_gatt", text)
        self.assertNotIn("write_gatt", text)
        self.assertNotIn("devcontrol", text)

    def test_one_click_builds_then_runs_symphony(self):
        text = self.read("ONE_CLICK_SETUP_BUILD_RUN.bat")
        self.assertIn("BUILD_EXE.bat", text)
        self.assertIn("dist\\666_LIGHT_ORCHESTRA_SYMPHONY.exe", text)

if __name__ == "__main__":
    unittest.main()
