"""666SD Preset Studio: native Tkinter UI, non-destructive preset library.

Optional: tkinterdnd2 for OS drag/drop. No automatic package installation.
A canvas sketch is intentionally NOT claimed as a MilkDrop renderer.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import traceback
from datetime import datetime
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from generator import Settings, STYLES, VARIANTS, generate
from import_export import collect, import_presets, export_presets
from asset_manager import import_assets, export_assets, convert_image, classify_preset, EXTS
from shader_palette import palette_text, PALETTES
from spout_bridge import analyze_zip, inspect_dll
from studio_settings import load as load_settings, save as save_settings, source_capability, MODES, BROWSERS, RESOLUTIONS

ROOT = Path(sys.executable).resolve().parent if getattr(sys, 'frozen', False) else Path(__file__).resolve().parent.parent
RADIO_WAVE_DATA = os.environ.get('RADIO_WAVE_CYBER_STUDIO_DATA')
DATA_ROOT = Path(RADIO_WAVE_DATA).resolve() if RADIO_WAVE_DATA else ROOT
DEFAULT_LIBRARY = DATA_ROOT / 'library'
CONFIG = DATA_ROOT / 'gui_settings.json'


def load_config() -> dict:
    try:
        obj = json.loads(CONFIG.read_text(encoding='utf-8'))
        return obj if isinstance(obj, dict) else {}
    except (OSError, ValueError):
        return {}


def inspect_preset(path: Path) -> dict:
    """Read only: preserve every byte of foreign preset files."""
    raw = path.read_bytes()
    text = raw.decode('utf-8-sig', errors='replace')
    header = re.search(r'(?im)^\s*\[preset00\]\s*$', text)
    values = {}
    for line in text.splitlines():
        if '=' in line and not line.lstrip().startswith(('#', ';')):
            key, value = line.split('=', 1)
            if key.strip() in ('zoom', 'rot', 'warp', 'fDecay', 'nWaveMode', 'fWaveAlpha', 'fGammaAdj'):
                values[key.strip()] = value.strip()
    return {'name': path.name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'header': bool(header), 'values': values,
            'per_frame': len(re.findall(r'(?m)^per_frame_\d+=', text)),
            'per_pixel': len(re.findall(r'(?m)^per_pixel_\d+=', text)),
            'preview': '\n'.join(text.splitlines()[:180])}


class Studio:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.cfg = load_settings(CONFIG)
        self.library = Path(self.cfg.get('library') or str(DEFAULT_LIBRARY)).expanduser().resolve()
        self.library.mkdir(parents=True, exist_ok=True)
        root.title('666SOUNDsDESIGn · MilkDrop Cyber Studio v0.6.4')
        root.geometry('1400x850')
        root.minsize(1020, 650)
        self.style = tk.StringVar(value='psytechno')
        self.variant = tk.StringVar(value='mix')
        self.bpm = tk.StringVar(value='148')
        self.intensity = tk.StringVar(value='0.8')
        self.seed = tk.StringVar(value='666')
        self.count = tk.StringVar(value='5')
        self.status = tk.StringVar(value='Bereit · Die Textvorschau ist kein GPU-Rendering')
        self.path_by_id: dict[str, Path] = {}
        self.asset_path_by_id = {}
        self.asset_category = tk.StringVar(value='textures')
        self.gpu = tk.StringVar(value='Systemstandard (Renderer bestimmt)')
        self.quality = tk.StringVar(value='High (Empfehlung)')
        self.renderer_path = tk.StringVar(value=self.cfg.get('renderer',''))
        self.image_size = tk.StringVar(value='512')
        self.image_format = tk.StringVar(value='PNG')
        self.asset_info = tk.StringVar(value='Asset-Bibliothek bereit')
        self.palette_index = -1
        self.build()
        self.refresh()
        self.refresh_assets()
        self.enable_optional_dnd()
        self.root.bind('<KeyPress-c>', self.palette_hotkey)

    def build(self):
        self.root.configure(bg='#090717')
        style = ttk.Style(self.root)
        if 'clam' in style.theme_names(): style.theme_use('clam')
        bg='#090717'; panel='#17102c'; field='#100c20'; pink='#ff28cc'; cyan='#35eaff'; lilac='#bc85ff'; fg='#f4e9ff'
        style.configure('.', background=bg, foreground=fg, font=('Segoe UI',10))
        style.configure('TFrame',background=bg)
        style.configure('Panel.TFrame',background=panel)
        style.configure('TLabel',background=bg,foreground=fg)
        style.configure('Neon.TLabel',background=bg,foreground=cyan,font=('Segoe UI',12,'bold'))
        style.configure('Header.TLabel',background=bg,foreground=pink,font=('Segoe UI',18,'bold'))
        style.configure('TLabelFrame',background=bg,foreground=lilac)
        style.configure('TLabelFrame.Label',background=bg,foreground=lilac)
        style.configure('TButton',background=panel,foreground=fg,borderwidth=1,padding=(10,7))
        style.configure('Orange.TButton',background='#4c230e',foreground='#ffb04d',padding=(11,7))
        style.configure('Green.TButton',background='#163a2a',foreground='#57ff9b',padding=(11,7))
        style.map('TButton',background=[('active','#382458')],foreground=[('active',cyan)])
        style.configure('TEntry',fieldbackground=field,foreground=fg,insertcolor=cyan)
        style.configure('TCombobox',fieldbackground=field,foreground=fg,arrowcolor=cyan)
        style.map('TCombobox',fieldbackground=[('readonly',field)],foreground=[('readonly',fg)])
        style.configure('Treeview',background=field,fieldbackground=field,foreground=fg,rowheight=28,borderwidth=0)
        style.map('Treeview',background=[('selected','#7d236d')],foreground=[('selected','#ffffff')])
        style.configure('Treeview.Heading',background=panel,foreground=cyan,font=('Segoe UI',9,'bold'))
        style.configure('TNotebook',background=bg,borderwidth=0)
        style.configure('TNotebook.Tab',background=panel,foreground=lilac,padding=(18,12))
        style.map('TNotebook.Tab',background=[('selected','#382351')],foreground=[('selected',cyan)])
        head = ttk.Frame(self.root);head.pack(fill='x')
        ttk.Label(head,text='◉  666SOUNDsDESIGn  /  MILKDROP CYBER STUDIO',style='Header.TLabel',padding=(15,10)).pack(side='left')
        ttk.Button(head,text='⚙ SETTINGS / HELP',command=self.open_settings).pack(side='right',padx=14)

        ttk.Label(self.root,text='NEON PINK  •  LILAC  •  CYAN  •  ORANGE  •  GREEN   |   Non-destructive Asset Lab + External GPU Renderer',style='Neon.TLabel',padding=(15,0)).pack(anchor='w')
        notebook=ttk.Notebook(self.root)
        notebook.pack(fill='both',expand=True,padx=12,pady=12)
        preset=ttk.Frame(notebook,padding=7)
        assets=ttk.Frame(notebook,padding=7)
        editor=ttk.Frame(notebook,padding=7)
        renderer=ttk.Frame(notebook,padding=7)
        notebook.add(preset,text='◆ PRESET LIBRARY')
        notebook.add(assets,text='◈ ASSET FILE MANAGER')
        notebook.add(editor,text='✦ PRESET / IMAGE EDITOR')
        notebook.add(renderer,text='▣ MILKDROP GPU / OVERLAY')
        self.notebook=notebook
        self._preset_tab(preset)
        self._assets_tab(assets)
        self._editor_tab(editor)
        self._renderer_tab(renderer)
        ttk.Label(self.root,textvariable=self.status,anchor='w',padding=(12,8)).pack(fill='x')

    def _preset_tab(self,parent):
        bar=ttk.Frame(parent);bar.pack(fill='x',pady=5)
        for name,fn in [('Import .milk',self.import_file),('Import Folder',self.import_folder),
                        ('Personal Library ZIP',self.import_zip),('Export Selection',self.export_selected),
                        ('Export Library',self.export_all),('Choose Library',self.set_library),('Refresh',self.refresh)]:
            ttk.Button(bar,text=name,command=fn).pack(side='left',padx=3)
        body=ttk.PanedWindow(parent,orient='horizontal');body.pack(fill='both',expand=True,pady=8)
        left=ttk.Frame(body);right=ttk.Frame(body);body.add(left,weight=3);body.add(right,weight=4)
        ttk.Label(left,text='PRESETS · multi-select · Drag & Drop .milk / folder / ZIP',style='Neon.TLabel').pack(anchor='w')
        self.tree=ttk.Treeview(left,columns=('size','frame','pixel'),show='tree headings',selectmode='extended')
        self.tree.heading('#0',text='Preset / relative path')
        for key,name,width in [('size','Bytes',80),('frame','Frame',65),('pixel','Vertex',65)]:
            self.tree.heading(key,text=name);self.tree.column(key,width=width,stretch=False)
        self.tree.column('#0',width=390)
        self.tree.pack(side='left',fill='both',expand=True)
        scrollbar=ttk.Scrollbar(left,orient='vertical',command=self.tree.yview);scrollbar.pack(side='right',fill='y')
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.bind('<<TreeviewSelect>>',lambda e:self.display_selected())
        ttk.Label(right,text='PRESET INSPECTOR · original bytes read only',style='Neon.TLabel').pack(anchor='w')
        self.details=tk.Text(right,height=16,wrap='none',font=('Consolas',10),bg='#0d0a1c',fg='#66ebfa',insertbackground='#ff28cc')
        self.details.pack(fill='both',expand=True,pady=5);self.details.configure(state='disabled')
        buttons=ttk.Frame(right);buttons.pack(fill='x')
        ttk.Button(buttons,text='Open with Windows',command=self.open_selected).pack(side='left',padx=3)
        ttk.Button(buttons,text='Edit COPY in Editor',command=self.edit_selected).pack(side='left',padx=3)
        generation=ttk.LabelFrame(right,text='GENERATE NEW PRESETS',padding=10);generation.pack(fill='x',pady=10)
        fields=[('Style',self.style,list(STYLES)),('Variant',self.variant,['mix',*VARIANTS]),
                ('BPM',self.bpm,None),('Intensity 0–1',self.intensity,None),('Seed',self.seed,None),('Count',self.count,None)]
        for row,(label,var,values) in enumerate(fields):
            ttk.Label(generation,text=label).grid(row=row,column=0,sticky='w',pady=2)
            widget=ttk.Combobox(generation,textvariable=var,values=values,state='readonly') if values else ttk.Entry(generation,textvariable=var)
            widget.grid(row=row,column=1,sticky='ew',padx=8,pady=2)
        generation.columnconfigure(1,weight=1)
        ttk.Button(generation,text='GENERATE · NON-DESTRUCTIVE',style='Orange.TButton',command=self.make_presets).grid(row=6,column=0,columnspan=2,sticky='ew',pady=8)

    def _assets_tab(self,parent):
        controls=ttk.Frame(parent);controls.pack(fill='x',pady=7)
        ttk.Label(controls,text='CATEGORY',style='Neon.TLabel').pack(side='left',padx=7)
        chooser=ttk.Combobox(controls,textvariable=self.asset_category,values=list(EXTS),state='readonly',width=14)
        chooser.pack(side='left',padx=6);chooser.bind('<<ComboboxSelected>>',lambda e:self.refresh_assets())
        for text,action in [('Import Files',self.asset_import_files),('Import Folder',self.asset_import_folder),
                            ('Import Personal Library ZIP',self.asset_import_zip),('Export ZIP',self.asset_export),
                            ('Refresh',self.refresh_assets),('Open in Explorer',self.open_asset_folder)]:
            ttk.Button(controls,text=text,command=action).pack(side='left',padx=3)
        ttk.Label(parent,text='TEXTURES · SPRITES · WAVES · SHAPES · PRESETS | files remain byte-for-byte unchanged',style='Neon.TLabel').pack(anchor='w',pady=7)
        self.asset_tree=ttk.Treeview(parent,columns=('type','size'),show='tree headings',selectmode='extended')
        self.asset_tree.heading('#0',text='Path');self.asset_tree.column('#0',width=700)
        self.asset_tree.heading('type',text='Extension');self.asset_tree.column('type',width=100)
        self.asset_tree.heading('size',text='Bytes');self.asset_tree.column('size',width=120)
        self.asset_tree.pack(fill='both',expand=True)
        self.asset_tree.bind('<Double-1>',lambda e:self.open_selected_asset())
        self.asset_tree.bind('<<TreeviewSelect>>',lambda e:self.inspect_asset())
        ttk.Label(parent,textvariable=self.asset_info,anchor='w',padding=5).pack(fill='x')

    def _editor_tab(self,parent):
        ttk.Label(parent,text='PRESET EQUATIONS EDITOR · Save As only / new copy',style='Neon.TLabel').pack(anchor='w',pady=6)
        self.editor_source=tk.StringVar(value='(select preset or open .milk)')
        ttk.Label(parent,textvariable=self.editor_source).pack(anchor='w')
        ttk.Button(parent,text='Open .milk for editing',command=self.editor_open).pack(anchor='w',pady=6)
        self.editor_text=tk.Text(parent,height=16,wrap='none',bg='#0d0a1c',fg='#f3b0ff',insertbackground='#35eaff',font=('Consolas',10))
        self.editor_text.pack(fill='both',expand=True,pady=6)
        palettebar=ttk.Frame(parent);palettebar.pack(fill='x',pady=4)
        ttk.Button(palettebar,text='C · NEON COLOR CYCLE',style='Orange.TButton',command=self.cycle_palette).pack(side='left',padx=5)
        ttk.Label(palettebar,text='Edits working copy only · GPU recompile requires renderer reload').pack(side='left',padx=5)
        ttk.Button(parent,text='SAVE AS NEW .milk (never overwrite)',command=self.editor_save).pack(anchor='w',pady=4)
        ttk.Separator(parent).pack(fill='x',pady=10)
        ttk.Label(parent,text='IMAGE LAB · convert PNG / JPEG / BMP / WEBP / TGA into a NEW asset',style='Neon.TLabel').pack(anchor='w')
        row=ttk.Frame(parent);row.pack(fill='x',pady=9)
        ttk.Label(row,text='Output format').pack(side='left',padx=4)
        ttk.Combobox(row,values=['PNG','JPEG','WEBP','BMP','TGA'],textvariable=self.image_format,state='readonly',width=10).pack(side='left',padx=5)
        ttk.Label(row,text='Max px').pack(side='left',padx=5)
        ttk.Entry(row,textvariable=self.image_size,width=7).pack(side='left',padx=5)
        ttk.Button(row,text='CONVERT IMAGE · NEW COPY',command=self.editor_convert_image).pack(side='left',padx=7)
        ttk.Label(parent,text='Transparent PNG is preserved; JPEG discards alpha. Image editing beyond conversion is an upcoming module.').pack(anchor='w')

    def _renderer_tab(self,parent):
        ttk.Label(parent,text='EXTERNAL MILKDROP RENDERER · Windows-only launch adapter',style='Neon.TLabel').pack(anchor='w',pady=9)
        ttk.Label(parent,text='Renderer executable (the uploaded repository EXE is NOT auto-executed)').pack(anchor='w')
        row=ttk.Frame(parent);row.pack(fill='x',pady=7)
        ttk.Entry(row,textvariable=self.renderer_path,width=105).pack(side='left',fill='x',expand=True)
        ttk.Button(row,text='Browse EXE',command=self.renderer_browse).pack(side='left',padx=5)
        ttk.Button(parent,text='LAUNCH MILKDROP (EXTERNAL WINDOW)',style='Green.TButton',command=self.renderer_launch).pack(anchor='w',pady=12)
        ttk.Label(parent,text='GPU (selection requires native renderer integration)').pack(anchor='w')
        ttk.Combobox(parent,textvariable=self.gpu,values=['Systemstandard (Renderer bestimmt)'],state='readonly',width=50).pack(anchor='w',pady=8)
        ttk.Label(parent,text='Quality profile (stored preference; not applied to external renderer yet)').pack(anchor='w')
        ttk.Combobox(parent,textvariable=self.quality,values=['Low','Balanced','High (Empfehlung)','Ultra'],state='readonly',width=50).pack(anchor='w',pady=8)
        ttk.Button(parent,text='SAVE RENDERER PREFERENCES',command=self.renderer_save).pack(anchor='w',pady=8)
        ttk.Button(parent,text='DISPLAY SIZE / AUDIO SOURCES / HELP SETTINGS',command=self.open_settings).pack(anchor='w',pady=7)
        ttk.Button(parent,text='TEST WINDOW SIZE (not GPU render)',command=self.open_test_window).pack(anchor='w',pady=5)
        ttk.Label(parent,text='OPEN: borderless transparent GPU overlay, active GPU switching, shader/runtime control, live preview, host integration.',style='Neon.TLabel').pack(anchor='w',pady=10)
        ttk.Label(parent,text='Reason: uploaded C++ / DirectX project does not expose a verified controllable Python API.').pack(anchor='w')
        ttk.Separator(parent,orient='horizontal').pack(fill='x',pady=14)
        ttk.Label(parent,text='SPOUT2 · WINDOWS GPU TEXTURE BRIDGE / READ-ONLY DIAGNOSTIC',style='Neon.TLabel').pack(anchor='w',pady=4)
        ttk.Button(parent,text='INSPECT SPOUT2 SOURCE ZIP',command=lambda:self.inspect_bridge_archive('spout')).pack(anchor='w',pady=3)
        ttk.Button(parent,text='INSPECT SYPHON JAVA ZIP (MAC ONLY)',command=lambda:self.inspect_bridge_archive('syphon')).pack(anchor='w',pady=3)
        ttk.Button(parent,text='INSPECT SPOUT DLL PE HEADER (NO LOAD)',command=self.inspect_spout_dll).pack(anchor='w',pady=3)
        ttk.Label(parent,text='These diagnostics do not start Spout, load DLLs or stream GPU textures.').pack(anchor='w',pady=3)

    def inspect_bridge_archive(self,kind):
        path=filedialog.askopenfilename(parent=self.root,title='Select original source ZIP',filetypes=[('ZIP archives','*.zip')])
        if not path:return
        try:
            data=analyze_zip(Path(path),kind)
            messagebox.showinfo('Bridge source inspection',json.dumps(data,ensure_ascii=False,indent=2),parent=self.root)
            self.report('Spout/Syphon read-only archive inspection: '+data['status'])
        except (OSError,ValueError,RuntimeError) as exc:self.show_error('Bridge inspection',exc)

    def inspect_spout_dll(self):
        path=filedialog.askopenfilename(parent=self.root,title='Select Spout DLL',filetypes=[('DLL','*.dll')])
        if not path:return
        try:
            data=inspect_dll(Path(path))
            messagebox.showinfo('Spout DLL header inspection',json.dumps(data,ensure_ascii=False,indent=2),parent=self.root)
            self.report('Spout DLL inspection: '+data['status'])
        except (OSError,ValueError) as exc:self.show_error('Spout DLL inspection',exc)


    def open_test_window(self):
        """Nur Geometrie-Test, niemals als GPU-Live-Preview ausgeben."""
        w=int(self.cfg['display_width']); h=int(self.cfg['display_height'])
        win=tk.Toplevel(self.root)
        win.title('666SD DISPLAY TEST ONLY · NO GPU VISUALIZATION')
        win.geometry(f'{w}x{h}')
        win.configure(bg='#100a20')
        ttk.Label(win,text=f'DISPLAY GEOMETRY TEST  {w} × {h}  |  NOT MILKDROP GPU',style='Neon.TLabel').pack(padx=24,pady=28)
        ttk.Button(win,text='CLOSE',command=win.destroy).pack()

    def open_settings(self):
        """Zentrale, speicherbare Einstellungen mit ehrlichen Backend-Statusangaben."""
        dlg=tk.Toplevel(self.root)
        dlg.title('666SD · SETTINGS / HELP / AUDIO ROUTING')
        dlg.geometry('880x780');dlg.minsize(720,600);dlg.configure(bg='#090717')
        dlg.transient(self.root)
        tabs=ttk.Notebook(dlg);tabs.pack(fill='both',expand=True,padx=12,pady=12)
        values={k:tk.StringVar(value=str(v)) for k,v in self.cfg.items() if k not in ('overlay_topmost','help_tooltips')}
        bools={k:tk.BooleanVar(value=bool(self.cfg.get(k))) for k in ('overlay_topmost','help_tooltips')}
        def field(parent,label,key,opts=None):
            row=ttk.Frame(parent);row.pack(fill='x',padx=9,pady=5)
            ttk.Label(row,text=label,width=29).pack(side='left')
            if opts:widget=ttk.Combobox(row,textvariable=values[key],values=list(opts),state='readonly')
            else:widget=ttk.Entry(row,textvariable=values[key])
            widget.pack(side='left',fill='x',expand=True)
        display=ttk.Frame(tabs);audio=ttk.Frame(tabs);help_tab=ttk.Frame(tabs);advanced=ttk.Frame(tabs)
        for pane,label in ((display,'DISPLAY / GPU'),(audio,'AUDIO SOURCES'),(advanced,'RENDER QUALITY'),(help_tab,'HELP / GENERAL')):tabs.add(pane,text=label)
        field(display,'Window mode','display_mode',('windowed','borderless','fullscreen'))
        field(display,'Width (px)','display_width');field(display,'Height (px)','display_height')
        presetrow=ttk.Frame(display);presetrow.pack(fill='x',padx=9,pady=7)
        ttk.Label(presetrow,text='Preset resolution',width=29).pack(side='left')
        choice=tk.StringVar(value='1280x720')
        pick=ttk.Combobox(presetrow,textvariable=choice,state='readonly',values=[f'{w}x{h}' for w,h in RESOLUTIONS])
        pick.pack(side='left')
        def use_resolution(*_):
            w,h=choice.get().split('x');values['display_width'].set(w);values['display_height'].set(h)
        pick.bind('<<ComboboxSelected>>',use_resolution)
        field(display,'Monitor index','monitor_index');field(display,'Display X','display_x');field(display,'Display Y','display_y')
        field(display,'GPU preference (stored only)','gpu_preference')
        ttk.Checkbutton(display,text='Always-on-top overlay (stored; renderer control OPEN)',variable=bools['overlay_topmost']).pack(anchor='w',padx=9,pady=7)
        field(display,'Overlay opacity','overlay_alpha')
        ttk.Label(display,text='Sizes saved; external GPU window cannot yet be resized automatically.',style='Neon.TLabel').pack(anchor='w',padx=9,pady=8)
        field(audio,'Capture type','audio_mode',MODES)
        field(audio,'Browser','audio_browser',BROWSERS)
        field(audio,'Device ID / Name','audio_device')
        field(audio,'Process ID','audio_process_id')
        field(audio,'Browser tab identifier','audio_tab')
        source_status=tk.StringVar(value='')
        ttk.Label(audio,textvariable=source_status,wraplength=750,style='Neon.TLabel').pack(anchor='w',padx=9,pady=9)
        def status(*_):
            stage,desc=source_capability(values['audio_mode'].get(),values['audio_browser'].get())
            source_status.set(f'{stage}: {desc}')
        values['audio_mode'].trace_add('write',status);values['audio_browser'].trace_add('write',status);status()
        ttk.Button(audio,text='LIST AUDIO INPUT DEVICES (read only)',command=self.list_audio_devices).pack(anchor='w',padx=9,pady=8)
        ttk.Label(audio,text='No audio capture starts without an explicit user action. No browser permissions are bypassed.',wraplength=760).pack(anchor='w',padx=9,pady=5)
        ttk.Button(advanced,text='DIRECTX SDK MANAGER (optional / separate)',command=self.open_directx_manager).pack(anchor='w',padx=9,pady=8)
        field(advanced,'FPS limit (stored)','fps_limit')
        field(advanced,'Shader quality (stored)','shader_quality',('renderer-default','low','medium','high','ultra'))
        field(advanced,'Texture quality (stored)','texture_quality',('renderer-default','low','medium','high','ultra'))
        field(advanced,'Canvas scale (stored)','canvas_scale')
        field(advanced,'Mesh X (stored)','mesh_x');field(advanced,'Mesh Y (stored)','mesh_y')
        ttk.Label(advanced,text='Values are preference profiles, NOT applied to external MilkDrop without native adapter.',wraplength=760,style='Neon.TLabel').pack(anchor='w',padx=9,pady=15)
        field(help_tab,'Language','language',('en-US','de-DE'))
        field(help_tab,'Help detail','help_detail',('compact','expanded'))
        ttk.Checkbutton(help_tab,text='Show tooltips / inline help',variable=bools['help_tooltips']).pack(anchor='w',padx=9,pady=8)
        field(help_tab,'Library path','library')
        help_text="""q1..q32: INIT → per-frame → per-vertex, custom wave, custom shape, shaders.
