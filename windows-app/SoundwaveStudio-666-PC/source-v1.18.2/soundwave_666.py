#!/usr/bin/env python3
"""Soundwave Studio 666 Windows Python host.

Soundwave Studio/Electron remains the UI, playback, analyser and visualizer owner.
This host provides Windows lifecycle control, preflight/integrity/build actions and
RAM-only SoundCloud environment handoff. It never writes credentials to disk.
"""
from __future__ import annotations
import os
import shutil
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox

ROOT = Path(__file__).resolve().parent
CREATE_NO_WINDOW = 0x08000000 if os.name == "nt" else 0


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Soundwave Studio 666 · Python Host")
        self.geometry("860x650")
        self.minsize(760, 560)
        self.proc: subprocess.Popen | None = None
        self.busy = False
        self.status = tk.StringVar(value="READY · Soundwave Studio remains UI/playback owner")
        self.client_id = tk.StringVar()
        self.client_secret = tk.StringVar()

        tk.Label(self, text="SOUNDWAVE STUDIO 666", font=("Segoe UI", 20, "bold")).pack(pady=(18, 2))
        tk.Label(self, text="Python Host · LOCAL / 666 RADIO / SOUNDCLOUD · secure RAM-only environment handoff").pack()

        creds = tk.LabelFrame(self, text="SoundCloud OAuth · optional · RAM only · never saved")
        creds.pack(fill="x", padx=18, pady=(14, 4))
        tk.Label(creds, text="Client ID").grid(row=0, column=0, sticky="w", padx=8, pady=7)
        tk.Entry(creds, textvariable=self.client_id).grid(row=0, column=1, sticky="ew", padx=8, pady=7)
        tk.Label(creds, text="Client Secret").grid(row=1, column=0, sticky="w", padx=8, pady=7)
        tk.Entry(creds, textvariable=self.client_secret, show="•").grid(row=1, column=1, sticky="ew", padx=8, pady=7)
        creds.columnconfigure(1, weight=1)

        bar = tk.Frame(self)
        bar.pack(pady=12)
        actions = [
            ("PREFLIGHT", self.preflight),
            ("INSTALL DEPS", self.install_deps),
            ("START SOUNDWAVE", self.start),
            ("CHECK SYSTEM", self.check),
            ("BUILD PORTABLE", self.build),
            ("OPEN DIST", self.open_dist),
            ("STOP", self.stop),
        ]
        for text, cmd in actions:
            tk.Button(bar, text=text, command=cmd, padx=10, pady=7).pack(side="left", padx=4)

        tk.Label(self, textvariable=self.status, anchor="w").pack(fill="x", padx=18)
        self.log = tk.Text(self, height=22, wrap="word")
        self.log.pack(fill="both", expand=True, padx=18, pady=(8, 18))
        self.protocol("WM_DELETE_WINDOW", self.close)
        self.after(150, self.preflight)

    def ui(self, fn, *args):
        self.after(0, fn, *args)

    def write(self, s: str):
        self.log.insert("end", s + "\n")
        self.log.see("end")

    def set_status(self, s: str):
        self.status.set(s)

    def runtime_env(self) -> dict[str, str]:
        env = os.environ.copy()
        cid = self.client_id.get().strip()
        secret = self.client_secret.get().strip()
        if cid:
            env["SOUNDCLOUD_CLIENT_ID"] = cid
        if secret:
            env["SOUNDCLOUD_CLIENT_SECRET"] = secret
        return env

    def tool(self, name: str) -> str | None:
        return shutil.which(name)

    def preflight(self):
        node, npm = self.tool("node"), self.tool("npm")
        package = ROOT / "package.json"
        missing = [n for n, p in (("node", node), ("npm", npm)) if not p]
        if not package.exists():
            missing.append("package.json")
        if missing:
            self.set_status("PREFLIGHT · BLOCKED")
            self.write("Missing: " + ", ".join(missing))
            return False
        self.set_status("PREFLIGHT · PASS")
        self.write(f"Node: {node}")
        self.write(f"npm: {npm}")
        self.write("Credentials: RAM-only handoff; no persistence by Python host.")
        return True

    def run_bg(self, args: list[str], label: str):
        if self.busy:
            self.set_status(f"{label} · BLOCKED · another maintenance task is running")
            return
        self.busy = True

        def work():
            self.ui(self.set_status, label + " · RUNNING")
            try:
                p = subprocess.Popen(
                    args,
                    cwd=ROOT,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    env=self.runtime_env(),
                    creationflags=CREATE_NO_WINDOW,
                )
                for line in p.stdout or []:
                    self.ui(self.write, line.rstrip())
                rc = p.wait()
                self.ui(self.set_status, f"{label} · " + ("PASS" if rc == 0 else f"ERROR {rc}"))
            except Exception as exc:
                self.ui(self.set_status, f"{label} · ERROR")
                self.ui(self.write, str(exc))
            finally:
                self.busy = False

        threading.Thread(target=work, daemon=True).start()

    def dependencies_ready(self) -> bool:
        electron = ROOT / "node_modules" / "electron"
        packager = ROOT / "node_modules" / "electron-packager"
        ok = electron.exists() and packager.exists()
        if not ok:
            self.set_status("DEPENDENCIES · MISSING")
            self.write("Run INSTALL DEPS once before START/BUILD. This performs npm install only when you explicitly click it.")
        return ok

    def install_deps(self):
        if self.preflight():
            self.run_bg(["npm", "install"], "DEPENDENCIES")

    def check(self):
        if self.preflight():
            self.run_bg(["npm", "run", "check:release"], "INTEGRITY")

    def build(self):
        if self.preflight() and self.dependencies_ready():
            # package is the repository's custom, release-gated portable builder.
            self.run_bg(["npm", "run", "package"], "PORTABLE BUILD")

    def start(self):
        if not self.preflight() or not self.dependencies_ready():
            return
        if self.proc and self.proc.poll() is None:
            self.set_status("SOUNDWAVE · ALREADY RUNNING")
            return
        try:
            self.proc = subprocess.Popen(
                ["npm", "start"], cwd=ROOT, env=self.runtime_env(), creationflags=CREATE_NO_WINDOW
            )
            self.set_status("SOUNDWAVE · STARTED")
            self.write("Started Electron runtime through Python host. Secrets remain RAM/environment-only.")
        except Exception as exc:
            messagebox.showerror("Start failed", str(exc))

    def stop(self):
        if not self.proc or self.proc.poll() is not None:
            self.set_status("SOUNDWAVE · NOT RUNNING")
            return
        try:
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/PID", str(self.proc.pid), "/T", "/F"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=CREATE_NO_WINDOW,
                    check=False,
                )
            else:
                self.proc.terminate()
            self.set_status("SOUNDWAVE · STOPPED")
        finally:
            self.proc = None

    def open_dist(self):
        target = ROOT / "dist"
        target.mkdir(exist_ok=True)
        try:
            if os.name == "nt":
                os.startfile(target)  # type: ignore[attr-defined]
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(target)])
            else:
                subprocess.Popen(["xdg-open", str(target)])
        except Exception as exc:
            self.write(f"Open dist failed: {exc}")

    def close(self):
        self.stop()
        # Explicitly drop credential values before destroying the process UI.
        self.client_id.set("")
        self.client_secret.set("")
        self.destroy()


if __name__ == "__main__":
    App().mainloop()
