from __future__ import annotations

import asyncio
import json
import threading
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog, colorchooser
from importlib import import_module

core = import_module("666_light_orchestra")
state = import_module("light_control_state")
ble_model = import_module("ble_gui_model")

BG = "#03050d"
PANEL = "#071225"
PANEL_2 = "#0a1830"
CYAN = "#20e7ff"
PINK = "#ff2ad4"
LILAC = "#9d52ff"
TEXT = "#e9fbff"
MUTED = "#84a7bf"
GREEN = "#35ff9b"
RED = "#ff426f"
YELLOW = "#ffd84a"

class NeonButton(tk.Button):
    def __init__(self, master, text, command=None, accent=CYAN, **kw):
        super().__init__(
            master, text=text, command=command, bg=PANEL_2, fg=accent,
            activebackground="#132447", activeforeground="#ffffff",
            relief="flat", bd=0, highlightthickness=1, highlightbackground=accent,
            font=("Segoe UI", 10, "bold"), padx=12, pady=7, cursor="hand2", **kw
        )

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("666SOUNDsDESIGn · LIGHT ORCHESTRA SYMPHONY")
        self.geometry("1540x920")
        self.minsize(1180, 760)
        self.configure(bg=BG)

        self.cfg = core.load_config()
        self.engine = core.Engine(self.cfg)
        self.bridge = core.Bridge(self.engine, self.cfg["server"]["host"], self.cfg["server"]["port"])
        self.scene_store = state.SceneStore()

        self.selected_device = tk.StringVar(value="govee_h6047")
        self.target_mode = tk.StringVar(value="single")
        self.pair_name = tk.StringVar(value="PAIR A")
        self.audio_enabled = tk.BooleanVar(value=False)
        self.audio_sensitivity = tk.IntVar(value=70)
        self.audio_source = tk.StringVar(value="WebRadio MeterBus")
        self.color_name = tk.StringVar(value="Cyber Pink")
        self.motion_name = tk.StringVar(value="Static")
        self.brightness = tk.IntVar(value=80)
        self.global_speed = tk.IntVar(value=50)
        self.status_text = tk.StringVar(value="INITIALIZING")
        self.discovery_status = tk.StringVar(value="READY TO SCAN")
        self.discovery_slot = tk.StringVar(value="")
        self.discovery_rows = {}
        self.page_title = tk.StringVar(value="DASHBOARD")
        self.device_widgets = {}
        self.pages = {}

        self._configure_ttk()
        self._build_shell()
        self._show_page("Dashboard")

        threading.Thread(target=self.bridge.start, daemon=True).start()
        self.after(900, self.refresh_all)

    def _configure_ttk(self):
        s = ttk.Style(self)
        try:
            s.theme_use("clam")
        except Exception:
            pass
        s.configure("TFrame", background=BG)
        s.configure("Panel.TFrame", background=PANEL)
        s.configure("TLabel", background=BG, foreground=TEXT, font=("Segoe UI", 10))
        s.configure("Muted.TLabel", background=BG, foreground=MUTED)
        s.configure("Title.TLabel", background=BG, foreground=CYAN, font=("Segoe UI", 18, "bold"))
        s.configure("Treeview", background="#06101f", fieldbackground="#06101f", foreground=TEXT, rowheight=28)
        s.configure("Treeview.Heading", background="#0b1c37", foreground=CYAN, font=("Segoe UI", 10, "bold"))
        s.map("Treeview", background=[("selected", "#223065")], foreground=[("selected", "#ffffff")])
        s.configure("TCombobox", fieldbackground=PANEL_2, background=PANEL_2, foreground=TEXT)
        s.configure("TCheckbutton", background=BG, foreground=TEXT)

    def _build_shell(self):
        self._build_header()
        body = tk.Frame(self, bg=BG)
        body.pack(fill="both", expand=True)

        self.sidebar = tk.Frame(body, bg="#050a17", width=190)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)
        self.content = tk.Frame(body, bg=BG)
        self.content.pack(side="left", fill="both", expand=True)

        nav = [
            ("Dashboard", "◈"),
            ("Devices", "▥"),
            ("Groups", "⌘"),
            ("Scenes", "▶"),
            ("Audio", "≋"),
            ("Colors", "◉"),
            ("Motion", "≈"),
            ("Settings", "⚙"),
            ("Lab", "⌁"),
        ]
        for name, icon in nav:
            tk.Button(
                self.sidebar, text=f"{icon}   {name}", anchor="w",
                command=lambda n=name: self._show_page(n),
                bg="#050a17", fg=TEXT, activebackground="#132447", activeforeground=CYAN,
                relief="flat", bd=0, font=("Segoe UI", 11, "bold"), padx=18, pady=12,
                cursor="hand2",
            ).pack(fill="x", padx=8, pady=3)

        foot = tk.Frame(self.sidebar, bg="#050a17")
        foot.pack(side="bottom", fill="x", padx=12, pady=16)
        tk.Label(foot, text="SAFE CONTROL", bg="#050a17", fg=PINK, font=("Segoe UI", 9, "bold")).pack(anchor="w")
        tk.Label(foot, text="LENZE / OC21W writes gated", bg="#050a17", fg=MUTED, font=("Segoe UI", 8)).pack(anchor="w")

        for name in ("Dashboard", "Devices", "Groups", "Scenes", "Audio", "Colors", "Motion", "Settings", "Lab"):
            frame = tk.Frame(self.content, bg=BG)
            self.pages[name] = frame

        self._build_dashboard(self.pages["Dashboard"])
        self._build_devices(self.pages["Devices"])
        self._build_groups(self.pages["Groups"])
        self._build_scenes(self.pages["Scenes"])
        self._build_audio(self.pages["Audio"])
        self._build_colors(self.pages["Colors"])
        self._build_motion(self.pages["Motion"])
        self._build_settings(self.pages["Settings"])
        self._build_lab(self.pages["Lab"])

    def _build_header(self):
        bar = tk.Frame(self, bg="#02030a", height=92, highlightthickness=1, highlightbackground="#19325f")
        bar.pack(fill="x")
        bar.pack_propagate(False)
        left = tk.Frame(bar, bg="#02030a")
        left.pack(side="left", fill="y", padx=22)
        tk.Label(left, text="LIGHT ORCHESTRA", bg="#02030a", fg=CYAN, font=("Segoe UI", 26, "bold")).pack(anchor="w", pady=(12, 0))
        tk.Label(left, text="S Y M P H O N Y", bg="#02030a", fg=PINK, font=("Segoe UI", 14, "bold")).pack(anchor="w")
        tk.Label(bar, textvariable=self.page_title, bg="#02030a", fg=LILAC, font=("Segoe UI", 13, "bold")).pack(side="left", padx=40)

        right = tk.Frame(bar, bg="#02030a")
        right.pack(side="right", fill="y", padx=22)
        tk.Label(right, textvariable=self.status_text, bg="#02030a", fg=GREEN, font=("Segoe UI", 11, "bold")).pack(anchor="e", pady=(16, 2))
        self.connected_text = tk.StringVar(value="0 / 0 devices ready")
        tk.Label(right, textvariable=self.connected_text, bg="#02030a", fg=MUTED, font=("Segoe UI", 9)).pack(anchor="e")
        self.audio_text = tk.StringVar(value="Audio Reactive: OFF")
        tk.Label(right, textvariable=self.audio_text, bg="#02030a", fg=CYAN, font=("Segoe UI", 9)).pack(anchor="e")

    def _panel(self, parent, title):
        wrap = tk.Frame(parent, bg=PANEL, highlightthickness=1, highlightbackground="#17396d")
        tk.Label(wrap, text=title, bg=PANEL, fg=CYAN, font=("Segoe UI", 11, "bold")).pack(anchor="w", padx=12, pady=(9, 5))
        inner = tk.Frame(wrap, bg=PANEL)
        inner.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        return wrap, inner

    def _build_dashboard(self, parent):
        top = tk.Frame(parent, bg=BG)
        top.pack(fill="x", padx=12, pady=(12, 8))
        NeonButton(top, "SCAN DEVICES", self.scan_devices).pack(side="left", padx=4)
        NeonButton(top, "REFRESH", self.refresh_all, accent=LILAC).pack(side="left", padx=4)
        NeonButton(top, "ALL ON", lambda: self._run(self.engine.set_power(True)), accent=GREEN).pack(side="right", padx=4)
        NeonButton(top, "ALL OFF", lambda: self._run(self.engine.set_power(False)), accent=RED).pack(side="right", padx=4)

        devices_panel, devices = self._panel(parent, "DEVICES")
        devices_panel.pack(fill="x", padx=12, pady=6)
        self.dashboard_devices = devices

        row = tk.Frame(parent, bg=BG)
        row.pack(fill="x", padx=12, pady=6)
        group_panel, group = self._panel(row, "GROUP CONTROL")
        group_panel.pack(side="left", fill="both", expand=True, padx=(0, 6))
        power_panel, power = self._panel(row, "MASTER CONTROLLER")
        power_panel.pack(side="left", fill="both", expand=True, padx=(6, 0))

        for label, mode in (("SINGLE", "single"), ("PAIR", "pair"), ("ALL", "all"), ("CUSTOM", "custom")):
            NeonButton(group, label, lambda m=mode: self.target_mode.set(m), accent=PINK if mode == "pair" else CYAN).pack(side="left", padx=5)
        ttk.Combobox(group, textvariable=self.pair_name, values=tuple(state.PAIR_GROUPS), state="readonly", width=12).pack(side="left", padx=8)

        tk.Label(power, text="Brightness", bg=PANEL, fg=TEXT).grid(row=0, column=0, sticky="w")
        tk.Scale(power, from_=1, to=100, orient="horizontal", variable=self.brightness, bg=PANEL, fg=TEXT,
                 troughcolor="#11264a", highlightthickness=0, activebackground=PINK, length=240).grid(row=0, column=1, padx=10)
        tk.Label(power, text="Global Speed", bg=PANEL, fg=TEXT).grid(row=1, column=0, sticky="w")
        tk.Scale(power, from_=1, to=100, orient="horizontal", variable=self.global_speed, bg=PANEL, fg=TEXT,
                 troughcolor="#11264a", highlightthickness=0, activebackground=CYAN, length=240).grid(row=1, column=1, padx=10)

        lower = tk.Frame(parent, bg=BG)
        lower.pack(fill="both", expand=True, padx=12, pady=(6, 12))
        colors_panel, colors = self._panel(lower, "COLOR SCHEMES")
        colors_panel.pack(side="left", fill="both", expand=True, padx=(0, 5))
        motion_panel, motion = self._panel(lower, "MOTION SCHEMES")
        motion_panel.pack(side="left", fill="both", expand=True, padx=5)
        scenes_panel, scenes = self._panel(lower, "SCENES")
        scenes_panel.pack(side="left", fill="both", expand=True, padx=(5, 0))
        self._fill_color_buttons(colors, compact=True)
        self._fill_motion_buttons(motion, compact=True)
        self.dashboard_scene_list = tk.Listbox(scenes, bg="#06101f", fg=TEXT, selectbackground="#23336a", relief="flat", height=8)
        self.dashboard_scene_list.pack(fill="both", expand=True)
        NeonButton(scenes, "PLAY SCENE", self.play_selected_dashboard_scene, accent=PINK).pack(fill="x", pady=(6, 0))

    def _build_devices(self, parent):
        toolbar = tk.Frame(parent, bg=BG)
        toolbar.pack(fill="x", padx=12, pady=(12,6))
        NeonButton(toolbar, "SEARCH BLE DEVICES", self.scan_devices).pack(side="left", padx=4)
        NeonButton(toolbar, "SEARCH GOVEE LAN", self.discover_govee, accent=GREEN).pack(side="left", padx=4)
        NeonButton(toolbar, "REFRESH", self.refresh_all, accent=LILAC).pack(side="left", padx=4)
        tk.Label(toolbar, textvariable=self.discovery_status, bg=BG, fg=YELLOW, font=("Segoe UI", 9, "bold")).pack(side="right", padx=8)

        discover_panel, discover = self._panel(parent, "DEVICE DISCOVERY · LIVE SEARCH")
        discover_panel.pack(fill="x", padx=12, pady=(0,8))
        self.discovery_tree = ttk.Treeview(discover, columns=("name","family","address","rssi","state","slot"), show="headings", height=6)
        for key,title,width in [
            ("name","Found device",210),("family","Detected family",130),("address","Windows BLE address",260),
            ("rssi","Signal",80),("state","Binding",110),("slot","Suggested slot",130)
        ]:
            self.discovery_tree.heading(key,text=title); self.discovery_tree.column(key,width=width)
        self.discovery_tree.pack(fill="x", expand=True)
        self.discovery_tree.bind("<<TreeviewSelect>>", self._discovery_selected)
        discover_actions = tk.Frame(discover, bg=PANEL)
        discover_actions.pack(fill="x", pady=(8,0))
        tk.Label(discover_actions,text="Target slot",bg=PANEL,fg=TEXT).pack(side="left",padx=(0,6))
        self.discovery_slot_combo = ttk.Combobox(discover_actions,textvariable=self.discovery_slot,state="readonly",width=18)
        self.discovery_slot_combo.pack(side="left",padx=4)
        NeonButton(discover_actions,"BIND FOUND DEVICE",self.bind_discovered,accent=GREEN).pack(side="left",padx=6)
        tk.Label(discover_actions,text="Discovery is read-only. Binding stores identity but never enables hardware writes.",bg=PANEL,fg=MUTED).pack(side="left",padx=10)

        registry_panel, registry_inner = self._panel(parent, "CONFIGURED DEVICES")
        registry_panel.pack(fill="both", expand=True, padx=12, pady=(0,8))
        self.device_tree = ttk.Treeview(registry_inner, columns=("id","family","label","role","enabled","binding","status"), show="headings")
        for key,title,width in [
            ("id","Device",130),("family","Family",120),("label","Label",210),("role","Role",120),
            ("enabled","Enabled",80),("binding","Connection / Address",260),("status","Status",180)
        ]:
            self.device_tree.heading(key,text=title); self.device_tree.column(key,width=width)
        self.device_tree.pack(fill="both", expand=True)
        self.device_tree.bind("<<TreeviewSelect>>", self._device_tree_selected)
        actions = tk.Frame(parent, bg=BG)
        actions.pack(fill="x", padx=12, pady=(0,12))
        NeonButton(actions, "CONNECT / VERIFY", self.connect_selected, accent=GREEN).pack(side="left", padx=4)
        NeonButton(actions, "DISCONNECT", self.disconnect_selected, accent=RED).pack(side="left", padx=4)
        NeonButton(actions, "POWER ON", lambda: self.device_power(True)).pack(side="left", padx=4)
        NeonButton(actions, "POWER OFF", lambda: self.device_power(False), accent=PINK).pack(side="left", padx=4)
        NeonButton(actions, "EDIT LABEL / ROLE", self.edit_selected_device, accent=LILAC).pack(side="left", padx=4)
        NeonButton(actions, "BIND BLE ADDRESS", self.bind_selected_address, accent=CYAN).pack(side="left", padx=4)
        NeonButton(actions, "ENABLE / DISABLE", self.toggle_selected_enabled, accent=YELLOW).pack(side="left", padx=4)

    def _build_groups(self, parent):
        p, inner = self._panel(parent, "TARGET ROUTING")
        p.pack(fill="x", padx=12, pady=12)
        for mode in ("single","pair","all","custom"):
            tk.Radiobutton(inner, text=mode.upper(), value=mode, variable=self.target_mode, bg=PANEL, fg=TEXT,
                           selectcolor="#14264a", activebackground=PANEL, activeforeground=CYAN).pack(side="left", padx=12)
        ttk.Combobox(inner, textvariable=self.pair_name, values=tuple(state.PAIR_GROUPS), state="readonly", width=14).pack(side="left", padx=12)
        p2, inner2 = self._panel(parent, "PAIR DEFINITIONS")
        p2.pack(fill="both", expand=True, padx=12, pady=(0,12))
        for name, ids in state.PAIR_GROUPS.items():
            tk.Label(inner2, text=f"{name}:  {' + '.join(ids)}", bg=PANEL, fg=TEXT, font=("Segoe UI", 12)).pack(anchor="w", pady=8)

    def _build_scenes(self, parent):
        p, inner = self._panel(parent, "SCENE LIBRARY")
        p.pack(fill="both", expand=True, padx=12, pady=12)
        self.scene_list = tk.Listbox(inner, bg="#06101f", fg=TEXT, selectbackground="#23336a", relief="flat", font=("Segoe UI", 11))
        self.scene_list.pack(fill="both", expand=True)
        bar = tk.Frame(inner, bg=PANEL); bar.pack(fill="x", pady=(8,0))
        NeonButton(bar, "PLAY", self.play_selected_scene, accent=GREEN).pack(side="left", padx=4)
        NeonButton(bar, "SAVE CURRENT", self.save_current_scene, accent=PINK).pack(side="left", padx=4)
        NeonButton(bar, "DELETE CUSTOM", self.delete_selected_scene, accent=RED).pack(side="left", padx=4)

    def _build_audio(self, parent):
        p, inner = self._panel(parent, "AUDIO REACTIVITY")
        p.pack(fill="x", padx=12, pady=12)
        tk.Checkbutton(inner, text="AUDIO REACTIVE ENABLED", variable=self.audio_enabled, command=self._sync_audio_label,
                       bg=PANEL, fg=TEXT, selectcolor="#14264a", activebackground=PANEL, activeforeground=CYAN).grid(row=0,column=0,columnspan=2,sticky="w",pady=8)
        tk.Label(inner,text="Source",bg=PANEL,fg=TEXT).grid(row=1,column=0,sticky="w")
        ttk.Combobox(inner,textvariable=self.audio_source,values=("WebRadio MeterBus","Microphone (planned)","Manual Test"),state="readonly",width=28).grid(row=1,column=1,sticky="w",padx=10)
        tk.Label(inner,text="Sensitivity",bg=PANEL,fg=TEXT).grid(row=2,column=0,sticky="w")
        tk.Scale(inner,from_=0,to=100,orient="horizontal",variable=self.audio_sensitivity,bg=PANEL,fg=TEXT,
                 troughcolor="#11264a",highlightthickness=0,activebackground=PINK,length=360).grid(row=2,column=1,sticky="w",padx=10)
        NeonButton(inner,"SEND TEST BEAT",self.send_test_beat,accent=PINK).grid(row=3,column=0,columnspan=2,sticky="w",pady=12)
        tk.Label(inner,text="Real WebRadio MeterBus events arrive through the localhost bridge. Microphone capture remains a separate future input path.",bg=PANEL,fg=MUTED,wraplength=880,justify="left").grid(row=4,column=0,columnspan=2,sticky="w")

    def _build_colors(self, parent):
        p, inner = self._panel(parent, "COLOR SCHEMES")
        p.pack(fill="both", expand=True, padx=12, pady=12)
        self._fill_color_buttons(inner, compact=False)

    def _fill_color_buttons(self, parent, compact=False):
        for i, name in enumerate(state.COLOR_SCHEMES):
            NeonButton(parent, name, lambda n=name: self.apply_color_scheme(n), accent=[PINK,CYAN,LILAC,YELLOW,CYAN][i%5]).pack(fill="x" if compact else None, side="top" if compact else "left", padx=5, pady=5)
        NeonButton(parent, "Custom RGB", self.apply_custom_color, accent=GREEN).pack(fill="x" if compact else None, side="top" if compact else "left", padx=5, pady=5)

    def _build_motion(self, parent):
        p, inner = self._panel(parent, "MOTION SCHEMES")
        p.pack(fill="both", expand=True, padx=12, pady=12)
        self._fill_motion_buttons(inner, compact=False)

    def _fill_motion_buttons(self, parent, compact=False):
        for name in state.MOTION_SCHEMES:
            NeonButton(parent, name, lambda n=name: self.apply_motion_scheme(n), accent=LILAC).pack(fill="x" if compact else None, side="top" if compact else "left", padx=5, pady=5)

    def _build_settings(self, parent):
        p, inner = self._panel(parent, "SYSTEM SETTINGS")
        p.pack(fill="x", padx=12, pady=12)
        tk.Label(inner,text=f"Bridge: http://{self.cfg['server']['host']}:{self.cfg['server']['port']}",bg=PANEL,fg=TEXT).pack(anchor="w",pady=4)
        tk.Label(inner,text="Govee H6047 requires a successful read-only LAN probe before any write.",bg=PANEL,fg=YELLOW).pack(anchor="w",pady=4)
        tk.Label(inner,text="LENZE / OC21W write controls remain visible in the controller but are intentionally blocked until protocol + real hardware validation.",bg=PANEL,fg=RED,wraplength=980,justify="left").pack(anchor="w",pady=4)
        NeonButton(inner,"OPEN ADVANCED LAB INFO",lambda:self._show_page("Lab"),accent=CYAN).pack(anchor="w",pady=10)

    def _build_lab(self, parent):
        p, inner = self._panel(parent, "ADVANCED BLE / EVIDENCE LAB")
        p.pack(fill="both", expand=True, padx=12, pady=12)
        tk.Label(inner,text="The original 666_light_orchestra_gui.py remains preserved as the full READ-ONLY BLE/Evidence laboratory.",bg=PANEL,fg=TEXT,wraplength=920,justify="left").pack(anchor="w",pady=8)
        tk.Label(inner,text="Use it for binding, evidence capture, session quality, protocol inference and manual review. This Control Center does not bypass those gates.",bg=PANEL,fg=MUTED,wraplength=920,justify="left").pack(anchor="w",pady=8)

    def _show_page(self, name):
        for f in self.pages.values():
            f.pack_forget()
        self.pages[name].pack(fill="both", expand=True)
        self.page_title.set(name.upper())

    def _run(self, coro, callback=None):
        def worker():
            try:
                result = asyncio.run(coro)
                self.after(0, lambda: self._async_done(result, callback))
            except Exception as exc:
                self.after(0, lambda: self._async_error(exc))
        threading.Thread(target=worker, daemon=True).start()

    def _async_done(self, result, callback):
        self.status_text.set("SYSTEM ONLINE")
        if callback:
            callback(result)
        self.refresh_all()

    def _async_error(self, exc):
        self.status_text.set("CONTROL BLOCKED / ERROR")
        messagebox.showwarning("LIGHT ORCHESTRA", str(exc))
        self.refresh_all()

    def _current_targets(self):
        ids = [d["id"] for d in self.engine.registry.all() if d.get("id") != "govee_tv"]
        return state.resolve_targets(self.target_mode.get(), ids, self.selected_device.get(), self.pair_name.get())

    def refresh_all(self):
        registry = self.engine.registry.all()
        status = self.engine.status()
        ready = 0
        for d in registry:
            if d.get("enabled") and (d.get("family") == "govee" or d.get("windows_ble_address")):
                ready += 1
        self.connected_text.set(f"{ready} / {len(registry)} configured")
        self.status_text.set("SYSTEM ONLINE" if status.get("ok") else "SYSTEM CHECK")
        self._refresh_device_cards(registry, status)
        self._refresh_device_tree(registry, status)
        self._refresh_scenes()
        self._sync_audio_label()

    def _refresh_device_cards(self, registry, status):
        for child in self.dashboard_devices.winfo_children():
            child.destroy()
        status_by_family = {x.get("kind"):x for x in status.get("devices",[])}
        shown = [d for d in registry if d.get("id") != "govee_tv"]
        for col, d in enumerate(shown):
            card = tk.Frame(self.dashboard_devices,bg="#06101f",highlightthickness=1,highlightbackground="#1c4d80")
            card.grid(row=0,column=col,sticky="nsew",padx=4,pady=3)
            self.dashboard_devices.grid_columnconfigure(col,weight=1)
            fam = status_by_family.get(d.get("family"),{})
            selected = d["id"] == self.selected_device.get()
            tk.Label(card,text=d["label"],bg="#06101f",fg=PINK if selected else TEXT,font=("Segoe UI",10,"bold")).pack(pady=(8,2))
            tk.Label(card,text=f"{d['family']} · {d.get('role','')}",bg="#06101f",fg=MUTED,font=("Segoe UI",8)).pack()
            badge = "ENABLED" if d.get("enabled") else "OFF"
            tk.Label(card,text=badge,bg="#06101f",fg=GREEN if d.get("enabled") else RED,font=("Segoe UI",8,"bold")).pack(pady=3)
            binding = d.get("windows_ble_address") or fam.get("ip") or "not bound"
            tk.Label(card,text=str(binding),bg="#06101f",fg=CYAN,font=("Consolas",7),wraplength=145).pack(pady=2)
            NeonButton(card,"SELECT",lambda x=d["id"]:self.selected_device.set(x),accent=LILAC).pack(fill="x",padx=8,pady=(4,8))

    def _refresh_device_tree(self, registry, status):
        if not hasattr(self,"device_tree"): return
        for x in self.device_tree.get_children(): self.device_tree.delete(x)
        fam_status={x.get("kind"):x for x in status.get("devices",[])}
        for d in registry:
            s=fam_status.get(d.get("family"),{})
            binding=d.get("windows_ble_address") or s.get("ip") or ""
            self.device_tree.insert("", "end", iid=d["id"], values=(d["id"],d["family"],d["label"],d.get("role",""),d.get("enabled"),binding,s.get("detail","")))

    def _device_tree_selected(self, _event=None):
        sel=self.device_tree.selection()
        if sel: self.selected_device.set(sel[0])

    def scan_devices(self):
        self.discovery_status.set("SCANNING BLE · 6 SECONDS...")
        if hasattr(self, "discovery_tree"):
            for item in self.discovery_tree.get_children():
                self.discovery_tree.delete(item)
        self._run(self.engine.scan_all_ble(8.0), self._scan_done)

    def _scan_done(self, result):
        discovered = result.get("devices", []) if isinstance(result, dict) else []
        proposals = ble_model.propose_bindings(discovered, self.engine.registry.all())
        self.discovery_rows = {}
        ble_slots = [x["id"] for x in ble_model.ble_registry_entries(self.engine.registry.all())]
        if hasattr(self, "discovery_slot_combo"):
            self.discovery_slot_combo["values"] = tuple(ble_slots)
        if hasattr(self, "discovery_tree"):
            for item in self.discovery_tree.get_children():
                self.discovery_tree.delete(item)
            for index, row in enumerate(proposals):
                iid = f"found_{index}"
                self.discovery_rows[iid] = row
                rssi = row.get("rssi")
                signal = "" if rssi is None else str(rssi)
                self.discovery_tree.insert("", "end", iid=iid, values=(
                    row.get("name") or "(unnamed)",
                    row.get("family") or "unknown",
                    row.get("address") or "",
                    signal,
                    row.get("binding_state") or "",
                    row.get("suggested_device_id") or "",
                ))
        known = [x for x in proposals if x.get("family") in ("lenze","magic_lantern")]
        self.discovery_status.set(f"SCAN COMPLETE · {len(proposals)} FOUND · {len(known)} RECOGNIZED")
        if not result.get("ok", True):
            messagebox.showwarning("BLE Discovery", "Windows BLE scan failed:\n" + str(result.get("error") or "unknown error"))
        elif not proposals:
            messagebox.showinfo("BLE Discovery", "Windows reported no visible BLE devices. Check Bluetooth, power the lamps, close the phone app if it is holding a connection, and scan again.")

    def _discovery_selected(self, _event=None):
        if not hasattr(self, "discovery_tree"):
            return
        selected = self.discovery_tree.selection()
        if not selected:
            return
        row = self.discovery_rows.get(selected[0], {})
        suggestion = row.get("suggested_device_id")
        if suggestion:
            self.discovery_slot.set(suggestion)

    def bind_discovered(self):
        if not hasattr(self, "discovery_tree"):
            return
        selected = self.discovery_tree.selection()
        if not selected:
            return messagebox.showinfo("Discovery", "Select a found BLE device first.")
        row = self.discovery_rows.get(selected[0], {})
        slot = self.discovery_slot.get().strip()
        address = str(row.get("address") or "").strip()
        family = str(row.get("family") or "")
        target = self.engine.registry.get(slot) if slot else None
        if not address or not target:
            return messagebox.showwarning("Discovery", "A valid found address and target slot are required.")
        if family not in ("", "unknown") and target.get("family") != family:
            return messagebox.showwarning("Discovery", f"Family mismatch: found {family}, slot {slot} is {target.get('family')}.")
        try:
            self.engine.bind_windows_ble(slot, address)
            self.selected_device.set(slot)
            self.discovery_status.set(f"BOUND · {row.get('name') or address} → {slot}")
            self.refresh_all()
            messagebox.showinfo("Discovery", f"{row.get('name') or address} was bound to {slot}.\n\nThe slot stays disabled until you explicitly enable it. No hardware command was sent.")
        except Exception as exc:
            messagebox.showerror("Discovery", str(exc))

    def discover_govee(self):
        self.discovery_status.set("SEARCHING GOVEE LAN...")
        self._run(self.engine.govee.discover(), self._govee_discovery_done)

    def _govee_discovery_done(self, result):
        if result.get("ok"):
            source = result.get("source") or "LAN"
            verified = bool(result.get("probe", {}).get("ok"))
            self.discovery_status.set(f"GOVEE {'CONFIRMED' if verified else 'FOUND'} · {result.get('ip')}")
            if verified:
                messagebox.showinfo("Govee LAN Discovery", f"Govee H6047 confirmed at {result.get('ip')} via {source}.\nThe read-only devStatus probe passed.")
            else:
                messagebox.showinfo("Govee LAN Discovery", f"Govee candidate found at {result.get('ip')} via {source}.\nA read-only status probe is still required before any write.")
        else:
            self.discovery_status.set("GOVEE NOT FOUND")
            candidates = result.get("candidates") or []
            details = "\n".join(f"{x.get('ip')} · {x.get('source')} · {x.get('probe_reason') or 'no response'}" for x in candidates)
            messagebox.showinfo("Govee LAN Discovery", "No Govee LAN device answered the read-only status/discovery checks." + (("\n\nChecked:\n" + details) if details else ""))

    def connect_selected(self):
        did=self.selected_device.get()
        item=self.engine.registry.get(did)
        if not item: return
        if item.get("family")=="govee":
            return self._run(self.engine.govee.probe())
        address=item.get("windows_ble_address")
        if not address:
            messagebox.showinfo("Connect", "Windows BLE address is not bound yet. Use the preserved READ-ONLY lab to scan and bind this slot.")
            return
        messagebox.showinfo("Connect", f"{did} is bound to {address}. Persistent BLE connect is intentionally not promoted to a write-capable session; use READ-ONLY capture / verification in the lab.")

    def disconnect_selected(self):
        messagebox.showinfo("Disconnect", "No persistent write-capable BLE session is held by this Control Center. Govee uses stateless LAN packets; BLE lab captures disconnect after their read-only session.")

    def device_power(self, on):
        did=self.selected_device.get()
        if did=="govee_h6047":
            entry=self.engine.registry.get(did)
            if not entry or not entry.get("enabled"):
                return messagebox.showwarning("Power","Govee H6047 is disabled in registry.")
            return self._run(self.engine.govee.set_power(on))
        messagebox.showwarning("Safety Gate", f"{did}: individual hardware power write is blocked until the device protocol is hardware-verified.")

    def edit_selected_device(self):
        did=self.selected_device.get(); item=self.engine.registry.get(did)
        if not item: return
        label=simpledialog.askstring("Label","Device label:",initialvalue=item.get("label",""))
        if label is None: return
        role=simpledialog.askstring("Role","Role / position:",initialvalue=item.get("role",""))
        if role is None: return
        try:
            self.engine.registry.edit(did,{"label":label,"role":role})
            self.refresh_all()
        except Exception as exc:
            messagebox.showerror("Registry",str(exc))

    def bind_selected_address(self):
        did=self.selected_device.get(); item=self.engine.registry.get(did)
        if not item or item.get("transport")!="ble":
            return messagebox.showinfo("BLE Binding","Selected device is not a BLE registry slot.")
        value=simpledialog.askstring("BLE Binding","Windows BLE address / identifier:",initialvalue=item.get("windows_ble_address") or "")
        if value is None:return
        try:
            self.engine.bind_windows_ble(did,value.strip())
            self.refresh_all()
            messagebox.showinfo("BLE Binding","Address saved. Device remains disabled by design until you explicitly enable it.")
        except Exception as exc:
            messagebox.showerror("BLE Binding",str(exc))

    def toggle_selected_enabled(self):
        did=self.selected_device.get(); item=self.engine.registry.get(did)
        if not item:return
        try:
            updated=self.engine.registry.edit(did,{"enabled":not bool(item.get("enabled"))})
            self.refresh_all()
            messagebox.showinfo("Registry",f"{did}: enabled={updated.get('enabled')}")
        except Exception as exc:
            messagebox.showerror("Registry",str(exc))

    def target_power(self, on):
        targets=self._current_targets()
        if self.target_mode.get()=="all":
            return self._run(self.engine.set_power(on))
        if targets==["govee_h6047"]:
            return self._run(self.engine.govee.set_power(on))
        if not targets:
            return messagebox.showinfo("Target Power","No target selected.")
        messagebox.showwarning("Safety Gate",f"Target power {'ON' if on else 'OFF'} for {', '.join(targets)} is represented in the controller, but BLE hardware writes stay blocked until protocol + hardware validation.")

    def apply_custom_color(self):
        chosen=colorchooser.askcolor(title="Custom RGB")
        if not chosen or not chosen[0]:return
        r,g,b=[int(x) for x in chosen[0]]
        targets=self._current_targets()
        if targets==["govee_h6047"]:
            return self._run(self.engine.test_device_color("govee_h6047",r,g,b,self.brightness.get()))
        if self.target_mode.get()=="all":
            return self._run(self.engine.set_color(r,g,b,self.brightness.get()))
        messagebox.showinfo("Custom RGB",f"RGB({r},{g},{b}) selected for {', '.join(targets) or 'no target'}. Unverified BLE writes remain blocked.")

    def apply_color_scheme(self, name):
        spec=state.COLOR_SCHEMES[name]
        self.color_name.set(name); self.brightness.set(spec["brightness"])
        targets=self._current_targets()
        if targets==["govee_h6047"]:
            r,g,b=spec["rgb"]; return self._run(self.engine.test_device_color("govee_h6047",r,g,b,self.brightness.get()))
        if self.target_mode.get()=="all":
            r,g,b=spec["rgb"]; return self._run(self.engine.set_color(r,g,b,self.brightness.get()))
        messagebox.showinfo("Color Scheme", f"{name} selected for {', '.join(targets) or 'no target'}. Hardware dispatch is blocked for unverified BLE targets.")

    def apply_motion_scheme(self, name):
        self.motion_name.set(name)
        spec=state.MOTION_SCHEMES[name]
        self.global_speed.set(spec["speed"])
        targets=self._current_targets()
        if targets and all(x.startswith("oc21w_") for x in targets):
            try:
                return self._run(self.engine.set_magic_mode(spec["mode"],spec["speed"]))
            except Exception as exc:
                return self._async_error(exc)
        messagebox.showinfo("Motion Scheme", f"{name} armed for {', '.join(targets) or 'no target'}. Motion writes execute only when the selected hardware path is verified.")

    def _scene_snapshot(self):
        return {
            "color": self.color_name.get(),
            "motion": self.motion_name.get(),
            "brightness": int(self.brightness.get()),
            "speed": int(self.global_speed.get()),
            "audio": bool(self.audio_enabled.get()),
            "target_mode": self.target_mode.get(),
            "pair": self.pair_name.get(),
        }

    def _refresh_scenes(self):
        scenes=self.scene_store.list_scenes()
        for widget_name in ("scene_list","dashboard_scene_list"):
            widget=getattr(self,widget_name,None)
            if widget:
                current=widget.curselection()
                widget.delete(0,"end")
                for name in scenes: widget.insert("end",name)
                if current and current[0] < widget.size(): widget.selection_set(current[0])

    def _play_scene_name(self,name):
        scene=self.scene_store.list_scenes().get(name)
        if not scene:return
        if scene.get("color") in state.COLOR_SCHEMES:self.color_name.set(scene["color"])
        if scene.get("motion") in state.MOTION_SCHEMES:self.motion_name.set(scene["motion"])
        if "brightness" in scene:self.brightness.set(scene["brightness"])
        if "speed" in scene:self.global_speed.set(scene["speed"])
        if "audio" in scene:self.audio_enabled.set(bool(scene["audio"]))
        if "target_mode" in scene:self.target_mode.set(scene["target_mode"])
        if "pair" in scene:self.pair_name.set(scene["pair"])
        self._sync_audio_label()
        if self.color_name.get() in state.COLOR_SCHEMES:self.apply_color_scheme(self.color_name.get())

    def play_selected_scene(self):
        sel=self.scene_list.curselection()
        if sel:self._play_scene_name(self.scene_list.get(sel[0]))

    def play_selected_dashboard_scene(self):
        sel=self.dashboard_scene_list.curselection()
        if sel:self._play_scene_name(self.dashboard_scene_list.get(sel[0]))

    def save_current_scene(self):
        name=simpledialog.askstring("Save Scene","Scene name:")
        if not name:return
        try:self.scene_store.save(name,self._scene_snapshot());self._refresh_scenes()
        except Exception as exc:messagebox.showerror("Scene",str(exc))

    def delete_selected_scene(self):
        sel=self.scene_list.curselection()
        if not sel:return
        name=self.scene_list.get(sel[0])
        if name in state.DEFAULT_SCENES:
            return messagebox.showinfo("Scene","Built-in scenes are preserved.")
        self.scene_store.delete(name);self._refresh_scenes()

    def _sync_audio_label(self):
        self.audio_text.set("Audio Reactive: ON" if self.audio_enabled.get() else "Audio Reactive: OFF")

    def send_test_beat(self):
        sensitivity=self.audio_sensitivity.get()/100.0
        payload={"energy":int(255*sensitivity),"bass":220,"mid":130,"high":170,"kick":True,"drop":False}
        self._run(self.engine.audio(payload))


if __name__ == "__main__":
    App().mainloop()
