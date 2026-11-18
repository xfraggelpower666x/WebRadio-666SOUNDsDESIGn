"""Windows-Studio mit Audiowiedergabe, Konvertierung und separater GPU-Vorschau."""
from multiprocessing import get_context
from pathlib import Path
from queue import Empty, Full, SimpleQueue
from threading import Thread
from uuid import uuid4
from zipfile import BadZipFile

from light_wave_controls import Player
from light_wave_desktop import VERSION, app_folder
from light_wave_legacy import EDITIONS, launch_legacy
from light_wave_effects import EFFECT_NAMES
from light_wave_export import (
    AUDIO_QUALITIES, AUDIO_RATES, DEFAULT_AUDIO_QUALITIES, HEIGHT, MP3_RATES,
    RESOLUTIONS, VIDEO_FORMATS, VIDEO_QUALITIES, WIDTH, convert_audio,
)
from light_wave_gpu import preview_process
from light_wave_integrations import OPTICAL_EFFECT, hud_themes, lifx_themes, load_optical_spectrum, palette_rgb
from light_wave_shapes import DEFAULT_POINTS, SHAPE_EFFECT, open_shape_editor
from light_wave_radio import STREAM_URL
from light_wave_visualizer import Spectrum, time_text

BG = "#03001e"
PANEL = "#141330"
CYAN = "#00f2fe"
PINK = "#ff46ab"
TEXT = "#f5f6fa"
MUTED = "#a4b0be"
TITLE = "666AUDIO LIGHT WAVE · Studio"
FILE_TYPES = [("Audio", "*.wav *.mp3 *.flac *.ogg *.m4a *.aac"), ("Alle Dateien", "*.*")]
CODEC_LABELS = {"h264_nvenc": "NVIDIA NVENC", "h264_qsv": "Intel Quick Sync",
                "h264_amf": "AMD AMF", "libx264": "CPU · libx264", "libvpx-vp9": "CPU · libvpx"}


class Preview:
    def __init__(self):
        self.context = get_context("spawn")
        self.levels = self.context.Array("f", 28)
        self.audio = self.context.Queue(maxsize=128)
        self.connection = None
        self.process = None
        self.recording = None
        self.lost_audio = False

    def open(self, size=(WIDTH, HEIGHT)):
        if self.process is not None:
            return
        self.connection, child = self.context.Pipe()
        self.process = self.context.Process(target=preview_process, args=(child, self.levels, self.audio, size))
        self.process.start()
        child.close()

    def send(self, *message):
        if self.connection is None:
            return False
        try:
            self.connection.send(message)
            return True
        except (OSError, EOFError):
            return False

    def tap(self, block, rate, timestamp):
        token = self.recording
        if token is None:
            return
        try:
            self.audio.put_nowait((token, timestamp, rate, block.copy()))
        except Full:
            self.lost_audio = True

    def messages(self):
        if self.connection is None:
            return
        try:
            while self.connection.poll():
                yield self.connection.recv()
        except (OSError, EOFError):
            pass
        if not self.process.is_alive():
            self.process.join()
            self.connection.close()
            self.process, self.connection = None, None
            if self.recording is not None:
                yield "record_error", "Die Vorschau wurde vor Abschluss der Aufnahme beendet."
            yield "closed", ""

    def dispose(self):
        self.audio.cancel_join_thread()
        self.audio.close()


