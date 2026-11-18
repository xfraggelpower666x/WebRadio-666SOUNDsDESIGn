# shader_manager.py

"""
IMPROVEMENT(S) / NOTES:

2026-06-01: render_texture, audio_texture, video_texture:
as much as 30 something textures could be used (opengl) so it would be a good thing to
move the texture_0 (material_1) to some arbitrary number like 20 to not accidentally
make it so that shader textures would get mixed up; now there already exists the check
with regard to binding 0 and also 3 for (render_texture and audio_texture respectively)
but both could be "outside" the common shadertoy paradigm since they both are used
internally and thus has no relation to timeline config and the materials therein.
as for the video_texture: currently not used for anything else than testing various
random shaders found on the internet.

import traceback

try:
    # your main loop
    run_timeline()
except Exception as e:
    # This will print the full, multi-line error showing the exact file, 
    # the exact line number, and the true root cause.
    traceback.print_exc()
"""

import os
import sys
import json
import uuid
import math
import numpy as np
import pygame
import datetime
import moderngl
import cv2
import soundfile as sf

from pathlib import Path
import random

def load_shadertoy(ctx, filepath):
    """
    Loads a Shadertoy fragment shader from a file and wraps it in a 
    ModernGL program alongside a basic full-screen quad vertex shader.
    """
    if not os.path.exists(filepath):
        print(f"Error: Shader file '{filepath}' not found.")
        raise FileNotFoundError(filepath)
        
    print(f"   load_shadertoy(): {filepath}")
    with open(filepath, "r", encoding='utf-8') as f:
        shadertoy_code = f.read()

    # A simple vertex shader that just passes screen-space coordinates
    vertex_shader = """
        #version 330
        in vec2 in_position;
        void main() {
            gl_Position = vec4(in_position, 0.0, 1.0);
        }
    """

    # We wrap the Shadertoy code, providing the uniforms it expects (iTime, iResolution)
    # and a main() function that calls Shadertoy's mainImage().
    fragment_shader = """
        #version 330
        out vec4 FragColor;
        
        uniform vec3 iResolution;
        uniform float iStartTime; // effect start time
        uniform float iEndTime;   // effect end time
        uniform float iTime;
        uniform vec4 iDate;
        uniform int iFrame;

        uniform float iMusicSync0;
        uniform float iMusicSync1;
        uniform float iMusicSync2;

        uniform sampler2D iChannel0;
        uniform sampler2D iChannel1;
        uniform sampler2D iChannel2;
        uniform sampler2D iChannel3;

        uniform sampler2D iChannel20;
        uniform sampler2D iChannel21;

        uniform vec3 iChannelResolution[4];

        // Amplitudes for the 3 frequencies (Bass, Snare, Hihat)
        uniform vec3 u_amp_top;
        uniform vec3 u_amp_bottom;

        // Zoom/rotation values
        uniform float u_angle_deg;   // Rotation angle in degrees directly from Python
        uniform vec2 u_pivot;        // (0.5, 0.5) is center, (0.0, 0.0) is top-left
        uniform vec2 u_offset;       // Captures your offset_x and offset_y shake
        uniform vec2 u_pixel_offset; // Exact Pygame offset_x, offset_y (e.g., 50.0, 50.0)
        uniform vec2 u_target_size;  // Exact width/height of the surface being rotated

        // --- INJECTED SHADERTOY CODE START ---
        // SHADERTOY_CODE_HERE
        // --- INJECTED SHADERTOY CODE END ---

        void main() {
            // gl_FragCoord provides the pixel coordinates exactly as Shadertoy expects
            mainImage(FragColor, gl_FragCoord.xy);
        }
    """.replace("// SHADERTOY_CODE_HERE", shadertoy_code)

    prog = ctx.program(vertex_shader=vertex_shader, fragment_shader=fragment_shader)

    # 4 corners of a full screen quad (X, Y) using a Triangle Strip
    vertices = np.array([
        -1.0,  1.0,  # Top-left
        -1.0, -1.0,  # Bottom-left
         1.0,  1.0,  # Top-right
         1.0, -1.0,  # Bottom-right
    ], dtype='f4')

    vbo = ctx.buffer(vertices)
    # No index buffer needed for a simple TRIANGLE_STRIP quad
    vao = ctx.vertex_array(prog, [(vbo, '2f', 'in_position')])
    
    return prog, vao

class Texture:
    """
    A unified wrapper interface for all texture types (Image, Video, Audio).
    Delegates actions to the specific texture implementation.
    """
    def __init__(self, ctx: moderngl.Context, filepath: str):
        print("Texture.__init__():")
        self.impl = None
        self.last_update_time = -1.0  # Guard against multiple updates per frame

        # Determine and instantiate the correct texture wrapper
        if ".jpg" in filepath or ".png" in filepath:
            self.impl = ImageTexture(ctx, filepath)
        elif ".mp4" in filepath:
            print("   MP4")
            self.impl = VideoTexture(ctx, filepath)
        elif Path(filepath).suffix.lower() == ".wav":
            print("   WAV AUDIO")
            self.impl = AudioTexture(ctx, filepath)

        # Retrieve the underlying ModernGL texture
        if self.impl:
            self.texture = self.impl.get()
        else:
            self.texture = None

    def get(self):
        print("Texture.get():")
        # Return the raw ModernGL texture directly
        return self.texture

    def release(self):
        # Delegate release to the implementation for cleanups
        if self.impl:
            self.impl.release()
        elif self.texture:
            try:
                print("      releasing Texture")
                self.texture.release()
            except Exception as e:
                print(f"Error releasing Texture: {e}")

    def use(self, location):
        if self.impl:
            self.impl.use(location)
        elif self.texture:
            self.texture.use(location)

    def update(self, current_time=0.0):
        """
        Polymorphically routes update parameters based on the implementation type.
        """
        if current_time == self.last_update_time:
            return  # Already updated during this frame step!
        self.last_update_time = current_time

        if self.impl and hasattr(self.impl, 'update'):
            if isinstance(self.impl, AudioTexture):
                self.impl.update(current_time)
            elif isinstance(self.impl, VideoTexture):
                self.impl.update()
            else:
                self.impl.update()

