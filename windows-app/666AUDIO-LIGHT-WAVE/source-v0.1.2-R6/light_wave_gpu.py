"""Separates GPU-Vorschaufenster. Die Aufnahme liest ausschließlich dessen Renderfläche."""
from queue import Empty
from time import monotonic

import numpy as np

from light_wave_effects import compile_effect, set_effect_inputs
from light_wave_mesh import ShapeMesh
from light_wave_shapes import DEFAULT_POINTS, FACE_EFFECT, SHAPE_EFFECT
from light_wave_integrations import OPTICAL_EFFECT, hud_themes
from light_wave_export import HEIGHT, RESOLUTIONS, VIDEO_FPS, WIDTH, Recorder

VERTEX = """
#version 330
out vec2 uv;
void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    uv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0, 1);
}
"""
VISUAL = """
#version 330
in vec2 uv;
out vec4 color;
uniform float bands[28];
void main() {
    vec3 cyan = vec3(.02,.91,.97);
    vec3 pink = vec3(.98,.24,.66);
    vec3 violet = vec3(.37,.09,.76);
    vec2 centered = (uv - vec2(.5,.49)) * vec2(1.0,.80);
    float halo = exp(-5.7 * length(centered));
    vec3 base = vec3(.015,.012,.085) + .28 * halo * violet;
    float line = 1.0 - smoothstep(.008,.024,abs(fract(uv.y*18.0)-.5));
    base += line * vec3(.015,.018,.044);
    float x = (uv.x - .08) / .84;
    float band = floor(x * 28.0);
    int idx = int(clamp(band,0.0,27.0));
    float v = bands[idx];
    float width = abs(fract(x*28.0)-.5);
    float height = .026 + .57*v;
    float y = uv.y - .18;
    float bar = (1.0 - smoothstep(.32,.43,width))
        * smoothstep(-.002,.004,y) * (1.0 - smoothstep(height-.007,height+.003,y))
        * step(0.0,x) * (1.0-step(1.0,x));
    vec3 accent = mix(pink, cyan, clamp(x,0.0,1.0));
    base += bar * accent * (.42 + .55*v);
    base += (.02+.05*v) * exp(-35.0*abs(y-height)) * accent * bar;
    color = vec4(base,1.0);
}
"""
PRESENT = """
#version 330
in vec2 uv;
out vec4 color;
uniform sampler2D image;
void main() { color = texture(image, uv); }
"""