def run_studio():
    import av
    import certifi
    import sounddevice as sd
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title(TITLE)
    root.geometry("930x745")
    root.minsize(790, 675)
    root.configure(bg=BG)
    preview = Preview()
    player = Player(av, sd, certifi.where(), audio_tap=preview.tap)
    notices = SimpleQueue()
    current_file = None
    analyzer = None
    analyzer_settings = None
    legacy = None
    legacy_request = None
    legacy_log = app_folder() / f"renderer-{uuid4().hex[:8]}.log"
    ready = False
    sent_effect = None
    shape_points = DEFAULT_POINTS
    shape_editor = None
    palette = None
    optical_data = None
    sent_size = None
    render_size = None
    finishing = False
    closing = False
    converting = False
    menu = tk.Menu(root)
    root.configure(menu=menu)
    sources_menu = tk.Menu(menu, tearoff=False)
    menu.add_cascade(label="Wiedergabe", menu=sources_menu)
    tools_menu = tk.Menu(menu, tearoff=False)
    menu.add_cascade(label="Hilfe", menu=tools_menu)
    tools_menu.add_command(label="Über 666AUDIO LIGHT WAVE", command=lambda: messagebox.showinfo(
        TITLE, f"666AUDIO LIGHT WAVE {VERSION}\nStudio-Erweiterung · 666SOUNDsDESIGn\n"
        "Original: InfiniteQuantumZen / Sambodhi Padmasamadhi", parent=root))
    legacy_label = tk.StringVar()
    source_label = tk.StringVar(value="Datei auswählen oder Live-Radio starten")
    playback_label = tk.StringVar(value="Bereit")
    gpu_label = tk.StringVar(value="GPU-Vorschau geschlossen")
    record_label = tk.StringVar(value="")
    export_label = tk.StringVar(value="")
    volume = tk.DoubleVar(value=75)
    output_format = tk.StringVar(value="WAV")
    output_rate = tk.StringVar(value="Original")
    output_quality = tk.StringVar(value=DEFAULT_AUDIO_QUALITIES["WAV"])
    video_format = tk.StringVar(value="MP4")
    video_quality = tk.StringVar(value="Hoch")
    video_size = tk.StringVar(value="1280 × 720")
    hud = tk.BooleanVar(value=False)
    hud_theme = tk.StringVar(value="Studio")
    fft_size = tk.IntVar(value=4096)
    fft_adaptive = tk.BooleanVar(value=False)
    style = ttk.Style(root)
    style.theme_use("clam")
    style.configure("Studio.TCombobox", fieldbackground=PANEL, background=PANEL, foreground=TEXT,
                    arrowcolor=CYAN, selectbackground=PANEL, selectforeground=TEXT)
    root.option_add("*TCombobox*Listbox.background", PANEL)
    root.option_add("*TCombobox*Listbox.foreground", TEXT)

    content = tk.Frame(root, bg=BG, padx=20, pady=12)
    content.pack(fill="both", expand=True)

    def label(parent, value, *, muted=False, size=10):
        options = {"textvariable": value} if isinstance(value, tk.StringVar) else {"text": value}
        return tk.Label(parent, **options, bg=PANEL, fg=MUTED if muted else TEXT, anchor="w",
                        font=("Segoe UI", size), justify="left")

    def section(title):
        panel = tk.Frame(content, bg=PANEL, padx=14, pady=10, highlightbackground="#2c2752",
                         highlightthickness=1)
        panel.pack(fill="x", pady=(0, 8))
        label(panel, title, size=12).pack(fill="x", pady=(0, 6))
        return panel

    def button(parent, title, callback, *, accent=CYAN):
        item = tk.Button(parent, text=title, command=callback, bg="#24204a", fg=accent, activeforeground=TEXT,
                         activebackground="#3b3174", disabledforeground="#77738d",
                         font=("Segoe UI", 10), padx=12, pady=5, relief="flat", cursor="hand2")
        item.pack(side="left", padx=(0, 7))
        return item

    header = tk.Frame(content, bg=PANEL, highlightbackground=CYAN, highlightthickness=1)
    header.pack(fill="x", pady=(0, 10))
    tk.Label(header, text="666AUDIO LIGHT WAVE", font=("Segoe UI", 25, "bold"),
             bg=PANEL, fg=CYAN, padx=18, pady=12, anchor="w").pack(fill="x")

    sources = section("Wiedergabe")
    row = tk.Frame(sources, bg=PANEL)
    row.pack(fill="x")

    def select_file():
        nonlocal current_file
        if legacy is not None or legacy_request is not None:
            return
        path = filedialog.askopenfilename(parent=root, title="Audiodatei öffnen", filetypes=FILE_TYPES)
        if path:
            current_file = path
            source_label.set(Path(path).name)
            player.select(path)

    def select_radio():
        nonlocal current_file
        if legacy is not None or legacy_request is not None:
            return
        current_file = None
        source_label.set("666SOUNDsDESIGn · Live-Radio")
        player.select(STREAM_URL, live=True)

    file_btn = button(row, "Datei öffnen", select_file)
    radio_btn = button(row, "Live-Radio", select_radio)
    pause_btn = button(row, "Pause / Weiter", player.pause)
    stop_btn = button(row, "Stopp", player.stop)
    gain = tk.Scale(row, label="Lautstärke", from_=0, to=100, resolution=1, length=140,
                    orient="horizontal", variable=volume, command=lambda v: player.set_volume(float(v)/100),
                    bg=PANEL, fg=TEXT, troughcolor="#343059", highlightthickness=0)
    gain.pack(side="right")
    label(sources, source_label).pack(fill="x")
    label(sources, playback_label, muted=True).pack(fill="x")

    visual = section("GPU-Vorschau und Aufnahme")
    row = tk.Frame(visual, bg=PANEL)
    row.pack(fill="x")

    def show_preview():
        nonlocal ready, sent_size
        ready = False
        gpu_label.set("Öffne OpenGL-Vorschau …")
        sent_size = RESOLUTIONS[video_size.get()]
        preview.open(sent_size)

    def record():
        if not ready or finishing or preview.recording is not None or render_size != RESOLUTIONS[video_size.get()]:
            return
        format_name = video_format.get()
        quality = video_quality.get()
        extension = VIDEO_FORMATS[format_name][0]
        path = filedialog.asksaveasfilename(parent=root, title="Vorschau als Video aufnehmen",
                                            defaultextension=extension, filetypes=[(format_name, "*" + extension)])
        if not path:
            return
        if Path(path).suffix.lower() != extension:
            record_label.set(f"Bitte eine Datei mit der Endung {extension} auswählen.")
            return
        token = uuid4().hex
        preview.lost_audio = False
        preview.recording = token
        record_label.set(f"Starte {format_name}-Aufnahme …")
        if not preview.send("record", token, path, quality):
            preview.recording = None
            record_label.set("GPU-Vorschau ist nicht erreichbar.")

    def finish():
        nonlocal finishing
        if preview.recording is not None and not finishing:
            finishing = preview.send("finish")
            if finishing:
                record_label.set("Video wird fertiggestellt …")

    preview_btn = button(row, "Vorschau öffnen", show_preview)
    close_preview_btn = button(row, "Vorschau schließen", lambda: preview.send("close"))
    record_btn = button(row, "● Aufnahme starten", record, accent=PINK)
    finish_btn = button(row, "■ Aufnahme beenden", finish, accent=PINK)
    options_row = tk.Frame(visual, bg=PANEL)
    options_row.pack(fill="x", pady=(8, 1))

    def picker(parent, title, variable, options, width):
        label(parent, title).pack(side="left", padx=(0, 5))
        field = ttk.Combobox(parent, state="readonly", style="Studio.TCombobox", width=width,
                             textvariable=variable, values=tuple(options))
        field.pack(side="left", padx=(0, 10))
        return field

    size_picker = picker(options_row, "GPU-Größe", video_size, RESOLUTIONS, 15)
    format_picker = picker(options_row, "Video", video_format, VIDEO_FORMATS, 7)
    quality_picker = picker(options_row, "Qualität", video_quality, VIDEO_QUALITIES, 11)
    tk.Checkbutton(options_row, text="Vorschau-HUD", variable=hud,
                   command=lambda: preview.send("hud", hud.get()), bg=PANEL, fg=TEXT,
                   selectcolor=PANEL, activebackground=PANEL, activeforeground=TEXT,
                   highlightthickness=0).pack(side="left")

    effects_row = tk.Frame(visual, bg=PANEL)
    effects_row.pack(fill="x", pady=(6, 0))
    selected_effect = tk.StringVar(value="Spektrum")
    effect_intensity = tk.IntVar(value=100)
    effect_label = tk.StringVar()
    label(effects_row, "Effekt").pack(side="left", padx=(0, 8))
    ttk.Combobox(effects_row, state="readonly", style="Studio.TCombobox", width=23,
                 textvariable=selected_effect, values=EFFECT_NAMES).pack(side="left", padx=(0, 12))
    tk.Scale(effects_row, from_=0, to=150, orient="horizontal", label="Intensität (%)",
             variable=effect_intensity, length=175, bg=PANEL, fg=TEXT,
             troughcolor="#343059", highlightthickness=0).pack(side="left")
    def apply_shape(points):
        nonlocal shape_points
        shape_points = points
        selected_effect.set(SHAPE_EFFECT)
        preview.send("shape", points)

    def edit_shape():
        nonlocal shape_editor
        if closing:
            return
        if shape_editor is not None and shape_editor.winfo_exists():
            shape_editor.lift()
            return
        selected_effect.set(SHAPE_EFFECT)
        shape_editor = open_shape_editor(root, shape_points, apply_shape)

    def choose_palette():
        dialog = tk.Toplevel(root)
        dialog.title("LIFX-Farbbibliothek")
        dialog.geometry("490x470")
        dialog.transient(root)
        query = tk.StringVar()
        ttk.Label(dialog, text="Palette oder Kategorie suchen", padding=(8, 6)).pack(anchor="w")
        field = ttk.Entry(dialog, textvariable=query)
        field.pack(fill="x", padx=8)
        field.focus_set()
        panel = ttk.Frame(dialog, padding=8)
        panel.pack(fill="both", expand=True)
        scroll = ttk.Scrollbar(panel)
        scroll.pack(side="right", fill="y")
        items = tk.Listbox(panel, activestyle="dotbox", bg=PANEL, fg=TEXT,
                           selectbackground="#543f88", yscrollcommand=scroll.set)
        items.pack(side="left", fill="both", expand=True)
        scroll.configure(command=items.yview)
        theme_names = sorted(lifx_themes())

        def refresh(*_):
            items.delete(0, "end")
            for name in theme_names:
                if query.get().strip().casefold() in name.casefold():
                    items.insert("end", name)

        def use(name):
            nonlocal palette
            palette = palette_rgb(name) if name else None
            preview.send("palette", palette)
            if not selected_effect.get().startswith("Lichtzonen"):
                selected_effect.set("Lichtzonen · Aurora")
            effect_label.set(name or "Studio-Farbpalette")
            dialog.destroy()

        def apply_palette(event=None):
            selection = items.curselection()
            if selection:
                use(items.get(selection[0]))

        actions = ttk.Frame(dialog, padding=(8, 0, 8, 8))
        actions.pack(fill="x")
        ttk.Button(actions, text="Übernehmen", command=apply_palette).pack(side="left")
        ttk.Button(actions, text="Studio-Farben", command=lambda: use(None)).pack(side="left", padx=8)
        items.bind("<Double-Button-1>", apply_palette)
        dialog.bind("<Return>", apply_palette)
        query.trace_add("write", refresh)
        refresh()

    def import_spectrum():
        nonlocal optical_data
        filename = filedialog.askopenfilename(parent=root, title="LightwaveExplorer-Ergebnis öffnen",
                                               filetypes=[("Simulations-ZIP", "*.zip")])
        if not filename:
            return
        try:
            spectrum, max_thz = load_optical_spectrum(filename)
        except (OSError, ValueError, BadZipFile, RuntimeError) as error:
            messagebox.showerror("Spektrum importieren", str(error), parent=root)
            return
        optical_data = spectrum
        preview.send("optical", optical_data)
        selected_effect.set(OPTICAL_EFFECT)
        record_label.set(f"{Path(filename).name} · 0 bis {max_thz:.3g} THz · X / Y / Gesamt")

    def change_hud():
        hud.set(True)
        preview.send("hud", True)
        preview.send("hud_theme", hud_theme.get())

    button(effects_row, "3D-Formeditor", edit_shape)
    integrations = tk.Menu(menu, tearoff=False)
    menu.add_cascade(label="Visualisierung", menu=integrations)
    integrations.add_command(label="3D-Formeditor", command=edit_shape)
    integrations.add_command(label="LIFX-Farbbibliothek …", command=choose_palette)
    integrations.add_command(label="LightwaveExplorer-Spektrum importieren …", command=import_spectrum)
    fft_menu = tk.Menu(integrations, tearoff=False)
    integrations.add_cascade(label="FFT-Analyse", menu=fft_menu)
    fft_menu.add_checkbutton(label="Adaptive Block-Normierung", variable=fft_adaptive)
    fft_menu.add_separator()
    for samples in (2048, 4096, 8192):
        fft_menu.add_radiobutton(label=f"{samples} Samples", variable=fft_size, value=samples)
    themes = tk.Menu(integrations, tearoff=False)
    integrations.add_cascade(label="Vorschau-HUD-Design", menu=themes)
    for name in ("Studio", *hud_themes()):
        themes.add_radiobutton(label=name, variable=hud_theme, value=name, command=change_hud)

    label(visual, effect_label, muted=True).pack(fill="x")
    label(visual, gpu_label, muted=True).pack(fill="x", pady=(4, 0))
    label(visual, record_label, muted=True).pack(fill="x")

    def start_legacy(action):
        if closing or legacy is not None or legacy_request is not None:
            return
        if preview.recording is not None:
            messagebox.showinfo(TITLE, "Beende zuerst die laufende Videoaufnahme.", parent=root)
            return
        dialog = tk.Toplevel(root)
        dialog.title({"effects": "Klassische Videoeffekte",
                      "playlist": "Projekt-Playlist", "vr": "OpenVR"}[action])
        dialog.transient(root)
        dialog.configure(bg=PANEL, padx=14, pady=12)
        dialog.grab_set()
        fields = {}

        def pick(key, title, patterns=None, initial=""):
            line = tk.Frame(dialog, bg=PANEL)
            line.pack(fill="x", pady=3)
            label(line, title).pack(side="left", padx=(0, 6))
            field = fields[key] = tk.StringVar(value=initial)

            def browse():
                options = {"parent": dialog, "title": title}
                path = (filedialog.askopenfilename(filetypes=patterns, **options) if patterns
                        else filedialog.askdirectory(**options))
                if path:
                    field.set(path)

            button(line, "Auswählen", browse)
            tk.Entry(line, textvariable=field, width=46).pack(side="right", fill="x", expand=True)

        if action == "vr":
            pick("left", "Linker Bildordner")
            pick("right", "Rechter Bildordner")
        else:
            if action == "effects":
                initial = current_file if current_file and Path(current_file).suffix.lower() == ".wav" else ""
                pick("audio", "WAV-Datei", [("WAV", "*.wav")], initial)
            if action == "playlist":
                pick("music-folder", "Musikordner")
                fields["edition"] = tk.StringVar(value="CORE")
                ttk.Combobox(dialog, state="readonly", textvariable=fields["edition"],
                             values=EDITIONS).pack(anchor="w", pady=4)
            pick("clips", "Clip-Ordner")
            pick("sync-folder", "Keyframe-CSV-Ordner")
            pick("config", "Projektkonfiguration (optional)", [("JSON", "*.json")])
            fields["mode"] = tk.StringVar(value="normal")
            ttk.Combobox(dialog, state="readonly", textvariable=fields["mode"],
                         values=("normal", "minimal", "nsfw")).pack(anchor="w", pady=4)
            label(dialog, "Leere Ordnerfelder verwenden die Projektkonfiguration.", muted=True).pack(fill="x")
            label(dialog, "Videoaufnahmen verwenden die Studio-GPU-Vorschau.", muted=True).pack(fill="x")
        validation = tk.StringVar()
        label(dialog, validation).pack(fill="x")
        actions = tk.Frame(dialog, bg=PANEL)
        actions.pack(fill="x", pady=(8, 0))

        def submit():
            nonlocal legacy_request
            values = {key: value.get().strip() for key, value in fields.items()}
            required = {"effects": ("audio",), "playlist": (), "vr": ("left", "right")}[action]
            if any(not values[key] for key in required):
                validation.set("Bitte zuerst die benötigten Pfade auswählen.")
                return
            for key, value in values.items():
                if not value or key in {"mode", "edition"}:
                    continue
                path = Path(value).expanduser()
                valid = path.is_file() if key in {"audio", "config"} else path.is_dir()
                if not valid or (key == "audio" and path.suffix.lower() != ".wav"):
                    validation.set(f"Ungültiger Pfad: {value}")
                    return
                values[key] = str(path.resolve())
            legacy_request = [action]
            for key, value in values.items():
                if value:
                    legacy_request.extend((f"--{key}", value))
            player.stop()
            legacy_label.set("Starte separates Wiedergabefenster …")
            dialog.destroy()

        button(actions, "Starten", submit)
        button(actions, "Abbrechen", dialog.destroy)

    sources_menu.add_command(label="Datei öffnen …", command=select_file)
    sources_menu.add_command(label="Live-Radio", command=select_radio)
    sources_menu.add_separator()
    for title, action in (("Klassische Videoeffekte …", "effects"),
                          ("Projekt-Playlist …", "playlist"), ("OpenVR …", "vr")):
        sources_menu.add_command(label=title, command=lambda mode=action: start_legacy(mode))
    label(sources, legacy_label, muted=True).pack(fill="x")

    encoding = section("Audio konvertieren")
    row = tk.Frame(encoding, bg=PANEL)
    row.pack(fill="x")
    target = picker(row, "Format", output_format, AUDIO_QUALITIES, 7)
    rate_picker = picker(row, "Samplerate", output_rate, AUDIO_RATES, 11)
    audio_quality_picker = picker(row, "Qualität", output_quality, AUDIO_QUALITIES["WAV"], 14)

    def refresh_audio(event=None):
        audio_type = output_format.get()
        audio_quality_picker.configure(values=tuple(AUDIO_QUALITIES[audio_type]))
        output_quality.set(DEFAULT_AUDIO_QUALITIES[audio_type])
        rates = MP3_RATES if audio_type == "MP3" else tuple(AUDIO_RATES)
        rate_picker.configure(values=rates)
        if output_rate.get() not in rates:
            output_rate.set("48 kHz")

    target.bind("<<ComboboxSelected>>", refresh_audio)

    def convert():
        nonlocal converting
        source = current_file or filedialog.askopenfilename(parent=root, title="Quelle für Konvertierung",
                                                            filetypes=FILE_TYPES)
        if not source:
            return
        audio_type = output_format.get()
        ext = "." + audio_type.lower()
        rate = AUDIO_RATES[output_rate.get()]
        quality = output_quality.get()
        destination = filedialog.asksaveasfilename(parent=root, title="Konvertierte Audiodatei speichern",
                                                   initialfile=Path(source).stem + "-export" + ext,
                                                   defaultextension=ext, filetypes=[(output_format.get(), "*" + ext)])
        if not destination:
            return
        if Path(destination).suffix.lower() != ext or audio_type not in AUDIO_QUALITIES:
            export_label.set(f"Die Zieldatei braucht die Endung {ext}.")
            return
        converting = True
        export_label.set(f"Konvertiere {Path(source).name} …")

        def worker():
            try:
                convert_audio(av, source, destination, sample_rate=rate, quality=quality)
            except (av.FFmpegError, OSError, RuntimeError, ValueError, LookupError) as error:
                notices.put(f"Konvertierung fehlgeschlagen: {error}")
            else:
                notices.put(f"Audio gespeichert: {destination}")

        Thread(target=worker, name="Audiokonvertierung").start()

    convert_btn = button(row, "Audio speichern", convert)
    label(encoding, export_label, muted=True).pack(fill="x", pady=(4, 0))

    def close():
        nonlocal closing
        if legacy is not None or legacy_request is not None:
            messagebox.showinfo(TITLE, "Schließe zuerst das separate Wiedergabefenster.", parent=root)
            return
        if converting:
            messagebox.showinfo(TITLE, "Die Audiokonvertierung läuft noch.", parent=root)
            return
        if not closing:
            closing = True
            player.stop()
            preview.send("close")
            export_label.set("Schließe das Studio …")

    def enabled(widget, value):
        widget.configure(state="normal" if value else "disabled")

    def tick():
        nonlocal ready, finishing, converting, analyzer, analyzer_settings, legacy, legacy_request, sent_effect, sent_size, render_size
        player.update()
        if legacy_request is not None and player.worker is None:
            try:
                legacy = launch_legacy(legacy_request, legacy_log)
            except OSError as error:
                legacy_label.set(f"Start fehlgeschlagen: {error}")
            else:
                legacy_label.set("Separater Wiedergabemodus läuft.")
            legacy_request = None
        if legacy is not None:
            status = legacy.poll()
            if status is not None:
                legacy = None
                if status != 0:
                    log = legacy_log.read_text(encoding="utf-8", errors="replace") if legacy_log.is_file() else ""
                    messagebox.showerror(TITLE, f"{log.strip()[-2500:]}\n\nProtokoll: {legacy_log}", parent=root)
                legacy_label.set("Wiedergabemodus beendet." if status == 0 else f"Start/Wiedergabe fehlgeschlagen ({status}).")
        for event, text in preview.messages():
            if event == "renderer":
                ready = True
                gpu_label.set(f"OpenGL · {text} · Vorschaufenster per Titelleiste verschieben")
                preview.send("hud", hud.get())
                preview.send("hud_theme", hud_theme.get())
                preview.send("shape", shape_points)
                if palette is not None:
                    preview.send("palette", palette)
                if optical_data is not None:
                    preview.send("optical", optical_data)
            elif event == "input_error":
                record_label.set(text)
            elif event == "size":
                render_size = text
            elif event == "size_error":
                render_size, error = text
                video_size.set(next(name for name, size in RESOLUTIONS.items() if size == render_size))
                sent_size = render_size
                record_label.set(f"GPU-Größe konnte nicht geändert werden: {error}")
            elif event == "effect_active":
                effect_label.set(f"Aktiv: {text}")
            elif event == "effect_error":
                rejected, active = text
                if sent_effect is not None and selected_effect.get() == rejected and sent_effect[0] == rejected:
                    selected_effect.set(active)
                    sent_effect = (active, effect_intensity.get())
                    effect_label.set(f"{rejected} konnte nicht geladen werden. Aktiv: {active}")
            elif event == "recording":
                codec, description = text
                record_label.set(f"● Aufnahme · {description} · {CODEC_LABELS.get(codec, codec)}")
            elif event == "done":
                info = " · Audiopuffer war zeitweise voll" if preview.lost_audio else ""
                record_label.set("Video gespeichert: " + text + info)
                preview.recording, finishing = None, False
            elif event == "record_error":
                record_label.set("Aufnahme fehlgeschlagen: " + text)
                preview.recording, finishing = None, False
            elif event == "error":
                ready = False
                record_label.set(text)
            elif event == "closed":
                ready = False
                gpu_label.set("GPU-Vorschau geschlossen")
                effect_label.set("")
                sent_effect = sent_size = render_size = None
        try:
            export_label.set(notices.get_nowait())
            converting = False
        except Empty:
            pass
        source = player.source
        state = source.state if source is not None else None
        playing = state is not None and state.audio is not None
        paused = source is not None and source.paused.is_set()
        text = ("Pause" if paused else state.status) if state is not None else player.notice
        if state is not None and state.duration:
            text += f" · {time_text(min(state.position,state.duration))} / {time_text(state.duration)}"
        playback_label.set(text)
        requested_size = RESOLUTIONS[video_size.get()]
        if ready:
            if preview.recording is None and requested_size != sent_size and preview.send("size", requested_size):
                sent_size = requested_size
            settings = (selected_effect.get(), effect_intensity.get())
            if settings != sent_effect and preview.send("effect", settings[0], settings[1] / 100):
                sent_effect = settings
            if playing and not paused:
                audio_settings = (state.rate, fft_size.get(), fft_adaptive.get())
                if analyzer_settings != audio_settings:
                    import numpy as np
                    analyzer = Spectrum(np.empty(0), audio_settings[0], size=audio_settings[1],
                                        adaptive=audio_settings[2])
                    analyzer_settings = audio_settings
                preview.levels[:] = analyzer.update_block(state.audio, 1/30).tolist()
            else:
                preview.levels[:] = [0] * 28
        active_record = preview.recording is not None
        enabled(preview_btn, preview.process is None and not closing)
        enabled(close_preview_btn, preview.process is not None and not closing)
        enabled(record_btn, ready and render_size == requested_size and playing and not paused
                and not active_record and not closing)
        for picker_control in (size_picker, format_picker, quality_picker):
            picker_control.configure(state="disabled" if active_record or closing else "readonly")
        enabled(finish_btn, active_record and not finishing and not closing)
        enabled(convert_btn, not converting and not closing)
        enabled(pause_btn, playing and not source.live and not closing)
        for control in (file_btn, radio_btn, stop_btn):
            enabled(control, not closing and legacy is None and legacy_request is None)
        if closing and preview.process is None and player.worker is None:
            preview.dispose()
            root.destroy()
            return
        root.after(33, tick)

    root.protocol("WM_DELETE_WINDOW", close)
    tick()
    root.mainloop()
    return 0