class ImageTexture:
    def __init__(self, ctx: moderngl.Context, filepath: str):
        self.ctx = ctx
        self.filepath = filepath
        # Properly assign the returned ModernGL texture from the loader
        self.texture = self._load_texture()

    def _load_texture(self):
        print("ImageTexture._load_texture():")
        if ".jpg" in self.filepath or ".png" in self.filepath:
            print("   JPG/PNG")
            if "RGBAnoise_small_64x64" in self.filepath:
                print("   create_rgba_noise_texture(64x64) small")
                return self._create_rgba_noise_texture(size=64)
            elif "RGBAnoise_medium_256x256" in self.filepath:
                print("   create_rgba_noise_texture(256x256) medium")
                return self._create_rgba_noise_texture(size=256)
            elif "RGBAnoise_large_512x512" in self.filepath:
                print("   create_rgba_noise_texture(512x512) large")
                return self._create_rgba_noise_texture(size=512)
            elif "RGBAnoise_extra_large_1024x1024" in self.filepath:
                print("   create_rgba_noise_texture(1024x1024) extra_large")
                return self._create_rgba_noise_texture(size=1024)
            else:
                print("   load_static_image_texture()")
                return self._load_static_image_texture()
        return None

    def _create_rgba_noise_texture(self, size=256):
        """
        Generates a perfect Shadertoy-style RGBA noise texture on the fly.
        No image files required!
        """
        # Generate an array of shape (width, height, 4 channels)
        # filled with random integers from 0 to 255 (Uniform White Noise)
        noise_data = np.random.randint(0, 256, (size, size, 4), dtype=np.uint8)
    
        # Push it directly into a ModernGL texture
        texture = self.ctx.texture((size, size), 4, noise_data.tobytes())
        texture.repeat_x = True
        texture.repeat_y = True
    
        # Shadertoy usually applies linear filtering (slight blurring when zoomed in) 
        # Change to (moderngl.NEAREST, moderngl.NEAREST) if you want sharp pixelated noise
        texture.filter = (moderngl.LINEAR, moderngl.LINEAR)
    
        return texture

    def _load_static_image_texture(self):
        """
        Loads a static image into a ModernGL texture using Pygame.
        """
        img = pygame.image.load(self.filepath).convert_alpha()
        # OpenGL expects the Y-axis to start at the bottom, so we flip it
        img = pygame.transform.flip(img, False, True)

        # Fix Pygame deprecation warning
        try:
            img_bytes = pygame.image.tobytes(img, "RGBA")
        except AttributeError:
            img_bytes = pygame.image.tostring(img, "RGBA")

        texture = self.ctx.texture(img.get_size(), 4, img_bytes)
        texture.repeat_x = True
        texture.repeat_y = True
        return texture

    def get(self):
        print("ImageTexture.get():")
        return self.texture

    def release(self):
        try:
            if self.texture:
                print(f"      releasing ImageTexture")
                self.texture.release()
        except Exception as e:
            print(f"Error releasing ImageTexture: {e}")

    def use(self, location):
        if self.texture:
            self.texture.use(location)

class VideoTexture:
    """
    Loads and streams a video frame-by-frame into a ModernGL texture.
    """
    def __init__(self, ctx: moderngl.Context, filepath: str):
        self.cap = cv2.VideoCapture(filepath)
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # 3 components (RGB)
        self.texture = ctx.texture((self.width, self.height), 3)
        self.texture.repeat_x = True
        self.texture.repeat_y = True

    def get(self):
        print("VideoTexture.get():")
        return self.texture

    def release(self):
        try:
            if self.texture:
                print("      releasing VideoTexture")
                self.texture.release()
            if self.cap.isOpened():
                self.cap.release()
        except Exception as e:
            print(f"Error releasing VideoTexture: {e}")

    def update(self):
        """
        Called every frame to grab the next video frame and upload to GPU.
        """
        ret, frame = self.cap.read()
        if not ret:
            # If video ends, loop back to the beginning
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
            
        if ret:
            # OpenCV loads in BGR format, OpenGL expects RGB
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Flip Y axis for OpenGL
            frame = cv2.flip(frame, 0)

            # Send pixel data to the GPU texture
            self.texture.write(frame.tobytes())

    def use(self, location):
        if self.texture:
            self.texture.use(location)

class AudioTexture:
    """
    Loads a WAV file and streams it chunk-by-chunk into a ModernGL texture.
    """
    def __init__(self, ctx: moderngl.Context, filepath: str):
        self.ctx = ctx
        
        audio_data, self.sample_rate = sf.read(filepath, dtype="float32", always_2d=True)
        self.audio_data = audio_data.mean(axis=1)

        # Create a 512x2 Texture. 
        # ModernGL format: 1 component (Red), 32-bit float ('f4')
        self.texture = ctx.texture((512, 2), 1, dtype='f4')
        
        # Shadertoy audio textures require linear filtering to blend correctly
        self.texture.filter = (moderngl.LINEAR, moderngl.LINEAR)
        
        # Clamping to edge is standard for audio textures
        self.texture.repeat_x = False
        self.texture.repeat_y = False

        # --- NEW: Web Audio API Replication Variables ---
        # 0.8 is the exact default smoothingTimeConstant in WebGL/Shadertoy
        self.smoothing = 0.8 
        self.smoothed_fft = np.zeros(512, dtype=np.float32)

        # Pre-calculate a Hanning window for the chunk
        self.window = np.hanning(1024)

    def get(self):
        print("AudioTexture.get():")
        return self.texture

    def release(self):
        try:
            if self.texture:
                print(f"      releasing AudioTexture")
                self.texture.release()
        except Exception as e:
            print(f"Error releasing AudioTexture: {e}")

    def update(self, current_time_sec):
        """
        Generates the FFT and Waveform for the current time and uploads to GPU.
        """

        # Convert seconds to exact sample index
        current_sample = int(current_time_sec * self.sample_rate)
        
        # Grab the next 1024 samples (our chunk)
        chunk = self.audio_data[current_sample : current_sample + 1024]
        
        # Pad with zeros if we are at the very end of the file
        if len(chunk) < 1024:
            chunk = np.pad(chunk, (0, 1024 - len(chunk)))
            

        # ----------------------------------------------------
        # ROW 1: WAVEFORM (Top row)
        # The waveform is raw and un-smoothed, just like Shadertoy
        # ----------------------------------------------------
        waveform = chunk[-512:] 
        waveform_row = (waveform + 1.0) / 2.0 
        
        # ----------------------------------------------------
        # ROW 0: FFT / FREQUENCIES (Bottom row)
        # Mimicking the Web Audio API AnalyserNode
        # ----------------------------------------------------
        # 1. Apply the Hanning window to prevent frequency noise/bleeding
        windowed_chunk = chunk * self.window
        
        # 2. Get Linear FFT
        #fft_data = np.abs(np.fft.rfft(windowed_chunk))
        fft_data = np.abs(np.fft.rfft(windowed_chunk)) / 512.0
        
        # 3. Convert to Decibels (Logarithmic)
        # Adding 1e-10 prevents math errors if silence triggers log10(0)
        fft_db = 20 * np.log10(fft_data + 1e-10)
        
        # 4. Map dB to 0.0 - 1.0 range based on Web Audio defaults
        min_db = -90.0 #-100.0
        max_db = -20.0 #-30.0
        fft_norm = (fft_db - min_db) / (max_db - min_db)
        
        # Take only 512 bins and clip between 0.0 and 1.0
        fft_norm = np.clip(fft_norm[:512], 0.0, 1.0)
        
        # 5. Apply Exponential Time Smoothing
        self.smoothed_fft = self.smoothing * self.smoothed_fft + (1.0 - self.smoothing) * fft_norm

        # ----------------------------------------------------
        # UPLOAD TO GPU
        # ----------------------------------------------------
        audio_texture_data = np.vstack((self.smoothed_fft, waveform_row)).astype(np.float32)
        self.texture.write(audio_texture_data.tobytes())

    def use(self, location):
        if self.texture:
            self.texture.use(location)