Per-frame q changes are reset to init defaults each new frame.
t1..t8: own INIT/per-frame scopes for each custom wave and shape.
Per-point and per-vertex scratch values do not persist between points.
Audio: Device, WASAPI endpoint/process and browser-tab capture are separate adapters.
Edge/Chrome tab capture needs explicit extension interaction.
Firefox requires its own verified adapter; Safari on Windows unsupported.
External GPU renderer is launched only on confirmation and is NOT bundled.
Licensing: Uploaded MilkDrop3 LICENSE.txt restricts commercial/pro use.
"""
        t=tk.Text(help_tab,height=13,wrap='word',bg='#100c20',fg='#35eaff');t.pack(fill='both',expand=True,padx=9,pady=7)
        t.insert('1.0',help_text);t.configure(state='disabled')
        def save_all():
            d=dict(self.cfg)
            for k,v in values.items():d[k]=v.get()
            for k,v in bools.items():d[k]=v.get()
            try:
                d=save_settings(CONFIG,d)
                self.cfg=d;self.renderer_path.set(d['renderer']);self.quality.set(d['quality_preference'])
                self.report('Preferences saved atomically; external renderer controls remain independent')
                dlg.destroy()
            except (OSError,ValueError) as exc:self.show_error('Settings validation/save',exc)
        row=ttk.Frame(dlg);row.pack(fill='x',padx=12,pady=8)
        ttk.Button(row,text='SAVE ALL SETTINGS',style='Green.TButton',command=save_all).pack(side='left')
        ttk.Button(row,text='CANCEL',command=dlg.destroy).pack(side='right')

    def open_directx_manager(self):
        import os
        from tkinter import messagebox
        if os.name != 'nt':
            messagebox.showinfo('DirectX SDK', 'DirectX SDK Manager kann nur unter Windows gestartet werden.')
            return
        if not messagebox.askyesno('DirectX SDK Manager', 'Optionales Microsoft DirectX SDK (June 2010).\n\nDas SDK wird fuer den Python-Generator nicht zwingend gebraucht.\nDen READ-ONLY Check in einer Konsole starten?'):
            return
        if RADIO_WAVE_DATA:
            import subprocess
            powershell = Path(os.environ['SystemRoot']) / 'System32' / 'WindowsPowerShell' / 'v1.0' / 'powershell.exe'
            script = ROOT / 'scripts' / 'directx_sdk.ps1'
            try:
                subprocess.Popen(
                    [str(powershell), '-NoProfile', '-NoExit', '-File', str(script), '-Action', 'check'],
                    cwd=str(DATA_ROOT), creationflags=subprocess.CREATE_NEW_CONSOLE,
                )
            except OSError as exc:
                self.show_error('DirectX SDK manager', exc)
            return
        batch=ROOT/'CHECK_DIRECTX_SDK.bat'
        if not batch.exists():
            messagebox.showerror('DirectX SDK','CHECK_DIRECTX_SDK.bat nicht gefunden.\nBei portabler EXE die Batch-Dateien neben die EXE legen.')
            return
        import subprocess
        try:
            subprocess.Popen(['cmd.exe','/c',str(batch)],cwd=str(ROOT),creationflags=subprocess.CREATE_NEW_CONSOLE)
        except OSError as exc:
            self.show_error('DirectX SDK manager',exc)

    def list_audio_devices(self):
        win=tk.Toplevel(self.root);win.title('Audio device discovery · read only')
        text=tk.Text(win,width=100,height=28,bg='#100c20',fg='#35eaff');text.pack(fill='both',expand=True)
        try:
            import sounddevice as sd
            devices=sd.query_devices()
            lines=[f'{i}: {d["name"]} | inputs={d["max_input_channels"]} outputs={d["max_output_channels"]}' for i,d in enumerate(devices)]
            text.insert('1.0','\n'.join(lines) if lines else 'No devices returned')
        except Exception as exc:
            text.insert('1.0','Audio device discovery unavailable: '+str(exc)+'\nOptional dependency: sounddevice. No capture attempted.')
        text.configure(state='disabled')

    def asset_import(self,sources):
        if not sources:return
        import zipfile
        try:
            folder,items=import_assets(sources,self.library,self.asset_category.get())
            self.refresh_assets();self.report(f'{len(items)} assets imported without overwrite: {folder}')
        except (OSError,ValueError,zipfile.BadZipFile) as exc:self.show_error('Asset import',exc)

    def asset_import_files(self):
        files=filedialog.askopenfilenames(parent=self.root,title='Import multiple asset files')
        if files:self.asset_import(files)

    def asset_import_folder(self):
        d=filedialog.askdirectory(parent=self.root)
        if d:self.asset_import([d])

    def asset_import_zip(self):
        f=filedialog.askopenfilename(parent=self.root,filetypes=[('ZIP archive','*.zip')])
        if f:self.asset_import([f])

    def refresh_assets(self):
        self.asset_tree.delete(*self.asset_tree.get_children());self.asset_path_by_id={}
        category=self.asset_category.get();base=self.library/category
        n=0
        if base.exists():
            for p in sorted(base.rglob('*')):
                if n>=15000:break
                if p.is_file() and not p.is_symlink() and p.suffix.lower() in EXTS[category]:
                    item=self.asset_tree.insert('', 'end', text=p.relative_to(base).as_posix(),values=(p.suffix,p.stat().st_size))
                    self.asset_path_by_id[item]=p;n+=1
        self.asset_info.set(f'{category}: {n} files / {base}')

    def asset_export(self):
        target=filedialog.asksaveasfilename(parent=self.root,defaultextension='.zip',filetypes=[('ZIP','*.zip')])
        if not target:return
        try:
            n=export_assets(self.library,target)
            self.report(f'{n} assets exported to {target}')
        except (OSError,ValueError) as exc:self.show_error('Asset export',exc)

    def open_asset_folder(self):
        p=self.library/self.asset_category.get();p.mkdir(parents=True,exist_ok=True)
        if sys.platform=='win32':os.startfile(str(p))
        else:self.report(str(p))

    def inspect_asset(self):
        sel=self.asset_tree.selection()
        if not sel:return
        p=self.asset_path_by_id[sel[0]]
        message=f'{p.name} · {p.stat().st_size:,} bytes · SHA256 {hashlib.sha256(p.read_bytes()).hexdigest()}'
        if p.suffix.lower()=='.milk':message+=' · '+str(classify_preset(p.read_bytes()))
        self.asset_info.set(message)

    def open_selected_asset(self):
        selected=self.asset_tree.selection()
        if selected and sys.platform=='win32':os.startfile(str(self.asset_path_by_id[selected[0]]))

    def edit_selected(self):
        paths=self.selected_paths()
        if len(paths)!=1:self.report('Select exactly one preset');return
        self._open_editor_path(paths[0]);self.notebook.select(2)

    def editor_open(self):
        path=filedialog.askopenfilename(parent=self.root,filetypes=[('MilkDrop','*.milk'),('All','*.*')])
        if path:self._open_editor_path(Path(path))

    def _open_editor_path(self,path):
        try:
            from import_export import check_preset
            raw=Path(path).read_bytes();check_preset(raw,str(path))
            self.editor_text.delete('1.0','end');self.editor_text.insert('1.0',raw.decode('utf-8-sig',errors='replace'))
            self.editor_source.set(str(path)+'  |  edit a NEW COPY only')
        except (OSError,ValueError) as exc:self.show_error('Editor',exc)

    def palette_hotkey(self,event):
        """C applies when editor tab is active, but never steals typing in text widgets."""
        if self.notebook.index(self.notebook.select()) != 2:
            return
        if isinstance(self.root.focus_get(), (tk.Text, tk.Entry, ttk.Entry, ttk.Combobox)):
            return
        self.cycle_palette()
        return 'break'

    def cycle_palette(self):
        existing=self.editor_text.get('1.0','end-1c')
        new_idx=(self.palette_index+1)%len(PALETTES)
        try:
            updated, label=palette_text(existing,new_idx)
        except ValueError as exc:
            self.show_error('Neon Color Cycle',exc)
            return
        self.editor_text.delete('1.0','end')
        self.editor_text.insert('1.0',updated)
        self.palette_index=new_idx
        self.report('Neon palette: '+label+' · working copy modified · save as new file / reload in renderer')

    def editor_save(self):
        from import_export import check_preset
        data=self.editor_text.get('1.0','end-1c').encode('utf-8')
        try:check_preset(data,'custom.milk')
        except ValueError as exc:self.show_error('Preset validation',exc);return
        target=filedialog.asksaveasfilename(parent=self.root,defaultextension='.milk',filetypes=[('MilkDrop preset','*.milk')])
        if not target:return
        try:
            with open(target,'xb') as f:f.write(data)
            self.report('Created new preset copy: '+target)
        except OSError as exc:self.show_error('Save As',exc)

    def editor_convert_image(self):
        src=filedialog.askopenfilename(parent=self.root,filetypes=[('Images','*.png *.jpg *.jpeg *.webp *.bmp *.tga *.gif')])
        if not src:return
        ext={'PNG':'.png','JPEG':'.jpg','WEBP':'.webp','BMP':'.bmp','TGA':'.tga'}[self.image_format.get()]
        target=filedialog.asksaveasfilename(parent=self.root,defaultextension=ext,filetypes=[('Target image','*'+ext)])
        if not target:return
        try:
            convert_image(src,target,max_side=int(self.image_size.get()))
            self.report('Image converted to new file: '+target)
        except (OSError,ValueError,RuntimeError) as exc:self.show_error('Convert image',exc)

    def renderer_browse(self):
        f=filedialog.askopenfilename(parent=self.root,filetypes=[('Windows EXE','*.exe')])
        if f:self.renderer_path.set(f)

    def renderer_save(self):
        self.cfg['renderer']=self.renderer_path.get()
        self.cfg['quality_preference']=self.quality.get()
        try:self.cfg=save_settings(CONFIG,self.cfg)
        except OSError as exc:self.show_error('Config save',exc);return
        self.report('Renderer path and quality preference saved (quality not applied to external renderer)')

    def renderer_launch(self):
        import subprocess
        p=Path(self.renderer_path.get())
        if sys.platform!='win32':self.show_error('Renderer','Windows only');return
        if not p.is_file() or p.suffix.lower()!='.exe':self.show_error('Renderer','Choose an existing Windows .exe');return
        if not messagebox.askyesno('Start external renderer','Launch this user-selected executable?\n'+str(p),parent=self.root):return
        try:
            subprocess.Popen([str(p)],cwd=str(p.parent),shell=False)
            self.report('External renderer started. GPU/overlay integration remains unverified.')
        except OSError as exc:self.show_error('Renderer start',exc)

    def report(self, message):
        self.status.set(message)

    def show_error(self, title, error):
        self.report(f'{title}: {error}')
        messagebox.showerror(title, str(error), parent=self.root)

    def refresh(self):
        self.tree.delete(*self.tree.get_children())
        self.path_by_id.clear()
        count = 0
        # Begrenzt die Anzeige, nicht die eigentliche Bibliothek.
        for p in sorted(self.library.rglob('*'), key=lambda q: str(q).casefold()):
            if count >= 10000:
                self.report('Anzeige auf 10.000 Dateien begrenzt')
                break
            if not p.is_file() or p.is_symlink() or p.suffix.lower() != '.milk': continue
            try:
                info=inspect_preset(p)
            except OSError: continue
            item=self.tree.insert('', 'end', text=str(p.relative_to(self.library)),
                                  values=(info['bytes'], info['per_frame'], info['per_pixel']))
            self.path_by_id[item]=p
            count+=1
        self.report(f'{count} Presets angezeigt · {self.library}')

    def selected_paths(self):
        return [self.path_by_id[i] for i in self.tree.selection() if i in self.path_by_id]

    def display_selected(self):
        paths=self.selected_paths()
        if not paths: return
        try:
            data=inspect_preset(paths[0])
            header=(f"Datei: {paths[0]}\nSHA-256: {data['sha256']}\n"
                    f"[preset00]: {data['header']} | Per-Frame: {data['per_frame']} | Per-Vertex: {data['per_pixel']}\n"
                    f"Parameter: {data['values']}\n\n--- ROHTEXT-AUSZUG (nicht verändert) ---\n")
            self.details.configure(state='normal')
            self.details.delete('1.0','end')
            self.details.insert('1.0',header+data['preview'])
            self.details.configure(state='disabled')
        except OSError as e: self.show_error('Preset lesen', e)

    def import_from(self, path):
        if not path:return
        try:
            # Jeder Import kommt in einen neuen Containerordner; keine Konflikte mit vorhandenen Originalen.
            base=self.library/'imports'
            base.mkdir(parents=True,exist_ok=True)
            stem=Path(path).stem.replace(' ', '_')[:50]
            i=1
            while (base/f'{stem}_{i:03d}').exists(): i+=1
            target=base/f'{stem}_{i:03d}'
            items=import_presets(Path(path),target)
            self.refresh()
            self.report(f'{len(items)} Presets bytegenau importiert → {target}')
        except (OSError, ValueError) as e: self.show_error('Import fehlgeschlagen',e)

    def import_file(self):
        self.import_from(filedialog.askopenfilename(parent=self.root,filetypes=[('MilkDrop Preset','*.milk'),('Alle Dateien','*.*')]))

    def import_folder(self):
        self.import_from(filedialog.askdirectory(parent=self.root))

    def import_zip(self):
        self.import_from(filedialog.askopenfilename(parent=self.root,filetypes=[('ZIP Presetpaket','*.zip')]))

    def export_all(self):
        target=filedialog.asksaveasfilename(parent=self.root,defaultextension='.zip',filetypes=[('ZIP','*.zip')],initialfile='666SD_presets.zip')
        if not target:return
        try:
            files=export_presets(self.library,Path(target))
            self.report(f'{len(files)} Presets exportiert → {target}')
        except (OSError,ValueError) as e:self.show_error('Export fehlgeschlagen',e)

    def export_selected(self):
        paths=self.selected_paths()
        if not paths:
            messagebox.showinfo('Export','Bitte zuerst ein oder mehrere Presets auswählen.',parent=self.root)
            return
        target=filedialog.asksaveasfilename(parent=self.root,defaultextension='.zip',filetypes=[('ZIP','*.zip')],initialfile='666SD_selection.zip')
        if not target:return
        # Keine Umbenennung oder flache Kollisionen: relativen Pfad beibehalten.
        from import_export import check_preset
        import zipfile
        try:
            if Path(target).exists():raise FileExistsError('Zieldatei existiert bereits')
            pairs=[]
            for p in paths:
                data=p.read_bytes()
                check_preset(data,p.name)
                pairs.append((p.relative_to(self.library).as_posix(), data))
            with zipfile.ZipFile(target,'x',compression=zipfile.ZIP_DEFLATED) as z:
                for name,data in pairs: z.writestr(name,data)
                z.writestr('666SD_export_manifest.json',json.dumps({'format':'666SD selected presets','version':'0.3.0','files':[
                    {'path':name,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()} for name,data in pairs]},indent=2))
            self.report(f'{len(pairs)} ausgewählte Presets exportiert → {target}')
        except (OSError,ValueError) as e: self.show_error('Auswahl exportieren',e)

    def make_presets(self):
        try:
            count=int(self.count.get()); bpm=float(self.bpm.get()); intensity=float(self.intensity.get()); seed=int(self.seed.get())
            output=self.library/'generated'/self.style.get()
            result=generate(output,self.style.get(),self.variant.get(),bpm,intensity,seed,count)
            self.refresh()
            self.report(f'{len(result)} Presets erzeugt → {output}')
        except (OSError,ValueError) as e:self.show_error('Generieren fehlgeschlagen',e)

    def open_selected(self):
        paths=self.selected_paths()
        if len(paths)!=1:
            messagebox.showinfo('Öffnen','Bitte genau ein Preset auswählen.',parent=self.root)
            return
        if sys.platform != 'win32':
            messagebox.showinfo('Öffnen','Diese Startfunktion verwendet Windows-Dateizuordnungen. Preset kann im Inspektor gelesen werden.',parent=self.root)
            return
        try:
            os.startfile(str(paths[0]))
            self.report('An Windows-Dateizuordnung übergeben. Echte Renderer-Prüfung steht aus.')
        except OSError as e:self.show_error('Windows-Öffnen fehlgeschlagen',e)

    def set_library(self):
        chosen=filedialog.askdirectory(parent=self.root,title='Preset-Bibliotheksordner wählen')
        if not chosen:return
        self.library=Path(chosen).resolve()
        self.cfg['library']=str(self.library)
        try: self.cfg=save_settings(CONFIG,self.cfg)
        except OSError as e:self.show_error('Konfiguration speichern',e);return
        self.refresh()

    def enable_optional_dnd(self):
        if not hasattr(self.root,'drop_target_register'):
            self.report(self.status.get()+' · Drag & Drop optional: pip install tkinterdnd2')
            return
        from tkinterdnd2 import DND_FILES
        self.root.drop_target_register(DND_FILES)
        self.root.dnd_bind('<<Drop>>',self.drop_files)
        self.asset_tree.drop_target_register(DND_FILES)
        self.asset_tree.dnd_bind('<<Drop>>',self.drop_asset_files)

    def drop_asset_files(self,event):
        try: paths=list(self.root.tk.splitlist(event.data))
        except tk.TclError as exc:self.show_error('Asset Drag & Drop',exc);return
        if paths:self.asset_import(paths)

    def drop_files(self,event):
        try: paths=list(self.root.tk.splitlist(event.data))
        except tk.TclError as e:self.show_error('Drag & Drop',e);return
        presets=[path for path in paths if Path(path).suffix.lower()=='.milk' or Path(path).is_dir() or Path(path).suffix.lower()=='.zip']
        assets=[path for path in paths if path not in presets and Path(path).suffix.lower() in EXTS[self.asset_category.get()]]
        for path in presets:self.import_from(path)
        if assets:self.asset_import(assets)


def log_unhandled_exception(exc_type, exc_value, exc_tb):
    """GUI-Runtime-Fehler nach EXE-Build ebenfalls lokal protokollieren."""
    try:
        logs = DATA_ROOT / 'logs'
        logs.mkdir(parents=True, exist_ok=True)
        with (logs / 'GUI_ERRORS.log').open('a', encoding='utf-8') as f:
            f.write('\n' + datetime.now().isoformat() + '\n')
            traceback.print_exception(exc_type, exc_value, exc_tb, file=f)
    except OSError:
        pass
    traceback.print_exception(exc_type, exc_value, exc_tb)


def runtime_self_test():
    from io import BytesIO
    from PIL import Image
    import sounddevice
    from tkinterdnd2 import TkinterDnD
    root = TkinterDnD.Tk()
    root.withdraw()
    try:
        image = BytesIO()
        Image.new('RGB', (1, 1), (12, 34, 56)).save(image, format='PNG')
        image.seek(0)
        assert Image.open(image).getpixel((0, 0)) == (12, 34, 56)
        sounddevice.get_portaudio_version()
        root.update_idletasks()
    finally:
        root.destroy()
    print('RADIO_WAVE_CYBER_STUDIO_SELF_TEST_OK', flush=True)


def main():
    if sys.argv[1:] == ['--radio-wave-studio-self-test']:
        runtime_self_test()
        return
    sys.excepthook = log_unhandled_exception
    try:
        from tkinterdnd2 import TkinterDnD
        root=TkinterDnD.Tk()
    except ImportError:
        root=tk.Tk()
    Studio(root)
    if RADIO_WAVE_DATA:
        root.after_idle(lambda: print('RADIO_WAVE_CYBER_STUDIO_READY', flush=True))
    root.mainloop()


if __name__ == '__main__':main()
