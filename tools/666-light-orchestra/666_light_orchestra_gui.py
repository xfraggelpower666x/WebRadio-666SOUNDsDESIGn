from __future__ import annotations

import json
import threading
import tkinter as tk
from tkinter import ttk, messagebox
from importlib import import_module

core = import_module("666_light_orchestra")
gui_model = import_module("ble_gui_model")
capture_store = import_module("ble_capture_store")
evidence_learning = import_module("ble_evidence_learning")
protocol_inference = import_module("ble_protocol_inference")


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("666SOUNDsDESIGn LIGHT ORCHESTRA")
        self.geometry("1080x760")
        self.minsize(920, 660)
        self.cfg = core.load_config()
        self.engine = core.Engine(self.cfg)
        self.bridge = core.Bridge(self.engine, self.cfg["server"]["host"], self.cfg["server"]["port"])
        self.discovered_rows = []
        self._build()
        threading.Thread(target=self.bridge.start, daemon=True).start()
        self.after(1200, self.refresh)

    def _build(self):
        top = ttk.Frame(self, padding=12)
        top.pack(fill="x")
        ttk.Label(top, text="666SOUNDsDESIGn LIGHT ORCHESTRA", font=("Segoe UI", 18, "bold")).pack(side="left")
        self.status = tk.StringVar(value="Bridge startet …")
        ttk.Label(top, textvariable=self.status).pack(side="right")

        self.tabs = ttk.Notebook(self)
        self.tabs.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        self.dashboard_tab = ttk.Frame(self.tabs)
        self.ble_tab = ttk.Frame(self.tabs)
        self.evidence_tab = ttk.Frame(self.tabs)
        self.tabs.add(self.dashboard_tab, text="Dashboard")
        self.tabs.add(self.ble_tab, text="BLE LAB · READ ONLY")
        self.tabs.add(self.evidence_tab, text="EVIDENCE LAB")

        self._build_dashboard(self.dashboard_tab)
        self._build_ble_lab(self.ble_tab)
        self._build_evidence_lab(self.evidence_tab)

    def _build_dashboard(self, parent):
        master = ttk.LabelFrame(parent, text="Master", padding=10)
        master.pack(fill="x", padx=8, pady=6)
        ttk.Button(master, text="ALL ON", command=lambda: self.run(self.engine.set_power(True))).pack(side="left", padx=4)
        ttk.Button(master, text="ALL OFF", command=lambda: self.run(self.engine.set_power(False))).pack(side="left", padx=4)
        ttk.Button(master, text="BLE Scan (read-only)", command=self.scan_ble).pack(side="left", padx=4)
        ttk.Button(master, text="Refresh", command=self.refresh).pack(side="left", padx=4)
        ttk.Button(master, text="Govee LAN prüfen (read-only)", command=lambda: self.run(self.engine.govee.probe())).pack(side="left", padx=4)

        color = ttk.LabelFrame(parent, text="Testfarbe", padding=10)
        color.pack(fill="x", padx=8, pady=6)
        self.r = tk.IntVar(value=255)
        self.g = tk.IntVar(value=35)
        self.b = tk.IntVar(value=210)
        self.br = tk.IntVar(value=65)
        for name, var, maxv in (("R", self.r, 255), ("G", self.g, 255), ("B", self.b, 255), ("Brightness", self.br, 100)):
            ttk.Label(color, text=name).pack(side="left", padx=(6, 2))
            ttk.Spinbox(color, from_=0, to=maxv, width=5, textvariable=var).pack(side="left")
        ttk.Button(color, text="Senden", command=self.send_color).pack(side="left", padx=10)

        self.tree = ttk.Treeview(parent, columns=("family", "state", "detail"), show="headings", height=12)
        self.tree.heading("family", text="Gerät")
        self.tree.heading("state", text="Status")
        self.tree.heading("detail", text="Detail")
        self.tree.column("family", width=230)
        self.tree.column("state", width=130)
        self.tree.column("detail", width=620)
        self.tree.pack(fill="both", expand=True, padx=8, pady=8)

        safety = ttk.LabelFrame(parent, text="Safety", padding=10)
        safety.pack(fill="x", padx=8, pady=(0, 8))
        ttk.Label(
            safety,
            text=(
                "Erreichbarkeit ist Familienstatus, kein Einzelgeräte-Readback. "
                "Govee benötigt bestätigten LAN-Probe. LENZE/OC21W Hardware-Writes bleiben "
                "gesperrt, bis Protokoll und Identität separat verifiziert wurden."
            ),
            wraplength=980,
        ).pack(anchor="w")

    def _build_ble_lab(self, parent):
        notice = ttk.LabelFrame(parent, text="READ-ONLY Sicherheitszone", padding=10)
        notice.pack(fill="x", padx=8, pady=6)
        ttk.Label(
            notice,
            text=(
                "Dieser Bereich scannt BLE-Geräte, bindet Windows-Adressen und sammelt Notifications. "
                "Binding setzt das Gerät absichtlich auf DEAKTIVIERT. Capture führt keine GATT-Write-Operation aus."
            ),
            wraplength=980,
        ).pack(anchor="w")

        controls = ttk.Frame(parent, padding=(8, 4))
        controls.pack(fill="x")
        ttk.Button(controls, text="1 · Windows BLE SCAN", command=self.scan_ble).pack(side="left", padx=4)
        ttk.Button(controls, text="Refresh Registry", command=self.refresh_ble_registry).pack(side="left", padx=4)
        ttk.Label(controls, text="Capture Sekunden:").pack(side="left", padx=(16, 4))
        self.capture_seconds = tk.DoubleVar(value=5.0)
        ttk.Spinbox(controls, from_=0.5, to=30.0, increment=0.5, width=6, textvariable=self.capture_seconds).pack(side="left")

        body = ttk.Panedwindow(parent, orient="horizontal")
        body.pack(fill="both", expand=True, padx=8, pady=6)

        left = ttk.Frame(body)
        right = ttk.Frame(body)
        body.add(left, weight=1)
        body.add(right, weight=1)

        scan_frame = ttk.LabelFrame(left, text="Gefundene LENZE / OC21W", padding=6)
        scan_frame.pack(fill="both", expand=True)

        self.ble_tree = ttk.Treeview(
            scan_frame,
            columns=("name", "family", "address", "rssi", "suggestion", "binding"),
            show="headings",
            height=10,
        )
        for key, title, width in (
            ("name", "Name", 140),
            ("family", "Familie", 100),
            ("address", "Windows BLE-Adresse", 170),
            ("rssi", "RSSI", 55),
            ("suggestion", "Vorschlag", 100),
            ("binding", "Status", 90),
        ):
            self.ble_tree.heading(key, text=title)
            self.ble_tree.column(key, width=width, stretch=True)
        self.ble_tree.pack(fill="both", expand=True)
        self.ble_tree.bind("<<TreeviewSelect>>", lambda _e: self._sync_selected_suggestion())

        bind_frame = ttk.Frame(scan_frame)
        bind_frame.pack(fill="x", pady=(6, 0))
        ttk.Label(bind_frame, text="Registry-Slot:").pack(side="left")
        self.bind_target = tk.StringVar()
        self.bind_combo = ttk.Combobox(bind_frame, textvariable=self.bind_target, state="readonly", width=18)
        self.bind_combo.pack(side="left", padx=5)
        ttk.Button(bind_frame, text="2 · Adresse binden (bleibt OFF)", command=self.bind_selected).pack(side="left", padx=5)

        registry_frame = ttk.LabelFrame(right, text="BLE Registry / Capture", padding=6)
        registry_frame.pack(fill="both", expand=True)

        self.registry_tree = ttk.Treeview(
            registry_frame,
            columns=("id", "family", "enabled", "address"),
            show="headings",
            height=8,
        )
        for key, title, width in (
            ("id", "Device-ID", 110),
            ("family", "Familie", 110),
            ("enabled", "Enabled", 70),
            ("address", "Windows BLE-Adresse", 190),
        ):
            self.registry_tree.heading(key, text=title)
            self.registry_tree.column(key, width=width, stretch=True)
        self.registry_tree.pack(fill="both", expand=True)
        self.registry_tree.bind("<<TreeviewSelect>>", lambda _e: self._sync_capture_target())

        capture_bar = ttk.Frame(registry_frame)
        capture_bar.pack(fill="x", pady=6)
        self.capture_target = tk.StringVar()
        self.capture_combo = ttk.Combobox(capture_bar, textvariable=self.capture_target, state="readonly", width=18)
        self.capture_combo.pack(side="left", padx=(0, 6))
        ttk.Button(capture_bar, text="3 · READ-ONLY CAPTURE", command=self.capture_selected).pack(side="left", padx=4)
        ttk.Button(capture_bar, text="Protocol Status", command=self.show_protocol_status).pack(side="left", padx=4)

        experiment_bar = ttk.Frame(registry_frame)
        experiment_bar.pack(fill="x", pady=(0, 6))
        ttk.Label(experiment_bar, text="Experiment:").pack(side="left")
        self.experiment_label = tk.StringVar(value="unlabeled")
        ttk.Combobox(
            experiment_bar,
            textvariable=self.experiment_label,
            values=(
                "unlabeled",
                "official_app_power_on",
                "official_app_power_off",
                "official_app_color_pink",
                "official_app_color_red",
                "official_app_color_green",
                "official_app_color_blue",
                "official_app_brightness_25",
                "official_app_brightness_50",
                "official_app_brightness_100",
                "official_app_mode_change",
            ),
            width=30,
        ).pack(side="left", padx=5)
        ttk.Label(experiment_bar, text="Notiz:").pack(side="left", padx=(10, 2))
        self.experiment_notes = tk.StringVar()
        ttk.Entry(experiment_bar, textvariable=self.experiment_notes, width=38).pack(side="left", fill="x", expand=True)

        protocol_frame = ttk.LabelFrame(parent, text="Capture / Protocol Analyse", padding=6)
        protocol_frame.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        self.analysis = tk.Text(protocol_frame, height=12, wrap="word", font=("Consolas", 9))
        self.analysis.pack(fill="both", expand=True)
        self._set_analysis({
            "status": "READY",
            "hardware_writes": "BLOCKED",
            "instruction": "BLE Scan starten, Gerät auswählen, Adresse binden, danach READ-ONLY Capture.",
        })

        self.refresh_ble_registry()

    def _build_evidence_lab(self, parent):
        info = ttk.LabelFrame(parent, text="Offline Protocol Learning", padding=10)
        info.pack(fill="x", padx=8, pady=6)
        ttk.Label(
            info,
            text=(
                "Lädt lokal gespeicherte READ-ONLY Captures, prüft deren SHA-256, gruppiert Frames "
                "und zeigt variable Bytepositionen. Ergebnisse sind Hypothesen und setzen niemals VERIFIED."
            ),
            wraplength=980,
        ).pack(anchor="w")

        controls = ttk.Frame(parent, padding=(8, 4))
        controls.pack(fill="x")
        ttk.Label(controls, text="Familie:").pack(side="left")
        self.evidence_family = tk.StringVar(value="lenze")
        ttk.Combobox(
            controls,
            textvariable=self.evidence_family,
            state="readonly",
            values=("lenze", "magic_lantern", "all"),
            width=18,
        ).pack(side="left", padx=5)
        ttk.Label(controls, text="Device-ID:").pack(side="left", padx=(12, 2))
        self.evidence_device = tk.StringVar(value="")
        self.evidence_device_combo = ttk.Combobox(controls, textvariable=self.evidence_device, width=18)
        self.evidence_device_combo.pack(side="left", padx=5)
        ttk.Button(controls, text="Evidence laden", command=self.refresh_evidence_lab).pack(side="left", padx=5)
        ttk.Button(controls, text="Learning Summary", command=self.show_learning_summary).pack(side="left", padx=5)
        ttk.Button(controls, text="Experiment Plan", command=self.show_experiment_plan).pack(side="left", padx=5)
        ttk.Button(controls, text="Infer Candidate Fields", command=self.show_protocol_inference).pack(side="left", padx=5)

        split = ttk.Panedwindow(parent, orient="horizontal")
        split.pack(fill="both", expand=True, padx=8, pady=6)

        left = ttk.LabelFrame(split, text="Lokale Evidence-Dateien", padding=6)
        right = ttk.LabelFrame(split, text="Learning / Frame Analyse", padding=6)
        split.add(left, weight=1)
        split.add(right, weight=2)

        self.evidence_tree = ttk.Treeview(
            left,
            columns=("file", "device", "family", "label", "sha"),
            show="headings",
            height=15,
        )
        for key, title, width in (
            ("file", "Datei", 200),
            ("device", "Device", 95),
            ("family", "Familie", 105),
            ("label", "Experiment", 155),
            ("sha", "SHA-256", 120),
        ):
            self.evidence_tree.heading(key, text=title)
            self.evidence_tree.column(key, width=width, stretch=True)
        self.evidence_tree.pack(fill="both", expand=True)
        self.evidence_tree.bind("<<TreeviewSelect>>", lambda _e: self.show_selected_evidence())

        self.evidence_text = tk.Text(right, wrap="word", font=("Consolas", 9))
        self.evidence_text.pack(fill="both", expand=True)

        footer = ttk.Label(parent, text="Hardware-Verifikation wird hier niemals automatisch gesetzt.")
        footer.pack(anchor="w", padx=12, pady=(0, 8))
        self.evidence_loaded = {"valid": [], "invalid": []}
        self.refresh_evidence_lab()

    def _set_evidence_text(self, data):
        self.evidence_text.configure(state="normal")
        self.evidence_text.delete("1.0", "end")
        self.evidence_text.insert("1.0", json.dumps(data, indent=2, ensure_ascii=False))
        self.evidence_text.configure(state="disabled")

    def refresh_evidence_lab(self):
        base = capture_store.default_evidence_dir()
        loaded = evidence_learning.load_evidence_directory(base)
        self.evidence_loaded = loaded
        if hasattr(self, "evidence_tree"):
            for item in self.evidence_tree.get_children():
                self.evidence_tree.delete(item)
            device_ids = set()
            for index, entry in enumerate(loaded["valid"]):
                payload = entry["record"]["payload"]
                device_ids.add(str(payload.get("device_id") or ""))
                self.evidence_tree.insert(
                    "",
                    "end",
                    iid=str(index),
                    values=(
                        entry["path"].split("\\")[-1].split("/")[-1],
                        payload.get("device_id"),
                        payload.get("family"),
                        payload.get("experiment_label") or "(unlabeled)",
                        entry["record"].get("sha256", "")[:16],
                    ),
                )
            self.evidence_device_combo["values"] = [""] + sorted(x for x in device_ids if x)
        summary = {
            "directory": str(base),
            "valid_files": loaded["valid_count"],
            "invalid_files": loaded["invalid_count"],
            "invalid": loaded["invalid"],
            "hardware_verified": False,
        }
        self._set_evidence_text(summary)

    def show_selected_evidence(self):
        selected = self.evidence_tree.selection()
        if not selected:
            return
        index = int(selected[0])
        entry = self.evidence_loaded["valid"][index]
        self._set_evidence_text({
            "path": entry["path"],
            "sha256": entry["record"].get("sha256"),
            "payload": entry["record"].get("payload"),
        })

    def show_learning_summary(self):
        family = self.evidence_family.get().strip()
        device = self.evidence_device.get().strip()
        summary = evidence_learning.learning_summary(
            self.evidence_loaded.get("valid", []),
            family=None if family == "all" else family,
            device_id=device or None,
        )
        self._set_evidence_text(summary)

    def _selected_evidence_family(self):
        family = self.evidence_family.get().strip()
        return "magic_lantern" if family == "oc21w" else family

    def show_experiment_plan(self):
        family = self._selected_evidence_family()
        if family == "all":
            return self._set_evidence_text({
                "error": "Bitte für den Experiment Plan LENZE oder magic_lantern auswählen.",
                "hardware_verified": False,
            })
        try:
            gate = protocol_inference.readiness(self.evidence_loaded.get("valid", []), family)
            gate["plan"] = protocol_inference.experiment_plan(family)
            self._set_evidence_text(gate)
        except Exception as exc:
            self._set_evidence_text({"ok": False, "error": str(exc), "hardware_verified": False})

    def show_protocol_inference(self):
        family = self._selected_evidence_family()
        if family == "all":
            return self._set_evidence_text({
                "error": "Inference immer pro Gerätefamilie ausführen.",
                "hardware_verified": False,
                "automatic_promotion_allowed": False,
            })
        try:
            result = protocol_inference.infer_candidate_fields(self.evidence_loaded.get("valid", []), family)
            self._set_evidence_text(result)
        except Exception as exc:
            self._set_evidence_text({
                "ok": False,
                "error": str(exc),
                "hardware_verified": False,
                "automatic_promotion_allowed": False,
            })

    def _set_analysis(self, data):
        self.analysis.configure(state="normal")
        self.analysis.delete("1.0", "end")
        self.analysis.insert("1.0", json.dumps(data, indent=2, ensure_ascii=False))
        self.analysis.configure(state="disabled")

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
        self.scan_ble()

    def scan_ble(self):
        def job():
            try:
                result = self.bridge.run_async(self.engine.scan_known_ble(5.0))
                rows = gui_model.propose_bindings(result.get("devices", []), self.engine.registry.all())
                self.discovered_rows = rows
                self.after(0, lambda: self._render_scan(rows))
                self.after(0, self.refresh_ble_registry)
            except Exception as exc:
                self.after(0, lambda: messagebox.showerror("BLE Scan", str(exc)))
        threading.Thread(target=job, daemon=True).start()

    def _render_scan(self, rows):
        for item in self.ble_tree.get_children():
            self.ble_tree.delete(item)
        for index, row in enumerate(rows):
            self.ble_tree.insert(
                "",
                "end",
                iid=str(index),
                values=(
                    row["name"],
                    row["family"],
                    row["address"],
                    row.get("rssi"),
                    row.get("suggested_device_id") or "—",
                    row["binding_state"],
                ),
            )

    def _sync_selected_suggestion(self):
        selected = self.ble_tree.selection()
        if not selected:
            return
        row = self.discovered_rows[int(selected[0])]
        if row.get("suggested_device_id"):
            self.bind_target.set(row["suggested_device_id"])

    def bind_selected(self):
        selected = self.ble_tree.selection()
        target = self.bind_target.get().strip()
        if not selected:
            return messagebox.showwarning("BLE Binding", "Bitte zuerst ein gefundenes Gerät auswählen.")
        if not target:
            return messagebox.showwarning("BLE Binding", "Bitte einen Registry-Slot auswählen.")
        row = self.discovered_rows[int(selected[0])]
        if not messagebox.askyesno(
            "BLE Binding",
            f"{row['name']}\n{row['address']}\n\nmit {target} verbinden?\nDas Gerät bleibt DEAKTIVIERT.",
        ):
            return
        try:
            result = self.engine.bind_windows_ble(target, row["address"])
            self._set_analysis(result)
            self.refresh_ble_registry()
            self.scan_ble()
        except Exception as exc:
            messagebox.showerror("BLE Binding", str(exc))

    def refresh_ble_registry(self):
        registry = gui_model.ble_registry_entries(self.engine.registry.all())
        ids = [item["id"] for item in registry]
        self.bind_combo["values"] = ids
        self.capture_combo["values"] = ids
        if ids and not self.bind_target.get():
            self.bind_target.set(ids[0])
        if ids and not self.capture_target.get():
            self.capture_target.set(ids[0])
        if hasattr(self, "registry_tree"):
            for item in self.registry_tree.get_children():
                self.registry_tree.delete(item)
            for item in registry:
                self.registry_tree.insert(
                    "",
                    "end",
                    iid=item["id"],
                    values=(
                        item["id"],
                        item["family"],
                        "ON" if item.get("enabled") else "OFF",
                        item.get("windows_ble_address") or "—",
                    ),
                )

    def _sync_capture_target(self):
        selected = self.registry_tree.selection()
        if selected:
            self.capture_target.set(selected[0])

    def capture_selected(self):
        target = self.capture_target.get().strip()
        if not target:
            return messagebox.showwarning("BLE Capture", "Bitte ein BLE-Registry-Gerät auswählen.")

        def job():
            try:
                result = self.bridge.run_async(self.engine.capture_ble_read_only(target, self.capture_seconds.get()))
                result["experiment_label"] = self.experiment_label.get().strip() or "unlabeled"
                result["notes"] = self.experiment_notes.get().strip()
                evidence = capture_store.save_capture_evidence(result)
                summary = gui_model.capture_summary(result)
                summary["experiment_label"] = result["experiment_label"]
                summary["notes"] = result["notes"]
                summary["evidence"] = evidence
                self.after(0, lambda: self._set_analysis(summary))
                self.after(0, self.refresh)
            except Exception as exc:
                self.after(0, lambda: messagebox.showerror("READ-ONLY Capture", str(exc)))
        threading.Thread(target=job, daemon=True).start()

    def show_protocol_status(self):
        status = self.engine.protocol_design_status()
        compact = {
            "hardware_io": status["hardware_io"],
            "lenze": {
                "badge": gui_model.protocol_badge(status["lenze"]),
                "profile": status["lenze"],
            },
            "oc21w": {
                "badge": gui_model.protocol_badge(status["oc21w"]),
                "profile": status["oc21w"],
            },
        }
        self._set_analysis(compact)

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
            active = (
                "DEAKTIVIERT" if not d.get("enabled") else
                "ERREICHBAR*" if live.get("online") else "OFFEN"
            )
            binding = d.get("windows_ble_address")
            detail = str(d.get("role", "unassigned")) + " · " + str(d.get("verified", "unknown"))
            if binding:
                detail += " · WIN BLE " + binding
            self.tree.insert("", "end", values=(d["label"], active, detail))
        self.refresh_ble_registry()
        self.after(2500, self.refresh)


if __name__ == "__main__":
    App().mainloop()