class PingPongBuffer:
    """
    Manages double-buffering (read/write FBOs) required for Shadertoy Buffer A/B/C/D.
    """
    def __init__(self, ctx: moderngl.Context, width: int, height: int):
        self.ctx = ctx
        
        # 32-bit floating point textures are standard for Shader buffers to prevent data loss
        self.tex_read = ctx.texture((width, height), 4, dtype='f4')
        self.tex_write = ctx.texture((width, height), 4, dtype='f4')
        
        # Linear filtering is standard for Shadertoy
        self.tex_read.filter = (moderngl.LINEAR, moderngl.LINEAR)
        self.tex_write.filter = (moderngl.LINEAR, moderngl.LINEAR)
        
        # Create Framebuffers attached to the textures
        self.fbo_read = ctx.framebuffer(color_attachments=[self.tex_read])
        self.fbo_write = ctx.framebuffer(color_attachments=[self.tex_write])

        # Clear them to black initially
        self.fbo_read.clear(0.0, 0.0, 0.0, 0.0)
        self.fbo_write.clear(0.0, 0.0, 0.0, 0.0)

    def swap(self):
        # Swap read/write identities
        self.tex_read, self.tex_write = self.tex_write, self.tex_read
        self.fbo_read, self.fbo_write = self.fbo_write, self.fbo_read

    def release(self):
        try:
            self.tex_read.release()
            self.tex_write.release()
            self.fbo_read.release()
            self.fbo_write.release()
        except Exception as e:
            print(f"Error releasing PingPongBuffer: {e}")

class ShaderCache:
    def __init__(self, ctx: moderngl.Context):
        self.ctx = ctx
        self.shader_programs: dict[str, tuple[moderngl.Program, moderngl.VertexArray]] = {}
        self.texture_cache: dict[str, Texture] = {}

    def get_or_load_shader(self, filepath: str) -> tuple[moderngl.Program, moderngl.VertexArray]:
        if filepath in self.shader_programs:
            print(f"  [Cache Hit] Shader: {filepath}")
            return self.shader_programs[filepath]
        else:
            print(f"  [Cache Miss] Loading Shader: {filepath}")
            try:
                program, vao = load_shadertoy(self.ctx, filepath)
                self.shader_programs[filepath] = (program, vao)
                return program, vao
            except Exception as e:
                print(f"Error loading shader {filepath}: {e}")
                raise # Re-raise to be handled by calling code

    def get_or_load_texture(self, filepath: str | None) -> Texture | None:
        if filepath is None:
            return None
        if filepath in self.texture_cache:
            print(f"  [Cache Hit] Texture: {filepath}")
            return self.texture_cache[filepath]
        print(f"  [Cache Miss] Loading Texture: {filepath}")
        try:
            texture = Texture(self.ctx, filepath)
            self.texture_cache[filepath] = texture
            return texture
        except Exception as e:
            print(f"Error loading texture {filepath}: {e}")
            raise # Re-raise to be handled by calling code

    def release_all(self):
        print("Releasing all cached shader programs and textures...")
        for program, vao in self.shader_programs.values():
            try:
                program.release()
                # VAOs might not need explicit release depending on framework/driver
                vao.release()
            except Exception as e:
                print(f"Error releasing shader program resource: {e}")
        self.shader_programs.clear()

        for texture in self.texture_cache.values():
            try:
                texture.release()
            except Exception as e:
                print(f"Error releasing texture resource: {e}")
        self.texture_cache.clear()
        print("Cache release complete.")