def preview_process(connection, spectrum, audio_queue, size=(WIDTH, HEIGHT)):
    import av
    import moderngl
    import pygame

    recorder = None
    token = None
    hud_enabled = False
    hud_texture = None
    hud_style = {}
    hud_position = [8, 8]
    hud_drag = None
    palette = optical = None
    hud_refresh = 0.0

    def finish_recording():
        nonlocal recorder, token
        if recorder is None:
            return
        recording = recorder
        try:
            drain_audio()
            recording.finish()
            connection.send(("done", str(recording.destination)))
        except (RuntimeError, ValueError, OSError, av.FFmpegError) as error:
            recording.abort()
            connection.send(("record_error", str(error)))
        finally:
            recorder, token = None, None

    def drain_audio():
        for _ in range(128):
            try:
                session, timestamp, rate, block = audio_queue.get_nowait()
            except Empty:
                return
            if recorder is not None and session == token:
                recorder.pcm(block, rate, timestamp)

    try:
        pygame.display.init()
        pygame.display.gl_set_attribute(pygame.GL_CONTEXT_MAJOR_VERSION, 3)
        pygame.display.gl_set_attribute(pygame.GL_CONTEXT_MINOR_VERSION, 3)
        pygame.display.gl_set_attribute(pygame.GL_CONTEXT_PROFILE_MASK, pygame.GL_CONTEXT_PROFILE_CORE)
        width, height = size
        scale = min(1, WIDTH / width, HEIGHT / height)
        pygame.display.set_mode((round(width * scale), round(height * scale)),
                                pygame.OPENGL | pygame.DOUBLEBUF | pygame.RESIZABLE)
        pygame.display.set_caption("666AUDIO LIGHT WAVE · GPU-Vorschau")
        ctx = moderngl.create_context(require=330)
        active_effect = "Spektrum"
        intensity = 1.0
        effects = {active_effect: compile_effect(ctx, VERTEX, VISUAL, active_effect, size)}
        visual, quad = effects[active_effect]
        effect_started = monotonic()
        shape_points = DEFAULT_POINTS
        shape_mesh = None
        face_mesh = None
        presenter = ctx.program(vertex_shader=VERTEX, fragment_shader=PRESENT)
        def framebuffer(dimensions):
            image = ctx.texture(dimensions, 3)
            depth = None
            try:
                image.filter = moderngl.LINEAR, moderngl.LINEAR
                depth = ctx.depth_renderbuffer(dimensions)
                return image, depth, ctx.framebuffer(color_attachments=[image], depth_attachment=depth)
            except moderngl.Error:
                if depth is not None:
                    depth.release()
                image.release()
                raise

        texture, depth, target = framebuffer(size)
        pygame.font.init()
        hud_font = pygame.font.Font(None, 23)
        ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA
        screen_quad = ctx.vertex_array(presenter, [])
        connection.send(("renderer", ctx.info.get("GL_RENDERER", "OpenGL 3.3")))
        connection.send(("size", size))
        clock = pygame.time.Clock()
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT or event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    running = False
                elif hud_enabled and event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    x, y = event.pos
                    w, h = pygame.display.get_window_size()
                    px, py = min(hud_position[0], w - 344), min(hud_position[1], h - 33)
                    if w >= 360 and h >= 100 and px <= x <= px + 344 and py <= y <= py + 33:
                        hud_drag = (x - px, y - py)
                elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
                    hud_drag = None
                elif hud_drag is not None and event.type == pygame.MOUSEMOTION:
                    w, h = pygame.display.get_window_size()
                    hud_position[:] = (max(0, min(w - 344, event.pos[0] - hud_drag[0])),
                                       max(0, min(h - 33, event.pos[1] - hud_drag[1])))
            while running and connection.poll():
                message = connection.recv()
                if message[0] == "close":
                    running = False
                elif message[0] == "hud":
                    hud_enabled = bool(message[1])
                    hud_refresh = 0.0
                elif message[0] == "hud_theme":
                    hud_style = hud_themes().get(message[1], {})
                    hud_refresh = 0.0
                elif message[0] == "shape":
                    try:
                        if shape_mesh is not None:
                            shape_mesh.update(message[1])
                        shape_points = message[1]
                    except (ValueError, moderngl.Error) as error:
                        connection.send(("input_error", f"Form nicht übernommen: {error}"))
                elif message[0] in ("palette", "optical"):
                    data = message[1]
                    image = None
                    if data is not None:
                        rgb = np.ascontiguousarray(data, dtype=np.float32)
                        image = ctx.texture((len(rgb), 1), 3, rgb.tobytes(), dtype="f4")
                        image.filter = moderngl.LINEAR, moderngl.LINEAR
                        image.repeat_x = message[0] == "palette"
                    if message[0] == "palette":
                        if palette is not None:
                            palette.release()
                        palette = image
                    else:
                        if optical is not None:
                            optical.release()
                        optical = image
                elif message[0] == "size" and recorder is None:
                    requested_size = message[1]
                    if requested_size in RESOLUTIONS.values() and requested_size != size:
                        try:
                            next_texture, next_depth, next_target = framebuffer(requested_size)
                        except (ValueError, moderngl.Error) as error:
                            connection.send(("size_error", (size, str(error))))
                            continue
                        target.release()
                        texture.release()
                        depth.release()
                        texture, depth, target = next_texture, next_depth, next_target
                        size = width, height = requested_size
                        for program, _ in effects.values():
                            if "iResolution" in program:
                                program["iResolution"].value = (*size, 1.0)
                        effect_started = monotonic()
                        hud_refresh = 0.0
                    connection.send(("size", size))
                elif message[0] == "effect":
                    requested, level = message[1:]
                    intensity = max(0.0, min(1.5, level))
                    if requested != active_effect:
                        try:
                            if requested == SHAPE_EFFECT:
                                if shape_mesh is None:
                                    model = ShapeMesh(ctx)
                                    model.update(shape_points)
                                    shape_mesh = model
                            elif requested == FACE_EFFECT:
                                if face_mesh is None:
                                    model = ShapeMesh(ctx)
                                    model.update()
                                    face_mesh = model
                            elif requested not in effects:
                                effects[requested] = compile_effect(ctx, VERTEX, VISUAL, requested, size)
                        except (KeyError, OSError, ValueError, moderngl.Error) as error:
                            print(f"Studio-Effekt {requested}: {error}", flush=True)
                            connection.send(("effect_error", (requested, active_effect)))
                            continue
                        active_effect = requested
                        if requested not in (SHAPE_EFFECT, FACE_EFFECT):
                            visual, quad = effects[active_effect]
                        effect_started = monotonic()
                    connection.send(("effect_active", active_effect))
                elif message[0] == "finish":
                    finish_recording()
                elif message[0] == "record" and recorder is None:
                    try:
                        token = message[1]
                        quality = message[3] if len(message) > 3 else "Hoch"
                        recorder = Recorder(av, message[2], monotonic(), size=size, quality=quality)
                        hud_refresh = 0.0
                        recorder.started = monotonic()
                        connection.send(("recording", (recorder.codec, recorder.description)))
                    except (RuntimeError, ValueError, OSError, av.FFmpegError) as error:
                        recorder, token = None, None
                        connection.send(("record_error", str(error)))
            if not running:
                break

            target.use()
            bands = np.asarray(spectrum[:], dtype="f4")
            elapsed = monotonic() - effect_started
            if active_effect in (SHAPE_EFFECT, FACE_EFFECT):
                target.clear(.015, .009, .04, 1)
                ctx.enable(moderngl.DEPTH_TEST)
                face = active_effect == FACE_EFFECT
                mesh = face_mesh if face else shape_mesh
                mesh.draw(bands, elapsed, width / height, intensity, face=face)
                ctx.disable(moderngl.DEPTH_TEST)
            else:
                if "palette_ready" in visual:
                    visual["palette_ready"].value = palette is not None
                    if palette is not None:
                        palette.use(0)
                if active_effect == OPTICAL_EFFECT:
                    visual["optical_ready"].value = optical is not None
                    if optical is not None:
                        optical.use(0)
                set_effect_inputs(visual, bands, elapsed, intensity)
                quad.render(moderngl.TRIANGLES, vertices=3)
            if recorder is not None:
                try:
                    index = int((monotonic() - recorder.started) * VIDEO_FPS)
                    if index >= recorder.frames:
                        pixels = np.frombuffer(target.read(components=3, alignment=1), np.uint8)
                        recorder.video_frame(np.ascontiguousarray(pixels.reshape(height, width, 3)[::-1]), index)
                    drain_audio()
                except (RuntimeError, ValueError, OSError, av.FFmpegError) as error:
                    recorder.abort()
                    recorder, token = None, None
                    connection.send(("record_error", str(error)))
            else:
                drain_audio()
            ctx.screen.use()
            ctx.clear(0, 0, 0)
            w, h = pygame.display.get_window_size()
            if w > 0 and h > 0:
                scale = min(w / width, h / height)
                view_w, view_h = round(width * scale), round(height * scale)
                ctx.viewport = ((w-view_w)//2, (h-view_h)//2, view_w, view_h)
                texture.use(0)
                screen_quad.render(moderngl.TRIANGLES, vertices=3)
                if hud_enabled and w >= 360 and h >= 100:
                    if monotonic() >= hud_refresh:
                        label = f"{width} x {height}   |   {clock.get_fps():.1f} FPS"
                        if recorder is not None:
                            label += "   |   REC"
                        panel = pygame.Surface((344, 33), pygame.SRCALPHA)
                        background = pygame.Color(hud_style.get("backgroundColor") or "#0b0720")
                        foreground = pygame.Color(hud_style.get("textColor") or "#bdfcff")
                        background.a = round(255 * hud_style.get("backgroundOpacity", .855))
                        radius = min(int(hud_style.get("cornerRadius", 0)), 16)
                        pygame.draw.rect(panel, background, panel.get_rect(), border_radius=radius)
                        if hud_style.get("borderThickness", 0):
                            pygame.draw.rect(panel, pygame.Color(hud_style.get("accentColor") or "#00f2fe"),
                                             panel.get_rect(), width=1, border_radius=radius)
                        panel.blit(hud_font.render(label, True, foreground), (10, 8))
                        if hud_texture is None:
                            hud_texture = ctx.texture(panel.get_size(), 4)
                        hud_texture.write(pygame.image.tobytes(panel, "RGBA", True))
                        hud_refresh = monotonic() + .4
                    px = min(hud_position[0], w - 344)
                    py = min(hud_position[1], h - 33)
                    ctx.viewport = (px, h - py - 33, 344, 33)
                    hud_texture.use(0)
                    ctx.enable(moderngl.BLEND)
                    screen_quad.render(moderngl.TRIANGLES, vertices=3)
                    ctx.disable(moderngl.BLEND)
                pygame.display.flip()
            clock.tick(VIDEO_FPS)
        finish_recording()
    except (EOFError, BrokenPipeError):
        if recorder is not None:
            recorder.abort()
    except Exception as error:
        if recorder is not None:
            recorder.abort()
        connection.send(("error", f"Vorschau nicht verfügbar: {error}"))
    finally:
        pygame.quit()
        connection.close()
