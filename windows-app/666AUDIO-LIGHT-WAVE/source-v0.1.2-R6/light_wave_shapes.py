"""Bearbeitbare, normierte Konturen und B-Spline-Rotationsflächen."""
import json
from math import isfinite
from pathlib import Path
from tempfile import NamedTemporaryFile

import numpy as np

MAX_POINTS = 192
DEFAULT_POINTS = ((.06, -.94), (.26, -.83), (.56, -.66), (.46, -.35),
                  (.22, -.08), (.38, .28), (.67, .63), (.36, .84), (.07, .94))
SHAPE_EFFECT = "3D · Eigene Rotationsform"
FACE_EFFECT = "3D · Facettenmaske"


def validate_points(points):
    if not isinstance(points, (tuple, list)) or not 2 <= len(points) <= MAX_POINTS:
        raise ValueError(f"Eine Kontur braucht 2 bis {MAX_POINTS} Punkte.")
    result = []
    for point in points:
        if (not isinstance(point, (tuple, list)) or len(point) != 2
                or any(type(value) not in (int, float) for value in point)):
            raise ValueError("Ungültiger Kontrollpunkt.")
        radius, y = point
        if not (0 <= radius <= 1 and -1 <= y <= 1 and isfinite(radius) and isfinite(y)):
            raise ValueError("Radius und Höhe liegen außerhalb des Konturbereichs.")
        result.append((float(radius), float(y)))
    if len(set(result)) < 2:
        raise ValueError("Die Kontur braucht zwei unterschiedliche Punkte.")
    return tuple(result)


def load_shape(path):
    with Path(path).open(encoding="utf-8") as stream:
        doc = json.loads(stream.read(65537))
    if not isinstance(doc, dict) or doc.get("version") != 1:
        raise ValueError("Unbekanntes Light-Wave-Formformat.")
    return validate_points(doc.get("points"))


def save_shape(path, points):
    points = validate_points(points)
    path = Path(path)
    with NamedTemporaryFile("w", dir=path.parent, encoding="utf-8", delete=False) as out:
        temporary = Path(out.name)
        try:
            json.dump({"version": 1, "points": points}, out, indent=2)
            out.close()
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)


def spline_curve(points, samples=160):
    # Geklemmter, uniformer B-Spline. de Boor erhält beide Endpunkte.
    control = np.asarray(validate_points(points), dtype=np.float64)
    degree = min(3, len(control) - 1)
    interior = np.linspace(0.0, 1.0, len(control) - degree + 1)
    knots = np.concatenate((np.zeros(degree), interior, np.ones(degree)))
    curve = []
    for t in np.linspace(0.0, 1.0, samples):
        span = min(int(np.searchsorted(knots, t, side="right") - 1), len(control) - 1)
        work = control[span - degree:span + 1].copy()
        for step in range(1, degree + 1):
            for j in range(degree, step - 1, -1):
                i = span - degree + j
                alpha = (t - knots[i]) / (knots[i + degree - step + 1] - knots[i])
                work[j] = (1 - alpha) * work[j - 1] + alpha * work[j]
        curve.append(work[degree])
    return np.asarray(curve, dtype=np.float32)


def revolution_mesh(points):
    curve = spline_curve(points)
    radius, height = curve.T
    sides = 64
    angles = np.linspace(0, 2 * np.pi, sides, endpoint=False)
    x = radius[:, None] * np.cos(angles)
    z = radius[:, None] * np.sin(angles)
    bands = np.broadcast_to(np.linspace(0, 27, len(curve))[:, None], x.shape)
    vertices = np.stack((x, np.broadcast_to(height[:, None], x.shape), z, bands), axis=-1)
    ids = np.arange((len(curve) - 1) * sides).reshape(-1, sides)
    neighbor = np.roll(ids, -1, axis=1)
    indices = np.stack((ids, ids + sides, neighbor, neighbor, ids + sides, neighbor + sides), axis=-1)
    return np.ascontiguousarray(vertices, np.float32), np.ascontiguousarray(indices, np.uint32)


def faceted_face_mesh():
    # Trianguliertes Gesichtsrelief mit separater Augen-, Nasen- und Kiefergeometrie.
    # Die rechte Gesichtshälfte wird an der Mittelachse gespiegelt.
    half = np.asarray([
        (0, .71, .05), (.28, .67, -.01), (.51, .43, -.16), (.53, .16, -.17),
        (.42, -.20, -.12), (.29, -.44, -.10), (.13, -.62, .00), (0, -.68, .06),
        (0, .32, .16), (.17, .36, .10), (.37, .29, .04),
        (.12, .16, .09), (.34, .16, .01), (.29, -.03, .17),
        (0, -.10, .35), (.103, -.12, .19), (0, -.23, .19), (.16, -.28, .125),
        (0, -.37, .16), (.17, -.40, .09), (.33, .02, .09),
    ], dtype=np.float32)
    triangles = np.asarray([
        (0, 1, 8), (1, 2, 10), (1, 10, 9), (1, 9, 8), (2, 3, 10),
        (8, 9, 11), (9, 10, 11), (10, 12, 11), (10, 3, 12), (3, 20, 12),
        (12, 20, 13), (11, 12, 13), (11, 13, 15), (8, 11, 14), (11, 15, 14),
        (3, 4, 20), (4, 13, 20), (4, 5, 13), (13, 5, 17), (13, 17, 15),
        (14, 15, 16), (15, 17, 16), (16, 17, 18), (17, 19, 18),
        (17, 5, 19), (5, 6, 19), (18, 19, 6), (18, 6, 7)
    ], dtype=np.uint32)
    vertices = np.concatenate((half, half * [-1, 1, 1]))
    bands = np.clip((vertices[:, 1] + .68) * 19.4, 0, 27)
    indices = np.concatenate((triangles, triangles[:, ::-1] + len(half)))
    return np.ascontiguousarray(np.column_stack((vertices, bands)), np.float32), indices


