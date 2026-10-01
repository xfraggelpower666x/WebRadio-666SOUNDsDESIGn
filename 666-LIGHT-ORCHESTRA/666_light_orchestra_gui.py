from __future__ import annotations

import json
import threading
import tkinter as tk
from tkinter import ttk, messagebox

from importlib import import_module

core = import_module("666_light_orchestra")


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("666SOUNDsDESIGn LIGHT ORCHESTRA")
        self.geometry("860x620")
        self.minsize(760, 540)
        self.cfg = core.load_config()
        self.engine = core.Engine(self.cfg)
        self.bridge = core.Bridge(self.engine, self.cfg["server"]["host"], self.cfg["server"]["port"])
        self._build()
        threading.Thread(target=self.bridge.start, daemon=True).start()
        self.after(1200, self.refresh)

    def _build(self):
        top = ttk.Frame(self, padding=12)
        top.pack(fill="x")
        ttk.Label(top, text="666SOUNDsDESIGn LIGHT ORCHESTRA", font=("Segoe UI", 18, "bold")).pack(side="left")
        self.status = tk.StringVar(value="Bridge startet …")
        ttk.Label(top, textvariable=self.status).pack(side="right")

        master = ttk.LabelFrame(self, text="Master", padding=10)
        master.pack(fill="x", padx=12, pady=6)
        ttk.Button(master, text="ALL ON", command=lambda: self.run(self.engine.set_power(True))).pack(side="left", padx=4)
        ttk.Button(master, text="ALL OFF", command=lambda: self.run(self.engine.set_power(False))).pack(side="left", padx=4)
        ttk.Button(master, text="BLE Scan", command=self.scan).pack(side="left", padx=4)
        ttk.Button(master, text="Refresh", command=self.refresh).pack(side="left", padx=4)
        ttk.Button(master, text="Govee LAN prüfen (read-only)", command=lambda: self.run(self.engine.govee.probe())).pack(side="left", padx=4)

        color = ttk.LabelFrame(self, text="Testfarbe", padding=10)
        color.pack(fill="x", padx=12, pady=6)
        self.r = tk.IntVar(value=255); self.g = tk.IntVar(value=35); self.b = tk.IntVar(value=210); self.br = tk.IntVar(value=65)
        for name, var, maxv in (("R", self.r, 255), ("G", self.g, 255), ("B", self.b, 255), ("Brightness", self.br, 100)):
            ttk.Label(color, text=name).pack(side="left", padx=(6,2))
            ttk.Spinbox(color, from_=0, to=maxv, width=5, textvariable=var).pack(side="left")
        ttk.Button(color, text="Senden", command=self.send_color).pack(side="left", padx=10)

        self.tree = ttk.Treeview(self, columns=("family","state","detail"), show="headings", height=12)
        self.tree.heading("family", text="Gerätefamilie")
        self.tree.heading("state", text="Status")
        self.tree.heading("detail", text="Detail")
        self.tree.column("family", width=210)
        self.tree.column("state", width=110)
        self.tree.column("detail", width=500)
        self.tree.pack(fill="both", expand=True, padx=12, pady=8)

        safety = ttk.LabelFrame(self, text="Safety", padding=10)
        safety.pack(fill="x", padx=12, pady=(0,12))
        ttk.Label(
            safety,
            text="*Erreichbarkeit ist Familienstatus, kein Einzelgeräte-Readback. Govee LAN laut App aktiv. Magic Lantern und LENZE-Hardware-Writes standardmäßig gesperrt.",
            wraplength=800
        ).pack(anchor="w")

    def run(self, coro):
        def job():
            try:
                result = self.bridge.run_async(coro)
                errors = [x for x in result.get("results", []) if isinstance(x, dict) and not x.get("ok", True)] if isinstance(result, dict) else []
                if isinstance(result, dict) and result.get("ok") is False and not errors:
                    errors = [result]
                self.after(0, self.refresh)
                if errors:
                    self.after(0, lambda: messagebox.showinfo("Teilstatus", json.dumps(errors, indent=2, ensure_ascii=False)))
            except Exception as exc:
                self.after(0, lambda: messagebox.showerror("LIGHT ORCHESTRA", str(exc)))
        threading.Thread(target=job, daemon=True).start()

    def scan(self):
        def job():
            try:
                self.bridge.run_async(self.engine.lenze.scan())
                self.bridge.run_async(self.engine.magic_lantern.scan())
                self.after(0, self.refresh)
            except Exception as exc:
                self.after(0, lambda: messagebox.showerror("Scan", str(exc)))
        threading.Thread(target=job, daemon=True).start()

    def send_color(self):
        self.run(self.engine.set_color(self.r.get(), self.g.get(), self.b.get(), self.br.get()))

    def refresh(self):
        state = self.engine.status()
        self.status.set(f"v{state['version']} · http://{self.cfg['server']['host']}:{self.cfg['server']['port']}")
        for item in self.tree.get_children():
            self.tree.delete(item)
        runtime = {d["kind"]: d for d in state["devices"]}
        for d in state["registry"]:
            family = d["family"]
            live = runtime.get(family, {})
            active = ("DEAKTIVIERT" if not d.get("enabled") else
                      "ERREICHBAR*" if live.get("online") else "OFFEN")
            detail = str(d.get("role", "unassigned")) + " · " + str(d.get("verified", "unknown"))
            self.tree.insert("", "end", values=(d["label"], active, detail))
        self.after(2500, self.refresh)


if __name__ == "__main__":
    App().mainloop()