class ShaderTimelineManager:
    def __init__(self, debug: bool, shader_path_glsl: str, ctx: moderngl.Context,
                 width: int, height: int, audio_path: str, timeline_filepath: str,
                 neural_indices_filenames_all: list[str], randomize_effects: bool,
                 shader_cache: ShaderCache, video_playback_speeds: list[float],
                 video_durations: list[float] = None):
        self.debug = debug
        self.ctx = ctx
        self.width = width
        self.height = height
        self.audio_path = audio_path
        self.shader_cache = shader_cache
        self.timeline_data: list[dict] = []
        self.main_seq_event_data = []
        self._last_logged_event_id = None

        # This will hold pre-compiled and fully-resolved dictionaries ready for rendering
        self.resolved_effects: list[dict] = []

        # Load file config and perform upfront resource caching
        if randomize_effects:
            # Reconstruct the config as a dictionary
            rnd_effects = TimelineEffectReconstructor(
                timeline_filepath,
                "CONFIG/main_seq_events.json",
                shader_path_glsl,
                neural_indices_filenames_all
            )
            self.reconstructed_dict = rnd_effects.reconstruct_timeline()
            self.timeline_data = self.reconstructed_dict.get("timeline", [])
            if self.debug:
                self._save_timeline_debug()
        else:
            self._load_timeline_config(timeline_filepath)

        self._load_main_seq_config("CONFIG/main_seq_events.json")
        self._pre_load_and_compile_resources()

        # --- Apply the cascading adjustments! ---
        if video_durations:
            self._sync_timeline_to_videos(video_playback_speeds, video_durations)
            if self.debug:
                self._save_timeline_debug()

    def _save_timeline_debug(self):
        """
        Saves the current in-memory timeline data back into a structured JSON file
        for debugging and inspection.
        """
        try:
            uuid_str = str(uuid.uuid4())
            output_filepath = f"DEBUG/debug_resolved_timeline_{uuid_str}.json"
            Path(output_filepath).parent.mkdir(exist_ok=True)
            pretty_json_string = json.dumps(self.reconstructed_dict, indent=2)

            # Write the formatted string to the target file            
            with open(output_filepath, 'w') as f:
                f.write(pretty_json_string)
                
            print(f"Debug: Successfully wrote timeline data to {output_filepath}")
        except Exception as e:
            print(f"Debug Error: Could not write timeline data to {output_filepath}. Reason: {e}")

    def _load_timeline_config(self, filepath: str):
        try:
            with open(filepath, 'r') as f:
                content = f.read()
                data = json.loads(content) # Use loads() instead of load()
            self.timeline_data = data.get('timeline', [])
            print(f"Loaded {len(self.timeline_data)} effects from timeline config.")
        except FileNotFoundError:
            print(f"Error: Timeline config file not found at {filepath}")
            self.timeline_data = []
        except json.JSONDecodeError as e:
            print(f"\n❌ JSON SYNTAX ERROR in {filepath}")
            print(f"Reason: {e.msg}")
            print(f"Location: Line {e.lineno}, Column {e.colno}\n")
            
            # Extract and print the exact line where the error happened!
            lines = content.splitlines()
            if 0 < e.lineno <= len(lines):
                error_line = lines[e.lineno - 1]
                # Print the line
                print(f"{e.lineno:04d} | {error_line}")
                # Print an arrow pointing right at the error column
                pointer_padding = " " * (7 + e.colno - 1) # 7 spaces for "0000 | "
                print(f"{pointer_padding}^--- HERE")
            print()
            self.timeline_data = []
        except Exception as e:
            print(f"An error occurred loading timeline config {filepath}: {e}")
            self.timeline_data = []

    def _load_main_seq_config(self, filepath: str):
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            self.main_seq_event_data = data.get('main_seq_events', [])
            print(f"Loaded {len(self.main_seq_event_data)} events from main_seq_event config.")
        except FileNotFoundError:
            print(f"Error: Timeline main_seq_event not found at {filepath}")
            self.main_seq_event_data = []
        except json.JSONDecodeError:
            print(f"Error: Could not decode JSON from {filepath}")
            self.main_seq_event_data = []
        except Exception as e:
            print(f"An error occurred loading main_seq_event config {filepath}: {e}")
            self.main_seq_event_data = []

    def _log_shader_info(self, shader_base_filepath):
        print(f"[DEBUG] Shader Running: filepath: {shader_base_filepath}")
        log_file = "LOG_SHADERS.txt"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{shader_base_filepath}\n")

    def is_main_sequence_event(self, current_time: float):
        for effect_data in self.timeline_data:
            start_time = effect_data['effect_start_time']
            duration = effect_data['effect_duration']

            if start_time <= current_time <= (start_time + duration):
                shader_base_filepath = os.path.basename(effect_data['shader_effect_file'])

                # If we find an active main sequence event, we know it's True
                if shader_base_filepath in self.main_seq_event_data:
                    return True
                else:
                    # --- LOG ONCE ---
                    # Check if this is a new event we haven't logged yet
                    current_event_id = id(effect_data)
                    if self._last_logged_event_id != current_event_id:
                        self._log_shader_info(shader_base_filepath)
                        # Remember this event so we don't log it again next frame
                        self._last_logged_event_id = current_event_id
            
                # Note: We DO NOT return False here anymore. We just keep looping 
                # in case there is another overlapping effect that IS a main seq event.
            
        # If the loop finishes and we never found an active main sequence event:
        return False

    def is_intro_fx(self, current_time: float):
        for effect_data in self.timeline_data:
            start_time = effect_data['effect_start_time']
            duration = effect_data['effect_duration']

            if start_time <= current_time <= (start_time + duration):
                shader_base_filepath = os.path.basename(effect_data['shader_effect_file'])
                if "intro_" in shader_base_filepath:
                    return True
        return False

    def is_special_fx_pause(self, current_time: float):
        for effect_data in self.timeline_data:
            start_time = effect_data['effect_start_time']
            duration = effect_data['effect_duration']

            if start_time <= current_time <= (start_time + duration):
                shader_base_filepath = os.path.basename(effect_data['shader_effect_file'])
                if "singular_effect_ease_in_out" in shader_base_filepath:
                    #print(f"=== IS_SPECIAL_FX_PAUSE: {shader_base_filepath} TRUE")
                    return True
        return False

    def _sync_timeline_to_videos(self, video_playback_speeds, video_durations):
        """
        Takes a list of new requested durations for each main segment.
        Distributes the time difference equally across the 'main drivers' within that segment.
        Cascades the timing shifts so all subsequent events start at the correct adjusted time.
        """

        #___________
        # 1. Extract main segments
        # previously in the primary file before the main loop
        #   extract_main_segments(timeline_data, main_seq_event_data)

        main_segments = []
        current_segment_events = []
        segment_start_time = 0.0
        segment_duration = 0.0

        for event in self.resolved_effects:
            # Extract just the filename (e.g., "video_glitch_1.txt") from the path
            filename = os.path.basename(event["data"]["shader_effect_file"])
            #print(f"filename: {filename}")
        
            # Check if the event belongs to our main sequence
            is_main_seq = filename in self.main_seq_event_data
            #print(f"is_main_seq: {is_main_seq}")
        
            if is_main_seq:
                # If this is the first event in a new contiguous segment
                if not current_segment_events:
                    segment_start_time = event["data"]["effect_start_time"]
                    #print(f"segment_start_time: {segment_start_time}")
                
                current_segment_events.append(event)
                segment_duration += event["data"]["effect_duration"]
            else:
                # We hit an intro or SINGULAR_EFFECT. 
                # If we were tracking a segment, finalize it before resetting.
                if current_segment_events:
                    main_segments.append({
                        "start_time": segment_start_time,
                        "duration": segment_duration,
                        "events": current_segment_events
                    })
                    # Reset for the next segment
                    current_segment_events = []
                    segment_start_time = 0.0
                    segment_duration = 0.0

        # Catch any trailing segment at the very end of the timeline
        if current_segment_events:
            main_segments.append({
                "start_time": segment_start_time,
                "duration": segment_duration,
                "events": current_segment_events
            })

        #___________
        # 2. previously in the primary file before the main loop
        # We no longer need duration_deltas!
        # By directly summing the actual video times, we avoid delta math completely.

        new_segment_durations = []
        video_index = 0
        
        for i, segment in enumerate(main_segments, 1):
            segment_total_duration = segment['duration']
            #num_videos_per_segment = round(segment_total_duration / 6.0) # default_video_duration
            num_videos_per_segment = math.ceil(segment_total_duration / 6.0) # default_video_duration

            print(f"--- Main Segment {i} ---")
            print(f"  num_videos_per_segment: {num_videos_per_segment}")
            
            # The new segment duration should EXACTLY match the sum of the videos it will play
            actual_segment_duration = 0.0
            for n in range(num_videos_per_segment):
                if video_index < len(video_durations):
                    duration = video_durations[video_index]
                    speed = video_playback_speeds[video_index] if video_index < len(video_playback_speeds) else None
                    video_index += 1
                else:
                    duration = 6.0
                    speed = None
                actual_segment_duration += duration
                print(f"  {n}: {duration:.3f}s" + (f" @ {speed:.3f}" if speed is not None else ""))

            new_segment_duration = actual_segment_duration
            new_segment_durations.append(new_segment_duration)

            print(f"  start_time: {segment['start_time']}")
            print(f"  end_time  : {segment['start_time'] + segment_total_duration}")
            print(f"  total_duration: {segment_total_duration}")
            print(f"  event_count: {len(segment['events'])}")

            print(f"  new_end_time  : {segment['start_time'] + new_segment_duration}")
            print(f"  new_segment_duration: {new_segment_duration}")

            driver_count = sum(
                1 for e in segment['events']
                if "render_texture_plain_zoom_rotate_flash" in e["data"]["shader_effect_file"]
                or "video_glitch_ripple" in e["data"]["shader_effect_file"]
                or "video_glitch_matrix" in e["data"]["shader_effect_file"]
                or "video_glitch_matrix_layered" in e["data"]["shader_effect_file"]
                or "video_play_normal" in e["data"]["shader_effect_file"]
                or "video_ascii_art" in e["data"]["shader_effect_file"]
                or "video_ascii_art_layered" in e["data"]["shader_effect_file"]
                or "video_flownoise" in e["data"]["shader_effect_file"]
            )
            print(f"  Contains {driver_count} of the main driver render shaders.\n")

        #___________
        # 3a. previously in the primary file before the main loop
        #   apply_cascading_timeline_adjustments(timeline_data, main_segments, new_segment_durations)
        # Map specific driver events to their exact required duration change (delta)
        # We use Python's id() function to track the exact dictionary objects.

        if len(main_segments) != len(new_segment_durations):
            raise ValueError("The list of new durations must match the number of main segments.")
    
        event_duration_deltas = {}
    
        for segment, target_duration in zip(main_segments, new_segment_durations):
            current_duration = segment['duration']
            total_delta = target_duration - current_duration
        
            # Find ONLY the main drivers in this segment
            drivers_in_seg = [
                e for e in segment['events'] 
                if "render_texture_plain_zoom_rotate_flash" in e["data"]["shader_effect_file"]
                or "video_glitch_ripple" in e["data"]["shader_effect_file"]
                or "video_glitch_matrix" in e["data"]["shader_effect_file"]
                or "video_glitch_matrix_layered" in e["data"]["shader_effect_file"]
                or "video_play_normal" in e["data"]["shader_effect_file"]
                or "video_ascii_art" in e["data"]["shader_effect_file"]
                or "video_ascii_art_layered" in e["data"]["shader_effect_file"]
                or "video_flownoise" in e["data"]["shader_effect_file"]
            ]
        
            if drivers_in_seg and total_delta != 0:
               # Distribute the time difference evenly among the drivers in this segment
               driver_total = sum(event["data"]["effect_duration"] for event in drivers_in_seg)
               if driver_total <= 0:
                   continue
               scale = max(0.001, (driver_total + total_delta) / driver_total)
               for driver_event in drivers_in_seg:
                   duration = driver_event["data"]["effect_duration"]
                   event_duration_deltas[id(driver_event)] = duration * (scale - 1.0)

        #___________
        # 3b. Iterate chronologically through the ENTIRE timeline and apply the cascade
        accumulated_shift = 0.0
    
        for event in self.resolved_effects:
            # A. Apply whatever time shift has built up from previous altered events
            event["data"]['effect_start_time'] += accumulated_shift
        
            # B. If this specific event is one of the drivers we need to stretch/squeeze
            event_id = id(event)
            if event_id in event_duration_deltas:
                delta = event_duration_deltas[event_id]
            
                # Change its duration
                event["data"]['effect_duration'] += delta
            
                # Because this event is now longer/shorter, EVERYTHING after it must shift by this delta
                accumulated_shift += delta

    def _get_iDate(self):
        # Get the current local date and time
        now = datetime.datetime.now()
    
        year = float(now.year)
        month = float(now.month)
        day = float(now.day)
    
        # Calculate seconds since midnight including microseconds
        seconds_since_midnight = (
            (now.hour * 3600) + 
            (now.minute * 60) + 
            now.second + 
            (now.microsecond / 1_000_000.0)
        )
    
        # Return as a tuple of 4 floats (which represents a vec4)
        return (year, month, day, seconds_since_midnight)

    def _pre_load_and_compile_resources(self):
        """
        Loops through the entire timeline configuration upfront. Compiles all shaders, 
        initializes all textures, and registers them into the cache before playback begins.
        """
        print("\n--- Starting Upfront Resource Pre-Loading & Compilation ---")

        # =====================================================================
        # NEW: DYNAMIC TIMELINE CULLING
        # =====================================================================
        audio_duration_sec = float('inf') # Default to infinite if no audio
        
        if self.audio_path:
            print(f"Pre-loading master audio to determine track length: {self.audio_path}")
            # Requesting the texture here caches it immediately.
            audio_tex_wrapper = self.shader_cache.get_or_load_texture(self.audio_path)
            
            if audio_tex_wrapper and hasattr(audio_tex_wrapper.impl, 'audio_data'):
                # Calculate duration: total mono samples / samples per second
                num_samples = len(audio_tex_wrapper.impl.audio_data)
                sample_rate = audio_tex_wrapper.impl.sample_rate
                audio_duration_sec = num_samples / sample_rate
                
                # Format to MM:SS for the console
                mins = int(audio_duration_sec // 60)
                secs = int(audio_duration_sec % 60)
                print(f"   => Detected audio track length: {mins}m {secs}s ({audio_duration_sec:.2f} seconds)")

        # Safety Buffer: We add 45 seconds to the cutoff threshold. 
        # Because `_sync_timeline_to_videos` runs AFTER this and might shrink 
        # video segments, this ensures we don't accidentally cull a shader that 
        # gets pulled backward into the active timeframe.
        cull_threshold = audio_duration_sec + 45.0
        # =====================================================================

        for effect_data in self.timeline_data:
            shader_file = effect_data['shader_effect_file']
            start_time = effect_data.get('effect_start_time', 0.0)

            # --- THE CULLING CHECK ---
            if start_time > cull_threshold:
                print(f"   [CULLING] Skipping '{effect_data.get('name')}'. Starts at {start_time:.1f}s (Beyond song end).")
                continue
            
            try:
                # 1. Fetch/Compile shader program and full screen quad VAO
                program, vao = self.shader_cache.get_or_load_shader(shader_file)

                # --- NEW: Check for Buffer A ---
                buffer_a_file = shader_file.replace('.txt', '_bufA.txt')
                prog_A, vao_A, ping_pong = None, None, None

                # Initialize a dictionary to store unique buffers if it doesn't exist
                if not hasattr(self, 'shared_ping_pongs'):
                    self.shared_ping_pongs = {}

                if os.path.exists(buffer_a_file):
                    print(f"   [Detected Buffer A] for {shader_file}")
                    prog_A, vao_A = self.shader_cache.get_or_load_shader(buffer_a_file)

                    #ping_pong = PingPongBuffer(self.ctx, self.width, self.height) << vram ballooning to 12gigs fixed now
                    # --- NEW: Check if this specific shader already has a PingPong Buffer! ---
                    if buffer_a_file not in self.shared_ping_pongs:
                        self.shared_ping_pongs[buffer_a_file] = PingPongBuffer(self.ctx, self.width, self.height)

                    # Fetch the shared buffer instead of creating a new one
                    ping_pong = self.shared_ping_pongs[buffer_a_file]
                    
                    if 'iResolution' in prog_A:
                        prog_A['iResolution'].value = (self.width, self.height, 1.0)
                    for i in range(4):
                        if f'iChannel{i}' in prog_A:
                            prog_A[f'iChannel{i}'].value = i

                # 2. Set static uniforms (only needs to be done once at startup!)
                if 'iResolution' in program:
                    program['iResolution'].value = (self.width, self.height, 1.0)

                # Assuming iChannel0, iChannel1, iChannel2, iChannel3, for textures 0, 1, 2, 3                
                for i in range(4):
                    channel_name = f'iChannel{i}'
                    if channel_name in program:
                        program[channel_name].value = i  # Maps to texture unit index i

                if 'iChannel20' in program:
                    program['iChannel20'].value = 20

                if 'iChannel21' in program:
                    program['iChannel21'].value = 21

                # OVERWRITE iChannel3 [material_4] with default musical score, named audio_path
                #    USE_CASE: Music Video Prod
                #       For iChannel0/iChannel3: when pygame/base render texture 
                #       is passed, it takes precedence, combined with the default
                #       audiofile that is defined globally and played throughout.
                #    USE_CASE: Testing/other things
                #       Otherwise, fall back to the effect's defined 
                #       material_1 (textures[0]) and material_4 (textures[3]).

                if self.audio_path:
                    print(f"_pre_load_and_compile_resources(): self.audio_path: {self.audio_path}")

                    # 3. Pre-load matching textures (material 1-3)
                    textures = []
                    for channel_key in ['material_1', 'material_2', 'material_3']:
                        tex_path = effect_data.get(channel_key)
                        if tex_path:
                            tex_obj = self.shader_cache.get_or_load_texture(tex_path)
                            textures.append(tex_obj)
                        else:
                            textures.append(None)
                    # lastly append material_4 which is audio_texture
                    tex_obj = self.shader_cache.get_or_load_texture(self.audio_path)
                    textures.append(tex_obj)
                else:
                    # 3. Pre-load matching textures (material 1-4)
                    textures = []
                    for channel_key in ['material_1', 'material_2', 'material_3', 'material_4']:
                        tex_path = effect_data.get(channel_key)
                        if tex_path:
                            tex_obj = self.shader_cache.get_or_load_texture(tex_path)
                            textures.append(tex_obj)
                        else:
                            textures.append(None)

                # 4. Pack resolved pointers together for zero-latency lookups during updates
                self.resolved_effects.append({
                    'data': effect_data,
                    'program': program,
                    'vao': vao,
                    'prog_A': prog_A,         # NEW
                    'vao_A': vao_A,           # NEW
                    'ping_pong': ping_pong,   # NEW
                    'textures': textures,
                    'iFrame': 0               # NEW: Track local frames for the effect
                })

            except Exception as e:
                print(f"Critical error pre-loading config item '{effect_data.get('name')}': {e}")
        print("--- Pre-Loading Complete ---\n")

    def update(self, current_time: float, audio_amp_top: tuple, audio_amp_bottom: tuple, \
               audio_sync_data: dict, angle_deg: float, pivot: tuple, pixel_offset: tuple, \
               target_size: tuple, render_texture: moderngl.Texture | None, \
               console_texture: list | None):
        """
        Executes frame updates. It checks timing on pre-loaded resources,
        binds dynamic parameters, and triggers the active effects.
        """
        # Replicates your testbed's timeline scanning
        for effect in self.resolved_effects:
            effect_data = effect['data']
            start_time = effect_data['effect_start_time']
            duration = effect_data['effect_duration']
            end_time = start_time + duration

            # Match the testbed timing check logic
            if start_time <= current_time <= end_time:
                if self.debug:
                    print(f"Current Time = {current_time:.2f}/{end_time}: Effect '{effect_data['name']}'")
               
                self.render_effect(effect, current_time, start_time, end_time, audio_amp_top, \
                                   audio_amp_bottom, audio_sync_data, angle_deg, pivot, \
                                   pixel_offset, target_size, render_texture, console_texture)
                
                # Optional: break if you only want ONE active timeline shader running at a time.
                # Remove this break if you want to support overlapping concurrent shaders.
                break


    def render_effect(self, effect: dict, current_time: float, start_time: float, end_time: float, \
                      audio_amp_top: tuple, audio_amp_bottom: tuple, audio_sync_data: dict, \
                      angle_deg: float, pivot: tuple, pixel_offset: tuple, target_size: tuple, \
                      render_texture: moderngl.Texture | None, console_texture: list | None):
        """
        Executes uniform bindings and draw operations for the active effect.
        """

        main_prog = effect['program']
        main_vao = effect['vao']
        prog_A = effect['prog_A']
        vao_A = effect['vao_A']
        ping_pong = effect['ping_pong']
        textures = effect['textures']

        # Advance the local frame counter
        iFrame = effect['iFrame']
        effect['iFrame'] += 1

        # A helper function to apply uniforms to ANY program (Main or Buffer)
        def apply_uniforms(prog):
            # --- Update the time uniform ---
            if 'iDate' in prog: prog['iDate'].value = self._get_iDate()
            if 'iTime' in prog: prog['iTime'].value = current_time
            if 'iStartTime' in prog: prog['iStartTime'].value = start_time
            if 'iEndTime' in prog: prog['iEndTime'].value = end_time

            # --- Update the frame uniform ---
            if 'iFrame' in prog: prog['iFrame'].value = iFrame

            # --- Pass amplitude data into the shader uniforms ---
            if 'u_amp_top' in prog: prog['u_amp_top'].value = audio_amp_top
            if 'u_amp_bottom' in prog: prog['u_amp_bottom'].value = audio_amp_bottom

            # --- Pass zoom/rotation into the shader uniforms ---
            if 'u_angle_deg' in prog: prog['u_angle_deg'].value = angle_deg
            if 'u_pivot' in prog: prog['u_pivot'].value = pivot
            if 'u_pixel_offset' in prog: prog['u_pixel_offset'].value = pixel_offset
            if 'u_target_size' in prog: prog['u_target_size'].value = target_size

            # --- Map the audio sync values ---
            if 'iMusicSync0' in prog: prog['iMusicSync0'].value = audio_sync_data.get('sync_value_1', 0.0)
            if 'iMusicSync1' in prog: prog['iMusicSync1'].value = audio_sync_data.get('sync_value_2', 0.0)
            if 'iMusicSync2' in prog: prog['iMusicSync2'].value = audio_sync_data.get('sync_value_3', 0.0)

        try:
            # -------------------------------------------------------------
            # PASS 1: RENDER TO BUFFER A (If it exists)
            # -------------------------------------------------------------
            if prog_A and ping_pong:
                # Target the write buffer
                ping_pong.fbo_write.use()
                
                apply_uniforms(prog_A)

                # For render_texture to be passed onto glitch-based shaders 
                # that take the pygame surface as texture for manipulation
                # bind it here in order make it possible to add zoom/rotate/flash
                # that would otherwise be impossible for shader-glitch effects... 
                #   it seems...
                if self.is_main_sequence_event(current_time):
                    render_texture.use(location=0)

                    # Bind inputs for Buffer A
                    ping_pong.tex_read.use(location=1)
                
                    # Bind standard textures to remaining slots
                    for i in range(2, 4):
                        if textures[i]:
                            textures[i].update(current_time)
                            textures[i].use(location=i)
                else:
                    # Bind inputs for Buffer A
                    # Convention: iChannel0 usually reads from Buffer A's previous frame
                    ping_pong.tex_read.use(location=0)
                
                    # Bind standard textures to remaining slots
                    for i in range(1, 4):
                        if textures[i]:
                            textures[i].update(current_time)
                            textures[i].use(location=i)
                
                # Draw Pass 1
                vao_A.render(moderngl.TRIANGLE_STRIP)

            # -------------------------------------------------------------
            # PASS 2: RENDER MAIN IMAGE (To Screen / Base Framebuffer)
            # -------------------------------------------------------------
            # Return target to the default screen buffer (0 in standard OpenGL, or whatever Pygame/ModernGL uses)
            self.ctx.screen.use()

            apply_uniforms(main_prog)

            if console_texture is not None:
                console_texture[0].use(location=20)
                console_texture[1].use(location=21)

            # Bind inputs for Main Image
            if ping_pong:
                # If we have a Buffer A, Main Image's iChannel0 reads the result we just wrote!
                ping_pong.tex_write.use(location=0)
            elif render_texture is not None:
                # Bind textures dynamically. For iChannel0: if pygame/base 
                # render texture is passed, it takes precedence
                render_texture.use(location=0)
            else:
                # otherwise, fall back to the effect's defined material_1 (textures[0]).
                tex0 = textures[0]
                if tex0 is not None:
                    tex0.update(current_time)
                    tex0.use(location=0)

            # For iChannel1, iChannel2, iChannel3:
            for i in range(1, 4):
                tex = textures[i]
                if tex is not None:
                    tex.update(current_time)
                    tex.use(location=i)

            # Draw Pass 2
            main_vao.render(moderngl.TRIANGLE_STRIP)

            # -------------------------------------------------------------
            # PASS 3: PING-PONG SWAP
            # -------------------------------------------------------------
            if ping_pong:
                ping_pong.swap()

        except moderngl.Error as e:
            print(f"ModernGL error in effect '{effect_data.get('name')}': {e}")
        except Exception as e:
            print(f"Unexpected error rendering effect '{effect_data.get('name')}': {e}")


#___TimelineEffectGenerator__TimelineEffectReconstructor___
#______________________________________________________________________________________________________

# FOR CLARITY moved to shader_vars.py 
# thus... 
#   PREDEFINED_TRIUNE_EFFECTS
#   SINGULAR_EFFECT_LIST
#   SHADER_MATERIAL_REGISTRY
#      became >> from shader_vars import *

from shader_vars import *

class TimelineEffectGenerator:
    def __init__(self, predefined_triunes, singular_list, neural_indices_filenames_all, predefined_prob=0.5):
        self.predefined_triunes = predefined_triunes

        #self.singular_list = list(singular_list)
        self.singular_list = self._get_neural_singular_list(singular_list, neural_indices_filenames_all)

        self.predefined_prob = predefined_prob
        
        # Internal pools of unused options
        self.unused_predefined = []
        self.unused_singular = []
        
        # Track the last used predefined group to prevent consecutive repeats upon reshuffling
        self.last_predefined_group = None

        # Populate and shuffle the initial pools
        self._replenish_predefined()
        self._replenish_singular()

    """
    2026-10-23: neural indice-based approach
    REPLACING _replenish_singular(self): random.shuffle
    """
    def _get_neural_singular_list(self, singular_list, neural_indices_filenames_all):
        singular_list = list(singular_list)
        if not neural_indices_filenames_all:
            random.shuffle(singular_list)
            return singular_list
        print(f"TimelineEffectGenerator::_get_neural_singular_list: len(singular_list): {len(singular_list)}")

        # self-explanatory helper function
        def load_neural_indices_json(filepath, ceiling=None):
            try:
                print(f"Loading neural_indices from {filepath}")

                with open(filepath, 'r') as f:
                    indices = json.load(f)
            
                    # If a ceiling is provided, filter the list
                    if ceiling is not None:
                        # Keep only the indices that are within the valid range
                        filtered_indices = [idx for idx in indices if type(idx) is int and 0 <= idx < ceiling]
                
                        if len(filtered_indices) < len(indices):
                            print(f"Filtered out {len(indices) - len(filtered_indices)} out-of-bounds indices.")
                    
                        return filtered_indices
            
                    return indices
            except json.JSONDecodeError as e:
                # This triggers if the file was corrupted on the drive!
                print(f"CORRUPTION DETECTED: The file {filepath} is not valid JSON.")
                print(f"Specific error: {e}")
                return None
            except FileNotFoundError:
                print("File not found.")
                return None

        # Iterate 20 times for enough variation
        unique_top_signal_indices = []
        for i in range(20):
            tmp_data = load_neural_indices_json(
                random.choice(neural_indices_filenames_all),
                ceiling=len(singular_list)
            )
            if tmp_data:
                unique_top_signal_indices.extend(tmp_data)

        print(f"_get_neural_singular_list:: ORIG LEN: {len(unique_top_signal_indices)}")

        unique_top_signal_indices = list(dict.fromkeys(unique_top_signal_indices[:]))
        random.shuffle(unique_top_signal_indices)
        print(f"_get_neural_singular_list: UNIQUE LEN: {len(unique_top_signal_indices)}")

        if not unique_top_signal_indices:
            random.shuffle(singular_list)
            return singular_list
        selected_shader_filenames = []
        for index in unique_top_signal_indices:
            selected_shader_filenames.append(singular_list[index])
            print(f"index: {index} > {singular_list[index]}")

        return selected_shader_filenames

    def _replenish_predefined(self):
        """
        Replenishes the predefined groups draw pile.
        """
        keys = list(self.predefined_triunes.keys())
        random.shuffle(keys)
        
        # Edge-case prevention: If the first item of the new shuffle matches the last 
        # item of the previous shuffle, swap it with another item in the list to avoid consecutive repeats.
        if len(keys) > 1 and keys[0] == self.last_predefined_group:
            keys[0], keys[1] = keys[1], keys[0]
            
        self.unused_predefined = keys

    def _replenish_singular(self):
        """
        Replenishes the singular effects draw pile.
        """
        pool = list(self.singular_list)
        #print(f"_replenish_singular::pool>> {pool}")
        #random.shuffle(pool)
        self.unused_singular = pool

    def _get_predefined_group(self) -> list:
        """
        Draws one predefined triune group, replenishing the pile if empty.
        """
        if not self.unused_predefined:
            self._replenish_predefined()
            
        group_key = self.unused_predefined.pop()
        self.last_predefined_group = group_key
        return self.predefined_triunes[group_key]

    def _get_singular_elements(self, count: int) -> list:
        """
        Draws 'count' unique singular elements, replenishing the pile if necessary.
        """
        selected = []
        for _ in range(count):
            if not self.unused_singular:
                self._replenish_singular()
            selected.append(self.unused_singular.pop())        
        return selected

    def resolve_effect(self, effect_name: str) -> list:
        """
        Resolves the given effect type to a list of file paths without duplications.
        """
        if effect_name == "TRIUNE_EFFECT":
            # 50/50 decision (or customized via predefined_prob)
            if random.random() < self.predefined_prob:
                return self._get_predefined_group()
            else:
                # Get 3 unique singular effects
                return self._get_singular_elements(3)
                
        elif effect_name == "SINGULAR_EFFECT":
            # Get 1 unique singular effect
            return self._get_singular_elements(1)
            
        return []

class TimelineEffectReconstructor:
    def __init__(self, timeline_filepath: str, main_seq_events: str, shader_path_glsl: str, 
                 neural_indices_filenames_all: list[str]):
        self.timeline_data = []
        self.main_seq_event_data = []

        # Keep track of active triune files across iterations
        self.active_triune_group = []

        # 1. Load file configs
        self._load_json_config(timeline_filepath, "timeline")
        self._load_json_config(main_seq_events, "main_seq_events")

        # 2. Check shader file integrity
        if not self._check_shader_integrity(SINGULAR_EFFECT_LIST, shader_path_glsl):
            return

        # 3. Create the generator instance (maintains its own state across the timeline)
        self.generator = TimelineEffectGenerator(
            PREDEFINED_TRIUNE_EFFECTS,
            SINGULAR_EFFECT_LIST,
            neural_indices_filenames_all,
            predefined_prob=0.5
        )

    def _load_json_config(self, filepath: str, key: str):
        path = Path(filepath)
        try:
            with path.open('r') as f:
                data = json.load(f)
            items = data.get(key, [])

            if key == "timeline":
                self.timeline_data = items
            elif key == "main_seq_events":
                self.main_seq_event_data = items

            print(f"Loaded {len(items)} items from {key} config.")
        except FileNotFoundError:
            print(f"Error: Config file not found at {path}")
        except json.JSONDecodeError:
           print(f"Error: Could not decode JSON from {path}")
        except Exception as e:
           print(f"An error occurred loading config {path}: {e}")

    def _check_shader_integrity(self, effect_list, shader_path):
        """
        Checks if all expected shader files exist in the target directory 
        and lists any extra files found in the directory.
        """
        path = Path(shader_path)
        print("\n======================================================")
        print("TimelineEffectReconstructor._check_shader_integrity():")
        print(f"  path: {path}")
    
        # Check if the folder actually exists
        if not path.is_dir():
            print(f"❌ ERROR: The directory '{shader_path}' does not exist.")
            return False

        # 1. Convert lists to sets for easy comparison
        expected_files = set(effect_list)
    
        # 2. Get the actual list of files currently in the folder
        # .is_file() ensures we only check files, ignoring sub-folders
        actual_files = set(file.name for file in path.iterdir() if file.is_file())

        # 3. Use set math to find missing and extra files
        missing_files = expected_files - actual_files
        extra_files = actual_files - expected_files

        # 4. Report the results
        is_ok = len(missing_files) == 0

        if is_ok:
            print("✅ OK: All expected shader files are present!")
        else:
            print(f"❌ MISSING FILES ({len(missing_files)}):")
            for file in sorted(missing_files):
                print(f"   - {file}")

        if extra_files:
            print(f"\n⚠️  DEBUG: Extra files found in '{shader_path}' ({len(extra_files)}):")
            for file in sorted(extra_files):
                print(f"   - {file}")

        return is_ok

    def reconstruct_timeline(self) -> dict:
        total_entries = len(self.timeline_data)
        reconstructed_timeline = []
        total_start_time = 0.0
        chosen_file = None

        # Reset the active group whenever we rebuild
        self.active_triune_group = []

        # Helper to check the registry for texture configurations first, 
        # falling back to the placeholder's original values if not found.
        def resolve_materials(filename, fallback_data):
            registry_entry = SHADER_MATERIAL_REGISTRY.get(filename)
            if registry_entry is not None:
                return (
                    registry_entry.get("material_1"),
                    registry_entry.get("material_2"),
                    registry_entry.get("material_3"),
                    registry_entry.get("material_4")
                )
            return (
                fallback_data.get("material_1"),
                fallback_data.get("material_2"),
                fallback_data.get("material_3"),
                fallback_data.get("material_4")
            )

        for i, effect_data in enumerate(self.timeline_data):
            shader_effect_file = effect_data['shader_effect_file']
        
            # Using pathlib to parse filenames and paths safely
            effect_path = Path(shader_effect_file)
            shader_base_filename = effect_path.name
            # .as_posix() ensures forward slashes are used
            shader_base_path = effect_path.parent.as_posix() 

            # Default to the entry's duration, though we may override it
            effect_duration = effect_data['effect_duration']

            # Helper function updated to accept explicit material assignments
            def create_entry(name, file_path, duration, start_time, mat_1=None, mat_2=None, mat_3=None, mat_4=None):
                return {
                    "name": name,
                    "shader_effect_file": file_path,
                    "material_1": mat_1,
                    "material_2": mat_2,
                    "material_3": mat_3,
                    "material_4": mat_4,
                    "effect_start_time": start_time,
                    "effect_duration": duration
                }

            # 1. Main Sequence Events
            if shader_base_filename in self.main_seq_event_data:
                m1, m2, m3, m4 = resolve_materials(shader_base_filename, effect_data)
                entry = create_entry(
                    name=effect_data['name'],
                    file_path=shader_effect_file,
                    duration=effect_duration,
                    start_time=total_start_time,
                    mat_1=m1, mat_2=m2, mat_3=m3, mat_4=m4
                )
                reconstructed_timeline.append(entry)

            # 2. Dynamic Shader Placeholders
            else:
                shader_name = effect_data['name']

                if shader_name == "SINGULAR_EFFECT":
                    chosen_file = self.generator.resolve_effect("SINGULAR_EFFECT")[0]
                    print(f"chosen_file: {chosen_file}")
                    effect_duration = round(random.uniform(4.5, 5.5), 1) #5.0
                
                    full_path = f"{shader_base_path}/{chosen_file}"
                    m1, m2, m3, m4 = resolve_materials(chosen_file, effect_data)
                    entry = create_entry(
                        name="RECONSTRUCTED_EFFECT", 
                        file_path=full_path, 
                        duration=effect_duration, 
                        start_time=total_start_time,
                        mat_1=m1, mat_2=m2, mat_3=m3, mat_4=m4
                    )
                    reconstructed_timeline.append(entry)

                elif shader_name == "TRIUNE_EFFECT_1_of_3":
                    # Request a fresh set of 3 files
                    self.active_triune_group = self.generator.resolve_effect("TRIUNE_EFFECT")
                    print(f"Generated new triune group: {self.active_triune_group}")
                    
                    # Grab first file
                    chosen_file = self.active_triune_group.pop(0) if self.active_triune_group else "fallback.txt"
                    effect_duration = round(random.uniform(4.5, 5.5), 1) #5.0
                    
                    full_path = f"{shader_base_path}/{chosen_file}"
                    m1, m2, m3, m4 = resolve_materials(chosen_file, effect_data)
                    entry = create_entry(
                        name="RECONSTRUCTED_EFFECT_0", 
                        file_path=full_path, 
                        duration=effect_duration, 
                        start_time=total_start_time,
                        mat_1=m1, mat_2=m2, mat_3=m3, mat_4=m4
                    )
                    reconstructed_timeline.append(entry)

                elif shader_name == "TRIUNE_EFFECT_2_of_3":
                    # Grab second file from the active group
                    if self.active_triune_group:
                        chosen_file = self.active_triune_group.pop(0)
                    else:
                        chosen_file = self.generator.resolve_effect("SINGULAR_EFFECT")[0]
                    
                    effect_duration = round(random.uniform(4.5, 5.5), 1) #5.0
                    
                    full_path = f"{shader_base_path}/{chosen_file}"
                    m1, m2, m3, m4 = resolve_materials(chosen_file, effect_data)
                    entry = create_entry(
                        name="RECONSTRUCTED_EFFECT_1", 
                        file_path=full_path, 
                        duration=effect_duration, 
                        start_time=total_start_time,
                        mat_1=m1, mat_2=m2, mat_3=m3, mat_4=m4
                    )
                    reconstructed_timeline.append(entry)

                elif shader_name == "TRIUNE_EFFECT_3_of_3":
                    # Grab final file from the active group
                    if self.active_triune_group:
                        chosen_file = self.active_triune_group.pop(0)
                    else:
                        chosen_file = self.generator.resolve_effect("SINGULAR_EFFECT")[0]
                    
                    effect_duration = round(random.uniform(4.5, 5.5), 1) #5.0
                    
                    full_path = f"{shader_base_path}/{chosen_file}"
                    m1, m2, m3, m4 = resolve_materials(chosen_file, effect_data)
                    entry = create_entry(
                        name="RECONSTRUCTED_EFFECT_2", 
                        file_path=full_path, 
                        duration=effect_duration, 
                        start_time=total_start_time,
                        mat_1=m1, mat_2=m2, mat_3=m3, mat_4=m4
                    )
                    reconstructed_timeline.append(entry)
                else:
                    # Not a recognized dynamic placeholder (e.g. hardcoded matrix_twirl_green, rainbow_circle, etc.)
                    # Keep the original effect entry as-is (no randomization, keep original duration)
                    m1, m2, m3, m4 = resolve_materials(shader_base_filename, effect_data)
                    entry = create_entry(
                        name=effect_data['name'],
                        file_path=shader_effect_file,
                        duration=effect_duration,
                        start_time=total_start_time,
                        mat_1=m1, mat_2=m2, mat_3=m3, mat_4=m4
                    )
                    reconstructed_timeline.append(entry)

            # Correct master clock incrementing
            total_start_time += effect_duration
            print(f"{i+1}/{total_entries}: {total_start_time - effect_duration} >> {total_start_time} ({effect_duration})")

        # Return the data as a native Python dictionary
        return {"timeline": reconstructed_timeline}