def open_shape_editor(parent, initial, apply):
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    window = tk.Toplevel(parent)
    window.title("3D-Formeditor")
    window.geometry("670x505")
    window.minsize(580, 390)
    points = list(initial)
    selected = None
    pending = None
    freehand = tk.BooleanVar(value=False)
    tools = ttk.Frame(window, padding=8)
    tools.pack(fill="x")
    canvas = tk.Canvas(window, background="#100e22", highlightthickness=0, takefocus=True)
    canvas.pack(fill="both", expand=True)
    ttk.Label(window, text="Klick fügt einen Punkt hinzu. Ziehen verschiebt ihn. Entf löscht den markierten Punkt.",
              padding=(8, 5)).pack(fill="x")

    def bounds():
        return 32, 14, max(1, canvas.winfo_width() - 48), max(1, canvas.winfo_height() - 28)

    def screen(point):
        r, y = point
        left, top, w, h = bounds()
        return left + r * w, top + (1 - y) * h / 2

    def model(x, y):
        left, top, w, h = bounds()
        return max(0, min(1, (x - left) / w)), max(-1, min(1, 1 - 2 * (y - top) / h))

    def draw(event=None):
        canvas.delete("all")
        left, top, w, h = bounds()
        for i in range(9):
            x, y = left + w * i / 8, top + h * i / 8
            canvas.create_line(x, top, x, top+h, fill="#242044")
            canvas.create_line(left, y, left+w, y, fill="#242044")
        canvas.create_line(left, top, left, top+h, fill="#ea54bb", width=2)
        canvas.create_text(left+8, top+6, text="Drehachse", fill="#df92c3", anchor="nw")
        if len(set(points)) > 1:
            canvas.create_line([coordinate for point in spline_curve(points, samples=120)
                                for coordinate in screen(point)], fill="#00f2fe", width=2)
        for i, point in enumerate(points):
            x, y = screen(point)
            r = 6 if i == selected else 4
            canvas.create_oval(x-r, y-r, x+r, y+r, fill="#f93b99" if i == selected else "#a5ecff", outline="")

    def publish():
        nonlocal pending
        pending = None
        if len(set(points)) > 1:
            apply(validate_points(points))

    def apply_now():
        if pending is not None:
            window.after_cancel(pending)
        publish()

    def changed():
        nonlocal pending
        draw()
        if pending is not None:
            window.after_cancel(pending)
        pending = window.after(110, publish)

    def press(event):
        nonlocal selected
        canvas.focus_set()
        if freehand.get():
            points[:] = [model(event.x, event.y)]
            selected = None
        else:
            hits = []
            for i, point in enumerate(points):
                x, y = screen(point)
                hits.append(((x-event.x)**2 + (y-event.y)**2, i))
            distance, index = min(hits) if hits else (1000, 0)
            if distance <= 10**2:
                selected = index
            elif len(points) < MAX_POINTS:
                position = model(event.x, event.y)
                # Neuer Punkt kommt in das nächstgelegene Segment des Kontrollpolygons.
                if len(points) < 2:
                    selected = len(points)
                else:
                    p = np.asarray(position)
                    control = np.asarray(points)
                    directions = control[1:] - control[:-1]
                    lengths = np.maximum(np.sum(directions**2, axis=1), 1e-10)
                    fractions = np.clip(np.sum((p-control[:-1])*directions, axis=1)/lengths, 0, 1)
                    selected = int(np.argmin(np.sum((p-control[:-1]-fractions[:, None]*directions)**2, axis=1))) + 1
                points.insert(selected, position)
        changed()

    def drag(event):
        position = model(event.x, event.y)
        if freehand.get():
            x, y = screen(points[-1])
            if len(points) < MAX_POINTS and (event.x-x)**2 + (event.y-y)**2 > 7**2:
                points.append(position)
        elif selected is not None:
            points[selected] = position
        changed()

    def delete(event=None):
        nonlocal selected
        if selected is not None and len(points) > 2:
            points.pop(selected)
            selected = None
            changed()

    def replace(new_points):
        nonlocal selected
        points[:] = new_points
        selected = None
        changed()

    def open_file():
        filename = filedialog.askopenfilename(parent=window, filetypes=[("Light-Wave-Form", "*.json")])
        if filename:
            try:
                replace(load_shape(filename))
            except (ValueError, OSError) as error:
                messagebox.showerror("Form öffnen", str(error), parent=window)

    def save_file():
        filename = filedialog.asksaveasfilename(parent=window, defaultextension=".json",
                                                filetypes=[("Light-Wave-Form", "*.json")])
        if filename:
            try:
                save_shape(filename, points)
            except (ValueError, OSError) as error:
                messagebox.showerror("Form speichern", str(error), parent=window)

    ttk.Checkbutton(tools, text="Freihand · neue Kontur", variable=freehand).pack(side="left")
    for title, command in (("Öffnen", open_file), ("Speichern", save_file),
                           ("Standardform", lambda: replace(DEFAULT_POINTS)), ("Live anwenden", apply_now)):
        ttk.Button(tools, text=title, command=command).pack(side="left", padx=4)
    canvas.bind("<Configure>", draw)
    canvas.bind("<Button-1>", press)
    canvas.bind("<B1-Motion>", drag)
    canvas.bind("<Delete>", delete)

    def close():
        if pending is not None:
            window.after_cancel(pending)
            publish()
        window.destroy()

    window.protocol("WM_DELETE_WINDOW", close)
    return window
