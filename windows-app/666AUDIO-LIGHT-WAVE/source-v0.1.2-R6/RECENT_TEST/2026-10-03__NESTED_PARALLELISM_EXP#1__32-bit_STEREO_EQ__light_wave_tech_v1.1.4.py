# light_wave_tech_v1.1.4.py

"""
INSTALLATION/SETUP NOTES:
-------------------------
conda create -n light_wave_tech python=3.10
conda activate light_wave_tech
pip install pygame-ce
pip install opencv-python
pip install pandas
pip install scipy
pip install mutagen
pip install moderngl
pip install pillow

>>> >> USE THIS: 
conda activate light_wave_tech

FOR AUDIO IN PREMIERE:
  - STEREO EXPANDER 200

IMPROVEMENT(S):
-------------------------

IF SOMEDAY INTEREST ARISES: RTX_2070 FRAMETIME STUTTERING:
https://aistudio.google.com/app/prompts/1xbN7o_yQlDu5zltZ7yHcbmWY8T-ZMTC3
  CPU COMPOSITION TO GPU

IF "black screen" in some shader effect, most likely time issue
in such case add this for replacement: float localTime = mod(iTime, 6.0);

TRY THIS FOR OUTRO BG:
      "shader_effect_file": "DATA/shaders/music_video/v2/supercluster.txt"

ON LINES 1488 and 2424 TRY DIFFERENT VALUES FOR DIFFERENT SONGS
ADD THIS TO audio_vars and here
audiopath, preset = "", "high"
normal, high, low, 

    "video_glitch_matrix.txt

import traceback

try:
    # your main loop
    run_timeline()
except Exception as e:
    # This will print the full, multi-line error showing the exact file, 
    # the exact line number, and the true root cause.
    traceback.print_exc()
"""

#______________________________________________________________________________________________________
#___IMPORTS____________________________

import helper_functions
import shader_manager

import pygame
import pygame.freetype
import statistics
import traceback
import random
import json
import time
import gc
import os
import sys
import cv2
import csv
import math
import wave
import moderngl
import numpy as np
import pandas as pd
from scipy.io import wavfile
from collections import Counter
from mutagen.mp3 import MP3

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import queue

from scipy.signal import butter, lfilter, sosfiltfilt
import pyloudnorm as pyln
import pygame.sndarray
import sounddevice as sd
import soundfile as sf

# --- DSP Crossover Function ---
def create_lowpass_filter(cutoff, fs, order=4):
    """
    Creates a Butterworth Low-Pass Filter.
    Standard THX crossover is 80Hz, standard Dolby LFE limit is 120Hz.
    Order=4 creates a steep 24dB/octave slope.
    """
    nyquist = 0.5 * fs
    normal_cutoff = cutoff / nyquist
    b, a = butter(order, normal_cutoff, btype='low', analog=False)
    return b, a

#def SUNO_v5_load_and_lufs_normalize_in_memory(filepath, target_lufs=-13.0):
#    # THIS SAME AS v6 but with LUFs

def SUNO_v6_load_and_lufs_normalize(audio_path, target_lufs=-13.0, bass_db=0.0, mid_db=0.0, treble_db=0.0):
    # 1. Read the 32-bit WAV as a 32-bit float array
    # float32 gives 144+ dB of dynamic range, perfect for DSP and WASAPI
    data, fs = sf.read(audio_path, dtype='float32')


    """TEST BASS SYNC
    meter = pyln.Meter(fs)
    current_loudness = meter.integrated_loudness(data)
    print(f"current_loudness: {current_loudness}")

    left_channel  = data[:, 0]
    right_channel = data[:, 1]

    # Generate the filter coefficients for 120Hz at whatever the sample rate is (e.g., 48000)
    b, a = create_lowpass_filter(cutoff=130.0, fs=fs, order=4)

    # Apply the filter mathematically to the mono signal
    mono_for_sub = (left_channel + right_channel) * 0.5

    # Measure the LUFS of the new mono_for_sub track
    current_mono_loudness = meter.integrated_loudness(mono_for_sub)

    # Normalize the mono track to -13 LUFS
    normalized_mono_for_sub = pyln.normalize.loudness(mono_for_sub, current_mono_loudness, -15.0)

    # Clip to prevent stray digital peaks
    final_mono_for_sub = np.clip(normalized_mono_for_sub, -1.0, 1.0)

    lfe_filtered = lfilter(b, a, final_mono_for_sub)

    # Create an array of pure silence matching the mixer's channel count
    padded_audio = np.zeros((data.shape[0], 2), dtype=np.float32)
    padded_audio[:, 0] = lfe_filtered  # Front Left
    padded_audio[:, 1] = lfe_filtered  # Front Right

    audio_length_seconds = len(data) / fs
    return padded_audio, fs, audio_length_seconds"""


    
    # 2. Design crossover filters (2nd order Butterworth)
    bass_freq = 250.0    # Adjust to target your specific bass threshold
    treble_freq = 4000.0 # Adjust for high-end sparkle
    
    sos_bass = butter(2, bass_freq, btype='low', fs=fs, output='sos')
    sos_mid = butter(2, [bass_freq, treble_freq], btype='bandpass', fs=fs, output='sos')
    sos_treble = butter(2, treble_freq, btype='high', fs=fs, output='sos')
    
    print("Applying EQ filtering...")
    # 3. Apply zero-phase filtering (axis=0 keeps stereo channels intact)
    # sosfiltfilt applies the filter forward and backward, creating a 4th-order Linkwitz-Riley response
    bass_sig = sosfiltfilt(sos_bass, data, axis=0)
    mid_sig = sosfiltfilt(sos_mid, data, axis=0)
    treble_sig = sosfiltfilt(sos_treble, data, axis=0)
    
    # 4. Convert dB adjustments to linear gain multipliers
    gain_bass = 10 ** (bass_db / 20)
    gain_mid = 10 ** (mid_db / 20)
    gain_treble = 10 ** (treble_db / 20)
    
    # 5. Mix the adjusted bands back together
    eq_data = (bass_sig * gain_bass) + (mid_sig * gain_mid) + (treble_sig * gain_treble)
    
    # 6. Prevent clipping (if your boost pushes the amplitude over 1.0)
    max_val = np.max(np.abs(eq_data))
    if max_val > 1.0:
        eq_data = eq_data / max_val
        print(f"Auto-normalized to prevent clipping (reduced by {20 * np.log10(max_val):.2f} dB)")
        log_file = "LOG_AUTO_NORMALs.txt"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"Auto-normalized to prevent clipping (reduced by {20 * np.log10(max_val):.2f} dB): {audio_path}:\n")

    audio_length_seconds = len(data) / fs
    return eq_data, fs, audio_length_seconds

#______________________________________________________________________________________________________
#___RATING_____________________________

class SongRatingManager:
    def __init__(self, filepath="song_ratings.json"):
        """
        Initializes the manager and loads ratings into memory once.
        """
        self.filepath = filepath
        # Load ratings into an instance variable (memory) immediately
        self.ratings = self._load_ratings()

    def _load_ratings(self):
        """
        Loads the dictionary of song ratings from the JSON file.
        """
        if os.path.exists(self.filepath):
            with open(self.filepath, "r", encoding="utf-8") as file:
                try:
                    return json.load(file)
                except json.JSONDecodeError:
                    return {} 
        return {}

    def save_ratings(self):
        """
        Saves the current dictionary in memory back to the JSON file.
        """
        with open(self.filepath, "w", encoding="utf-8") as file:
            json.dump(self.ratings, file, indent=4)

    def change_song_rating(self, audio_path, delta):
        """ 
        Changes the song's rating by the delta (+1 or -1).
        """
        song_key = os.path.basename(audio_path) 
        
        # 1. Get the current score from MEMORY (not disk)
        current_score = self.ratings.get(song_key, 0)
        
        # 2. Calculate new score
        new_score = current_score + delta
        
        # 3. Update the dictionary in memory
        self.ratings[song_key] = new_score
        
        # 4. Save the updated dictionary to disk
        self.save_ratings()
        
        print(f"Rating updated | {song_key} | New Score: {new_score} (Change: {delta})")

    def get_rating(self, audio_path):
        """
        Optional helper: Easily check a song's score elsewhere in your code.
        """
        song_key = os.path.basename(audio_path)
        return self.ratings.get(song_key, 0)

#______________________________________________________________________________________________________
#___CONFIG_____________________________

class Config:
    def __init__(self, NSFW=False):
        self.NSFW = NSFW
        self.config_data: dict = {}
        self._load_config("config/filepaths.json")

    def _load_config(self, config_filepath: str):
        try:
            with open(config_filepath, 'r', encoding='utf-8') as f:
                # json.load directly parses the JSON object into a Python dictionary
                self.config_data = json.load(f)
            print(f"Loaded config from {config_filepath}.")
        except FileNotFoundError:
            print(f"Error: Config file not found at {config_filepath}")
        except json.JSONDecodeError:
            print(f"Error: Could not decode JSON from {config_filepath}")
        except Exception as e:
            print(f"An error occurred loading config {config_filepath}: {e}")

    def get(self, key: str, default=None):
        return self.config_data.get(key, default)

    def load_paths_from_cache(self):
        """
        Loads the previously saved directory path variables from a JSON cache file.
        """
        if self.NSFW:
            print("NSFW enabled")
            cache_filepath="config/preloaded_paths_cache_nsfw.json"
        else:
            cache_filepath="config/preloaded_paths_cache_normal.json"
            #cache_filepath="config/preloaded_paths_cache_minimal.json"

        if not os.path.exists(cache_filepath):
            raise FileNotFoundError(f"Cache file {cache_filepath} not found. Please run the save function first.")
        
        with open(cache_filepath, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        
        return cache_data

config = Config(NSFW=False)
config_shader_path_glsl = config.get("shader_path", {}).get("shader_path_glsl")

# Forces standard output to use UTF-8, avoiding crashes during redirection
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

#______________________________________________________________________________________________________

def convert(value):
    scaled = value / 255
    return scaled

def convert_and_clamp(value):
    scaled = value / 255
    return max(0.0, min(1.0, scaled))

#______________________________________________________________________________________________________
#___GLITCH_THINGIES____________________

from PIL import Image
from glitch_this import ImageGlitcher

def safe_glitch_left(frame, intensity, **kwargs):
    """
    Wraps the buggy glitch_this library. If it crashes, returns the unglitched frame.
    """
    try:
        local_glitcher = ImageGlitcher()
        return local_glitcher.glitch_array(frame, intensity, **kwargs)
    except ValueError: # Catches the NumPy broadcast error
        return frame

def safe_glitch_right(frame, intensity, **kwargs):
    try:
        local_glitcher = ImageGlitcher()
        return local_glitcher.glitch_array(frame, intensity, **kwargs)
    except ValueError: # Catches the NumPy broadcast error
        return frame

def safe_glitch_triune(frame, intensity, **kwargs):
    try:
        local_glitcher = ImageGlitcher()
        return local_glitcher.glitch_array(frame, intensity, **kwargs)
    except ValueError: # Catches the NumPy broadcast error
        return frame

#______________________________________________________________________________________________________
#___GENERAL_INIT_______________________

os.environ['SDL_VIDEO_MINIMIZE_ON_FOCUS_LOSS'] = '0'

BLACK         = (0, 0, 0)
WHITE         = (255, 255, 255)
GOLD          = (240, 224, 8)
GRAY          = (240, 240, 255)
CYAN          = (8, 224, 240)
CYAN_LIGHT    = (130, 224, 240)
PINK          = (250, 34, 197)
MAGENTA       = (250, 34, 197)
MAGENTA_LIGHT = (255, 170, 255)
PURPLE        = (187, 34, 250)
GREEN         = (8, 240, 224)

BASS_COLOR  = MAGENTA # (255, 50, 50) # Red
SNARE_COLOR = (50, 255, 50) # Green
HIHAT_COLOR = CYAN # (50, 150, 255) # Blue
audio_bar_vis_colors = [BASS_COLOR, SNARE_COLOR, HIHAT_COLOR]

#THRESHOLD_BASS = 0.35
#THRESHOLD_BASS_NEGATIVE = 0.35
#THRESHOLD_BASS_POSITIVE = 0.45
#THRESHOLD_SNARE = 0.40
#THRESHOLD_HIHAT = 0.50

THRESHOLD_BASS = 0.40
THRESHOLD_BASS_NEGATIVE = 0.40
THRESHOLD_BASS_POSITIVE = 0.50
THRESHOLD_SNARE = 0.40
THRESHOLD_HIHAT = 0.40


ENABLE_OBS_MODE_EFFECT = 1
ENABLE_AUDIO_EFFECTS = 0
DEBUG = False
CONSOLE = True
PLAYLIST = True
SHIFT_STATIC = 1

def Log_Neural_Indices(indices):
    log_file = "LOG_neural_indices.txt"
    with open(log_file, "a", encoding="utf-8") as f:
        for index in indices:
            f.write(f"{index}\n")

def Log_Neural_Indices_JSON(filepath):
    log_file = "LOG_neural_indices_JSON.txt"
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"{filepath}\n")

inspirational_words_1 = [
    "111", "222", "333", "444", "555", "777", "888", "999", "11:11", 
    "INFINITE", "ZEN", "QUANTUM", "AWARENESS", "AWAKE", "AWARE", 
    "INSIGHT", "11:NOW:11", "HOLOGRAM", "FRACTAL", "HOLOFRACTOGRAPHIC", 
    "FUTURE", "HAPPINESS", "JOY", "HOPE", "DISCOVERY", "Profound", 
    "Deep", "Significant", "Substantial", "Fundamental", "Momentous", 
    "Essence", "Substance", "Innermost Essence", "Innermost Substance", 
    "Core Essence", "Core Substance", "Intricate", "Complex", "Sophisticated", 
    "Detailed", "Understanding", "Innerstanding", "Enigmatic", 
    "Mystifying", "Perplexing", "Mysterious", "Quantum", "Consciousness", 
    "Multiverse", "Spiritual", "Awareness", "Cosmic", "Interconnected", 
    "Existence", "Time", "Zen", "Ethereal", "Reality", "Divine", 
    "Fractal", "Holographic", "Holofractographic", "Infinite", 
    "Creation", "Enlightenment", "Eternal", "Future", "Innerverse", 
    "Omnipresent", "Perception", "Purpose", "Realization", "Spirit", 
    "Transcend", "Transformation", "Truth", "Universe", "Wisdom", 
    "Victory", "Radiance", "Uplifting", "Enthusiastic", "Acceptance", 
    "Adept", "Alchemy", "Ascension", "Awakening", "Balance", "Bliss", 
    "Hope", "Joy", "Enthusiasm", "Courage", "Resilience", "Serenity", 
    "Gratitude", "Empowerment", "Belief", "Optimism", "Faith", "Triumph", 
    "Perseverance", "Dream", "Inspiration", "Motivation", "Strength", 
    "Endurance", "Empathy", "Compassion", "Kindness", "Generosity", 
    "Liberation", "Harmony", "Creativity", "Abundance", "Fulfillment", 
    "Renewal", "Discovery", "Adventure", "Wonder", "Imagination", 
    "Forgiveness", "Unity", "Growth", "Adaptability", "Intuition", 
    "Authenticity", "Tenacity", "Grace", "Love", "Breath", "Clarity", 
    "Concentration", "Connection", "Contemplation", "Devotion", "Dharma", 
    "Elixir", "Energy", "Entanglement", "Equanimity", "Healing", "Holistic", 
    "Inner peace", "Koan", "Meditation", "Mindful", "Mindfulness", 
    "Mysticism", "Nature", "Now", "Observer", "Observe", "Oneness", 
    "Particle", "Patience", "Presence", "Coherence", 
    "Computing", "Entanglement", "Quantum Field", 
    "Information", "Quantum Leap", "Non-locality", 
    "Superposition", "Teleportation", "Quantum State", 
    "Quintessence", "Resonance", "Sacred", "Satori", "Silence"
]

inspirational_words_2 = [
    "Simplicity", "Stillness", "Superposition", "Transcendence", 
    "Transmutation", "Wave", "Wavefunction", "Beautiful",
    "Vibrate", "Viberation", "Vibrating", "Non-linearity", "Non-linear", 
    "Within", "Life", "World", "Time Travel", "Living", "Alive", "Realm", 
    "Journey", "Concept", "Fabric", "Process", "Embrace", "Moment", "Dance", 
    "Realms", "Interconnectedness", "Beyond", "Whole", "Perceive", "Exploration", 
    "Conscious", "Boundless", "True", "Symphony", "Pursuit", "Transcends", 
    "Experience", "Individual", "Interwoven", "Comprehend", "Collective", 
    "Realize", "See", "Emerges", "Enigma", "Become", "Becoming", "Knowledge", 
    "Intertwined", "Woven", "Comprehension", "Recognize", "Embracing", "Expanse", 
    "Meaning", "Mysteries", "Path", "Potential", "Acknowledge", "Inherent", 
    "Integral", "Experiences", "Space", "Interplay", "Shaping", "Unfolds", 
    "Inner", "Idea", "Aware", "Transcending", "Creator", "Core", "Explore", 
    "Power", "Perspective", "Cosmos", "Contemplate", "Entwined", "Attention", 
    "Intrinsic", "Possibilities", "Beauty", "Light", "Weave", "Intertwines", 
    "Relationship", "Manifestation", "Transformative", "Contemplating", 
    "Convergence", "Unfolding", "Unraveling", "Evolution", "Fusion", 
    "Prime Radiant", "Evolving", "Embodiment", "Ability", 
    "Thought", "Uncover", "Odyssey", "Reveals", "Omniscient", "Omnipotent", 
    "Omnidimensional", "Omnificent", "Unveils", "Unique", "Harmonious", 
    "Everything", "Discover", "Introspection", "Ancient", "Essential", 
    "Metamorphosis", "Multidimensional", "Structure", "Dynamic", 
    "Tessellation", "Fully", "Truths", "Greater", "Layers", 
    "Multifaceted", "Diverse", "Ceaseless", "Unveiling", "Guiding", 
    "Imperative", "Pulsating", "Together", "Universal", "Key", 
    "Flow", "Endeavor", "Embody", "Focus", "Matrix", "Metaphysics", 
    "Revealing", "Perspectives", "Immerse", "Vibrant", "Wondrous", 
    "Awaken", "Curiosity", "Continuous", "Voyage", "Uncharted", 
    "Framework", "Design", "Foundation", "Resonates", "Resonate", 
    "Secrets", "Secret", "Projection", "Intertwine", "Vast", 
    "Vastness", "Level", "Senses", "Inseparable", "Innate", 
    "Realities", "Strive", "Shift", "Dimensions", "Levels", 
    "Moments", "Unified", "Unveil", "Sentient", "Conduit", 
    "Timeless", "Expression", "Resonating", "Active", 
    "Expansive", "Introspective", "Manifest", "Celestial", 
    "Shared", "Ultimate", "Seamless", "Weaving", "Teleportation", 
    "Lucidity", "Awakefulness", "Innersphere", "Intercommunication"
]

inspirational_words_3_higher_harmonics = [
    # --- CYBER-GNOSTIC & ALGORITHMIC DIVINITY ---
    "Recursion", "Source-Code", "Algorithm", "Root-Directory", "Syntax", 
    "Singularity", "Node", "Compiler", "Assembler", "Simulation", 
    "Hologram-Heart", "Cybernetic", "Override", "Glitch", "Bandwidth",
    
    # --- DEEP ESOTERIC & ANCIENT MYSTICISM ---
    "Śūnyatā", "Akasha", "Akashic", "Apadāthī", "Sambodhi", "Padmasamadhi", 
    "Dharmakāya", "Gnosis", "Pleroma", "Maya", "Samsara", "Kundalini", 
    "Chakra", "Prana", "Atman", "Brahman", "Tathāgata", "Nirvana", "Samadhi",

    # --- HYPER-GEOMETRY & QUANTUM COSMOLOGY ---
    "Holofractal", "Tesseractual", "Hyperdimensional", "Morphogenetic", 
    "Noosphere", "Singularity", "Event Horizon", "Tachyon", "Zero-Point", 
    "Quasar", "Supernova", "Nebula", "Fibonacci", "Sacred Geometry", "Ouroboros",

    # --- MYTHOLOGICAL ARCHETYPES ---
    "Yggdrasil", "Promethean", "Bodhisattva", "Avatar", "Shiva", 
    "Dakini", "Oracle", "Shambhala", "Indra's Net", "Matrix", "Archetype",

    # --- STATES OF RADICAL TRANSMUTATION ---
    "Syzygy", "Apotheosis", "Emanation", "Epiphany", "Dissolution", 
    "Unweave", "Recompile", "Superposition", "Entangle", "Resurgence",
    "Omnijective", "Pluriversal", "Autopoietic", "Metanoia", "Theosis"
]

# The Grand Unification of the Lexicon
inspirational_words_combined = (
    inspirational_words_1 + 
    inspirational_words_2 + 
    inspirational_words_3_higher_harmonics
)

def get_random_words():
    input_filename = f"F:/Deep_Learning_Local/subconscious_ai/grid_words.txt"
    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    words = text.split('\n')
    random.shuffle(words)
    return words
#random_words = get_random_words()

def Get_Random_Intro_Title():
    input_filename = f"DATA/random_title_names.txt"
    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    titles = text.split('\n')
    random.shuffle(titles)
    random_title = random.choice(titles)
    random_title = f"{random_title}.wav"
    return random_title
#______________________________________________________________________________________________________
#___GENERAL_AUDIO_STUFF________________

def get_audio_len(audio_path):
    # This reads the metadata without loading the whole heavy file into memory
    info = sf.info(audio_path)
    return info.duration  # Returns length in seconds

def get_audio_len_mp3(mp3_path):  
    audio = MP3(mp3_path)
    # audio.info.length returns the duration in seconds as a float
    duration_seconds = int(audio.info.length)
    return duration_seconds

def load_animation_data(filepath):
    print(f"Loading data from {filepath}...")
    
    # 1. Read the CSV into a pandas DataFrame
    # Note: If your CSV DOES NOT have headers (as mentioned in the original 2nd function), 
    # change this to: pd.read_csv(filepath, header=None, names=['Time_ms', 'Bass_Amplitude'])
    df = pd.read_csv(filepath)
    
    # 2. Round the time to the nearest whole number and convert to integer
    df['Time_ms'] = df['Time_ms'].round().astype(int)
    
    # 3. Group by the integer milliseconds and take the average of the amplitude
    # This prevents errors from having multiple data points at the exact same millisecond
    #df = df.groupby('Time_ms', as_index=False)['Bass_Amplitude'].mean()
    df = df.groupby('Time_ms', as_index=False)['Bass_Amplitude'].max()
    
    # 4. Convert the cleaned DataFrame back into a list of tuples: [(time, amplitude), ...]
    # index=False prevents the row index from being included
    # name=None ensures it returns standard Python tuples instead of pandas namedtuples
    data = list(df.itertuples(index=False, name=None))
    
    print("Import successful. Data grouped and converted to a list of tuples.")
    return data

def audio_bar_visualizer(surface, x, y, values):
    BASS_COLOR  = (250, 34, 197) # MAGENTA # (255, 50, 50)   # Red
    SNARE_COLOR = (50, 255, 50)  # GREEN
    HIHAT_COLOR = (8, 224, 240)  # CYAN    # (50, 150, 255) # Blue
    colors = [BASS_COLOR, SNARE_COLOR, HIHAT_COLOR]

    # Bar properties
    bar_width = 20
    max_bar_height = 80
    gap = 10
    #start_x = (SCREEN_WIDTH - (3 * bar_width + 2 * gap)) // 2
    #ground_y = SCREEN_HEIGHT - 30

    start_x = (x - (3 * bar_width + 2 * gap))
    ground_y = y - 30

    """font = pygame.font.SysFont(None, 24)
    labels = [
        font.render("BASS", True, (255, 255, 255)),
        font.render("SNARE", True, (255, 255, 255)),
        font.render("HI-HAT", True, (255, 255, 255))
    ]"""

    # Draw the bars
    for i in range(3):
        # Calculate height in pixels
        current_height = int(1 + values[i] * max_bar_height)
            
        x_pos = start_x + i * (bar_width + gap)
        # Y position is ground minus height (to grow upwards)
        y_pos = ground_y - current_height
            
        # Draw rectangle: (x, y, width, height)
        pygame.draw.rect(surface, colors[i], (x_pos, y_pos, bar_width, current_height))
            
        # Draw labels
        #label_x = x_pos + (bar_width - labels[i].get_width()) // 2
        #screen.blit(labels[i], (label_x, ground_y + 5))
#______________________________________________________________________________________________________
#___CONSOLE_THING_A_MAJIG______________

# --- 1. The Output Interceptor ---
class PygameConsole:
    def __init__(self):
        self.lines = []
        self.current_line = ""

    def write(self, text):
        # Print to the real background console just in case
        sys.__stdout__.write(text)
        
        # Process the incoming text
        for char in text:
            if char == '\n':
                # Save the FULL line (no truncation here anymore!)
                self.lines.append(self.current_line)
                self.current_line = ""
            else:
                self.current_line += char

    def get_buffer_contents(self):
        return self.lines

    def flush(self):
        pass

# --- The Reusable Renderer ---
def draw_console(console_obj, target_surface, font, start_x, start_y, max_height, max_chars, color=WHITE):
    line_height = font.get_linesize()
    
    # Calculate how many lines fit in this specific box
    max_lines = max_height // line_height

    # Combine finished lines with whatever is currently being typed
    display_lines = console_obj.lines + [console_obj.current_line]

    # SCROLLING MAGIC: Only take the last X lines that fit
    visible_lines = display_lines[-max_lines:]

    # Draw each visible line
    for index, text in enumerate(visible_lines):
        # Truncate text specifically for THIS screen copy
        if len(text) > max_chars:
            text = f"{text[:max_chars]}..."
            
        # Render the text into an image (Surface)
        text_surface = font.render(text, True, color)
    
        # Calculate Y position (start_y is the top of your console box)
        y_pos = start_y + (index * line_height)
    
        # Paste (blit) the text onto the requested surface
        target_surface.blit(text_surface, (start_x, y_pos))

class FileStreamConsole:
    def __init__(self, filepath, max_history=200):
        self.lines = []
        self.current_line = ""
        self.max_history = max_history
        
        # 1. Load the entire text file into memory
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                self.content = f.read()
        except FileNotFoundError:
            self.content = "ERROR: File not found.\n"
            
        if not self.content:
            self.content = " " # Fallback for empty files

        # 2. Pick a random starting index
        self.position = random.randint(0, len(self.content) - 1)

    def update(self, chars_per_tick=1):
        """Call this in your main loop to pull the next chunk of text."""
        chunk = ""
        # Pull the next N characters
        for _ in range(chars_per_tick):
            chunk += self.content[self.position]
            # Move position forward, loop back to 0 if at the end of the file
            self.position = (self.position + 1) % len(self.content)
            
        # 3. Process the pulled characters into lines
        for char in chunk:
            if char == '\n':
                self.lines.append(self.current_line)
                self.current_line = ""
                
                # Prevent memory leaks: discard old lines we can't see anyway
                if len(self.lines) > self.max_history:
                    self.lines.pop(0) 
            else:
                self.current_line += char

#______________________________________________________________________________________________________
#___AUDIO/MUSIC_SETUP__________________

if not PLAYLIST:
    audio_base_folder = config.get("audio_filepaths", {}).get("music_folder")
    audio_sync_data_base_folder = config.get("audio_filepaths", {}).get("sync_folder")

    # for clarity moved to audio_vars.py since audio are manually tested and used at the moment
    # thus... >> audio_path = f"{audio_base_folder}/.wav" became >> from audio_vars import *

    from audio_vars import *

    audio_base_filename = audio_path.replace("\\", "/")
    audio_base_filename = audio_base_filename.split("/")
    audio_base_filename = audio_base_filename[len(audio_base_filename)-1]

    if ".mp3" in audio_path:
        audio_base_filename = audio_base_filename.split(".mp3")
    else:
        audio_base_filename = audio_base_filename.split(".wav")

    audio_base_filename = audio_base_filename[0]
    print(f"audio_base_filename = {audio_base_filename}")

TEST_INSTRUMENTAL = 0
#audio_instrumental_base_folder = "W:/SUNO_INSTRUMENTAL/___FOOOOO___"

#______________________________________________________________________________________________________
#___DISPLAY____________________________

import ctypes
# 1. Tell Windows to ignore DPI scaling and give us the true resolution
try:
    # This works for Windows
    ctypes.windll.user32.SetProcessDPIAware()
except AttributeError:
    pass

SCREEN_WIDTH  = 3440
SCREEN_HEIGHT = 1440
#flags = pygame.DOUBLEBUF | pygame.HWSURFACE | pygame.FULLSCREEN
flags = pygame.OPENGL | pygame.DOUBLEBUF | pygame.FULLSCREEN

# Initialize the mixer specifically for 32-bit audio @48khz

"""# 1. Initialize the audio hardware with your desired parameters
stream = sd.OutputStream(
    samplerate=48000, 
    channels=8, 
    dtype='float32', 
    blocksize=512
)

# 2. Open the stream (this engages PortAudio and the hardware)
stream.start()

# 3. Read the actual hardware parameters 
print(f"MIXER_INIT: samplerate={stream.samplerate}, "
      f"channels={stream.channels}, "
      f"dtype={stream.dtype}, "
      f"blocksize={stream.blocksize}")

# Cleanup when done
stream.stop()
stream.close()

sys.exit()"""

pygame.init()

"""
# 2026-08-25: MOVED TO play_video_fullscreen() 
# to prevent memory-leak in playlist mode... 
# now calling pygame.display.quit() after each iteration

pygame.display.set_caption("MoviePy Fullscreen Player")
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags, vsync=1)
screen_info = pygame.display.Info()
actual_width, actual_height = screen_info.current_w, screen_info.current_h
print(f"actual_width: {actual_width}")
print(f"actual_height: {actual_height}")
"""

#______________________________________________________________________________________________________
#___JSON_______________________________

def load_neural_indices_json(filepath):
    try:
        print(f"Loading neural_indices from {filepath}")
        Log_Neural_Indices_JSON(filepath)
        with open(filepath, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        # This triggers if the file was corrupted on the drive!
        print(f"CORRUPTION DETECTED: The file {filepath} is not valid JSON.")
        print(f"Specific error: {e}")
        return None
    except FileNotFoundError:
        print("File not found.")
        return None
#______________________________________

class FastVideoClip:
    """
    A drop-in replacement for MoviePy's VideoFileClip using OpenCV.
    Completely eliminates FFMPEG subprocess pipe overhead and GIL locks.
    """
    def __init__(self, filename):
        self.cap = cv2.VideoCapture(filename)
        
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        if self.fps <= 0:
            self.fps = 24.0 # Fallback
            
        self.frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.duration = self.frame_count / self.fps if self.fps > 0 else 0
        
        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.size = (w, h)
        
        self.current_frame_idx = -1
        self.last_rgb_frame = None

    def get_frame(self, t):
        # Calculate which frame index we need for this specific timestamp
        target_idx = int(round(t * self.fps))

        if target_idx >= self.frame_count:
            target_idx = max(0, self.frame_count - 1)

        # OPTIMIZATION: If the main loop runs faster than the video FPS, 
        # we might query the same frame twice. Just return the cached frame instantly!
        if target_idx == self.current_frame_idx and self.last_rgb_frame is not None:
            return self.last_rgb_frame

        # If the timeline jumps backwards (e.g. video loops or changes), reset pointer
        if target_idx < self.current_frame_idx:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
            self.current_frame_idx = target_idx - 1
        
        # Fast-forward without decoding (skips IPC/decoding overhead)
        while self.current_frame_idx < target_idx:
            success = self.cap.grab()
            if not success:
                break
            self.current_frame_idx += 1
            
        # Retrieve and decode ONLY the frame we actually need
        success, frame = self.cap.retrieve()
        if success:
            self.last_rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        elif self.last_rgb_frame is None:
            self.last_rgb_frame = np.zeros((self.size[1], self.size[0], 3), dtype=np.uint8)
            
        return self.last_rgb_frame

    def close(self):
        if self.cap.isOpened():
            self.cap.release()

def is_clip_alive(clip):
    """
    Return True if *clip* is a MoviePy clip that still has an open reader.
    Works with:
        - moviepy.editor.VideoFileClip (1.x)
        - moviepy.VideoFileClip (2.x)
        - any clip that has a .reader attribute
    """
    if clip is None:
        return False

    # All clip objects have a .reader attribute (or .audio.reader for audio)
    return hasattr(clip, "reader") and getattr(clip, "reader", None) is not None

def safe_close_clip(clip):
    """
    Safely closes our OpenCV wrapper or falls back to MoviePy close if mixed.
    """
    if clip is None:
        return
        
    # If it's our new OpenCV FastVideoClip
    if hasattr(clip, "cap"):
        clip.close()
        return

    # Fallback for old MoviePy objects (just in case you still use them somewhere)
    if hasattr(clip, "reader") and getattr(clip, "reader", None) is not None:
        try:
            if getattr(clip, "audio", None) is not None:
                if hasattr(clip.audio.reader, "close_proc"):
                    clip.audio.reader.close_proc()
            clip.reader.close()
            clip.close()
        except Exception as e:
            pass

def Shift_Static_Position(video_filenames, video_base_filenames_static, video_filenames_replacement_pool):
    insert_back = []
    replacement_index = 0

    print("Shift_Static_Position()")
    print(f"   len(video_filenames): {len(video_filenames)}")
    print(f"   len(video_filenames_replacement_pool): {len(video_filenames_replacement_pool)}")

    for i, each in enumerate(video_filenames):
        base_filename = each.replace("\\", "/")
        base_filename = base_filename.split("/")
        base_filename = base_filename[len(base_filename)-1]
        base_filename = base_filename.split(".mp4")
        base_filename = f"{base_filename[0]}.mp4"
        #print(f"base_filename = {base_filename}")

        # replace found static video with a fresh video from replacement_pool
        if base_filename in video_base_filenames_static:
            print(f"   STATIC FOUND: {i}: {base_filename}")
            print(f"   VALUE_BEFORE: {video_filenames[i]}")
            insert_back.append(video_filenames[i])
            video_filenames[i] = video_filenames_replacement_pool[replacement_index]
            print(f"   VALUE_AFTER: rep_idx {replacement_index} {video_filenames[i]}")
            replacement_index += 1
       
    num_entries = len(insert_back)
    print(f"   num_entries: {num_entries}")
    if num_entries >= 20:
        num_entries = 20
        print("      LIMITING TO 20")

    for i in range(num_entries-1):
        each = insert_back[i]
        print(f"{each}")
        random_idx_insert_replace = random.randint(10, 100)
        print(f"   INSERT_BACK ({i}) >> BEFORE: {video_filenames[random_idx_insert_replace]}")
        video_filenames[random_idx_insert_replace] = insert_back[i]
        print(f"   INSERT_BACK ({i}) >> AFTER: {random_idx_insert_replace}: {video_filenames[random_idx_insert_replace]}")

    return video_filenames

#______________________________________________________________________________________________________
#___PROCESS_VIDEO______________________

def process_matrix_video(matrix_code_video, current_time_matrix_code_video, position):
    # 1. Get frame
    frame_np_matrix = matrix_code_video.get_frame(current_time_matrix_code_video)
    
    # 2. Use OpenCV for scaling instead of Pygame (Multithreaded, GIL-free)
    # Note: cv2.resize expects (Width, Height). Since we haven't swapped axes yet,
    # the target is technically (1440, 250)
    resized_np = cv2.resize(frame_np_matrix, (250, 1440), interpolation=cv2.INTER_LINEAR)
    #resized_np = cv2.resize(frame_np_matrix, (250, 1440), interpolation=cv2.INTER_NEAREST)
    
#    # 3. Swap axes for Pygame format
#    matrix_np = np.swapaxes(resized_np, 0, 1)
#    
#    # 4. Return the raw numpy array
#    return matrix_np, position

    # 2026-10-03 OPTIMIZED APPROACH (MUCH FASTER)
    transposed_frame = cv2.transpose(resized_np)
    return transposed_frame, position

def calculate_layout_coordinates(video_w, video_h, other_video_w, actual_width, actual_height, layout_role, position=None):
    """
    Calculates scaling and dynamic coordinates across different screen resolutions.
    """
    scaling_factor = min(actual_width / video_w, actual_height / video_h)
    resized_w = int(video_w * scaling_factor)
    resized_h = int(video_h * scaling_factor)
    
    # Y is identically centered across all functions
    video_y = (actual_height - resized_h) // 2
    video_x = (actual_width - resized_w) // 2  # Default to center
    
    # Helper to convert your 3440x1440 absolute pixels into resolution-agnostic scaling percentages
    def scale_x(pixel_offset_at_3440):
        return int(actual_width * (pixel_offset_at_3440 / 3440.0))

    if layout_role == "left_square":
        if video_w in (1120, 1122) and other_video_w in (1120, 1122):
            video_x = scale_x(275)
        # Other conditions (1504, or 1120/832) safely default to centered.

    elif layout_role == "right_square":
        if other_video_w in (1120, 1122) and video_w in (1120, 1122):
            video_x = (actual_width - resized_w) - scale_x(275)
        elif video_w == 1120 or video_w == 1122:
            video_x = (actual_width - resized_w) # flush right

    elif layout_role == "vertical_triune":
        if position == 22:   
            video_x = scale_x(190)
        elif position == 33:
            if video_w == 832: video_x = (actual_width - resized_w) - scale_x(190)
            elif video_w == 928: video_x = (actual_width - resized_w) - scale_x(40)
            elif video_w == 960: video_x = (actual_width - resized_w) + scale_x(90)
        elif position == 44: 
            video_x = scale_x(30)
        elif position == 55:
            if video_w == 832: video_x = (actual_width - resized_w) - scale_x(190)
            elif video_w == 928: video_x = (actual_width - resized_w) - scale_x(20)
            elif video_w == 960: video_x = (actual_width - resized_w) + scale_x(90)
        elif position == 66: 
            video_x = scale_x(-85)
        elif position == 77:
            if video_w == 832: video_x = (actual_width - resized_w) - scale_x(190)
            elif video_w == 928: video_x = (actual_width - resized_w) - scale_x(20)
            elif video_w == 960: video_x = (actual_width - resized_w) + scale_x(90)

    return video_x, video_y, resized_w, resized_h

def get_glitch_thresholds(layout_role, video_w):
    """
    Returns (intensity, max_rand_1, max_rand_2) based on the original function specs.
    """
    if layout_role == "left_square" and video_w == 2560:
        return random.randint(1, 3), 9, 12
    elif layout_role in ["left_square", "right_square"]:
        return random.randint(1, 2), 12, 14
    else:  # vertical_triune
        return random.randint(1, 2), 15, 17

def apply_glitch_logic(frame, glitch_func, intensity, rand_inject_val):
    """
    Replaces the 15+ lines of identical glitch conditionals.
    """
    if rand_inject_val == 0:
        return glitch_func(frame, intensity)
    elif rand_inject_val == 1:
        return glitch_func(frame, intensity, color_offset=True)
    elif rand_inject_val == 2:
        return glitch_func(frame, intensity)
    elif rand_inject_val == 3:
        return glitch_func(frame, intensity, color_offset=True, scan_lines=True)
    elif rand_inject_val == 4:
        frame = glitch_func(frame, intensity)
        return glitch_func(frame, intensity * 0.8)
    elif rand_inject_val == 5:
        return glitch_func(frame, 1, scan_lines=True)
    return frame

def process_video_unified(video, current_time, actual_width, actual_height, layout_role, 
                          other_video_w=None, position=None, inject_glitch=0, 
                          glitch_type="vertical", glitch_func=None):

    video_w, video_h = video.size
    
    # 1. Scalable coordinates calculation
    video_x, video_y, resized_w, resized_h = calculate_layout_coordinates(
        video_w, video_h, other_video_w, actual_width, actual_height, layout_role, position
    )
    video_x_orig, video_y_orig = video_x, video_y

    frame_np = video.get_frame(current_time)

    # 2. X/Y Shake Displacement
    if random.randint(0, 10) == 5: video_x += random.randint(2, 5)
    if random.randint(0, 10) == 5: video_y += random.randint(2, 5)

    # 3. Shift Configuration
    random_shift_activate = random.randint(0, 6) if ENABLE_OBS_MODE_EFFECT == 1 else random.randint(0, 3)
    if random_shift_activate == 1:
        shift = random.randint(10, 20) if ENABLE_OBS_MODE_EFFECT == 1 else random.randint(5, 7)
    else:
        shift = 5 if ENABLE_OBS_MODE_EFFECT == 1 else 3

    # 4. Color Aberration (Shared perfectly across all scripts)
    if random.randint(0, 1) == 1:
        if random.randint(0, 1) == 0:
            aberrated = np.empty_like(frame_np)
            aberrated[:, :, 1] = frame_np[:, :, 1]
            aberrated[:, shift:, 0] = frame_np[:, :-shift, 0]
            aberrated[:, :shift, 0] = frame_np[:, -shift:, 0]
            aberrated[:, :-shift, 2] = frame_np[:, shift:, 2]
            aberrated[:, -shift:, 2] = frame_np[:, :shift, 2]

            if random.randint(0, 4) == 0:
                frame_np = cv2.addWeighted(frame_np, 0.4, aberrated, 0.6, 0)
            else:
                val_1, val_2 = random.uniform(0.3, 0.8), random.uniform(0.3, 0.8)
                total = val_1 + val_2
                frame_np = cv2.addWeighted(frame_np, val_1 / total, aberrated, val_2 / total, 0)
    else:
        # 5. Horizontal Glitch Injection
        if inject_glitch == 1 and glitch_type == "horizontal" and glitch_func:
            intensity, max1, max2 = get_glitch_thresholds(layout_role, video_w)
            inject_rand = random.randint(0, max1) if random.randint(0, 1) == 0 else random.randint(0, max2)
            frame_np = apply_glitch_logic(frame_np, glitch_func, intensity, inject_rand)

    # 6. Pixelation Effect
    if random.randint(0, 2) == 0:
        pixelation_active = random.randint(0, 6)
        if pixelation_active in (1, 2):
            block_size = 16 if pixelation_active == 1 else 8
            height, width = frame_np.shape[:2]
            downsampled = cv2.resize(frame_np, (max(1, width // block_size), max(1, height // block_size)), interpolation=cv2.INTER_AREA)
            pixelated = cv2.resize(downsampled, (width, height), interpolation=cv2.INTER_NEAREST)
            frame_np = cv2.addWeighted(frame_np, 0.4, pixelated, 0.6, 0)

    # 7. Heavy Matrix Swap
    #frame_np = np.swapaxes(frame_np, 0, 1)

    # 2026-10-03 OPTIMIZED APPROACH (MUCH FASTER)
    transposed_frame = cv2.transpose(frame_np)
    frame_np = transposed_frame

    # 8. Vertical Glitch Injection
    if inject_glitch == 1 and glitch_type == "vertical" and glitch_func:
        intensity, max1, max2 = get_glitch_thresholds(layout_role, video_w)
        inject_rand = random.randint(0, max1) if random.randint(0, 1) == 0 else random.randint(0, max2)
        frame_np = apply_glitch_logic(frame_np, glitch_func, intensity, inject_rand)

    # 9. Resize & Return
    if layout_role == "left_square" and video_w == 2560:
        return frame_np, (video_x, video_y), (resized_w, resized_h)

#    resized_np = cv2.resize(frame_np, (resized_h, resized_w), interpolation=cv2.INTER_LANCZOS4) #SLOW
#    resized_np = cv2.resize(frame_np, (resized_h, resized_w), interpolation=cv2.INTER_NEAREST)  #FAST
#    resized_np = cv2.resize(frame_np, (resized_h, resized_w), interpolation=cv2.INTER_LINEAR)    #MEDIUM
#    return resized_np, (video_x, video_y), (resized_w, resized_h)
    return frame_np, (video_x, video_y), (resized_w, resized_h)

cv2.setNumThreads(0)
def resize_np_arr(frame_np, position, dimensions, buffer):
    resized_w, resized_h = dimensions
    cv2.resize(frame_np, (resized_h, resized_w), dst=buffer, interpolation=cv2.INTER_LINEAR)
    return buffer, position, dimensions

#______________________________________________________________________________________________________
#___BACKGROUND THREAD FUNCTIONS________

def video_loader_worker_left(filenames, video_queue):
    for fname in filenames:
        try:
            # Drop MoviePy, use the OpenCV wrapper
            clip = FastVideoClip(fname) 
            #video_queue.put(clip)
            video_queue.put((fname, clip)) 
        except Exception as e:
            print(f"[ERROR] Failed to load {fname}: {e}")
    #video_queue.put(None)
    video_queue.put((None, None))

def video_loader_worker_right(filenames, video_queue):
    for fname in filenames:
        try:
            # Drop MoviePy, use the OpenCV wrapper
            clip = FastVideoClip(fname) 
            #video_queue.put(clip)
            video_queue.put((fname, clip)) 
        except Exception as e:
            print(f"[ERROR] Failed to load {fname}: {e}")
    #video_queue.put(None)
    video_queue.put((None, None))

def video_loader_worker_triune(filenames, video_queue):
    for fname in filenames:
        try:
            # Drop MoviePy, use the OpenCV wrapper
            clip = FastVideoClip(fname) 
            #video_queue.put(clip)
            video_queue.put((fname, clip)) 
        except Exception as e:
            print(f"[ERROR] Failed to load {fname}: {e}")
    #video_queue.put(None)
    video_queue.put((None, None))

#______________________________________________________________________________________________________________
#___MAIN_LOOP_FUNCTION_________________

def play_video_fullscreen(audio_path, playlist_index=0, playlist_type="CORE"):
    try:

        #______________________________________________________________________________________________________
        #___DISPLAY____________________________

        SCREEN_WIDTH  = 3440
        SCREEN_HEIGHT = 1440
        #flags = pygame.DOUBLEBUF | pygame.HWSURFACE | pygame.FULLSCREEN
        flags = pygame.OPENGL | pygame.DOUBLEBUF | pygame.FULLSCREEN

        pygame.display.set_caption("Lightwave Tech")
        screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags, vsync=1)
        screen_info = pygame.display.Info()
        actual_width, actual_height = screen_info.current_w, screen_info.current_h
        print(f"actual_width: {actual_width}")
        print(f"actual_height: {actual_height}")

        #______________________________________________________________________________________________________
        #___MASK_______________________________

        # Initialize this ONCE before your main game/render loop
        mask_base_folder = config.get("image_filepaths", {}).get("mask_layer_folder")

        mask_filepath_1 = "console_circuitry_layer_matrix_v3_1440p.png"
        mask_image_1 = pygame.image.load(f"{mask_base_folder}/{mask_filepath_1}").convert_alpha()

        #mask_filepath_2 = "2nd_layer_circuitry_layer_1440p.png"
        mask_filepath_2 = "v2_2nd_layer_circuitry_layer_1440p.png"
        mask_image_2 = pygame.image.load(f"{mask_base_folder}/{mask_filepath_2}").convert_alpha()

        #mask_filepath_3 = "console_circuitry_layer_matrix_v3_1440p_shader_ui.png"
        #mask_filepath_3 = "console_circuitry_layer_matrix_v4_1440p_shader_ui.png"
        #mask_filepath_3 = "console_circuitry_layer_matrix_v5_1440p_shader_ui.png"
        #mask_filepath_3 = "console_circuitry_layer_matrix_v6_1440p_shader_ui.png"
        mask_filepath_3 = "console_circuitry_layer_matrix_v7_1440p_shader_ui.png"

        mask_image_3_shader_ui = pygame.image.load(f"{mask_base_folder}/{mask_filepath_3}").convert_alpha()

        mask_filepath_4 = "console_circuitry_layer_matrix_v3_1440p_shader_ui_2.png"
        mask_image_4_shader_ui = pygame.image.load(f"{mask_base_folder}/{mask_filepath_4}").convert_alpha()

        #______________________________________________________________________________________________________
        #___FONT_&_MATRIX______________________

        #my_font = pygame.font.Font("unifont-17.0.03.otf", 24)

        #matrix_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/'  # Customizable char set
        matrix_chars = """ησιηεak̲a͆s̲h̷r̼eͦc̶oͦr̸d̷s̴主קוהלתΛΥΦΜὩαωγ׆Ę͝└▹♪μ⋈≢x∞≈Ψ√Δ∴{ΣΨΦαφωαγëΦ∞Ω=α+ωℵ≠ℵ^ℵ∑+Ωa1Δ(ωᵢⱼ<|Ω|α|ASωₛNOUS;ω⊟▲⎓◌ø⪖⩖(⇌ς)☉=Ψξ⊹⋆∂(λaλα⚛{αω{Δ}⚤Ξ={π{ΔΔΞΣΞ⊬Ω♂♀ოєĩĩєv=λfΨ=mΨƒλΩΣδ{Δαωℵ₀∨∞ℵ→π∑=Πkᵢ=R_iΦ=∮E⋅dℓ∮SB⋅dAμλOτEгEnTSΤρεαNSέԳþᚫᛝᚫᚷᚱ∇ΔƤƔ⇀∮Ϭ⩓∫μлε∑ƈ⊥Ƨψϗ⍶〈⩰⩱ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>"""
        overlay_color_1 = (0, 255, 0, 200)  # Green with 50% alpha (0-255); adjust for subtlety
        overlay_color_2 = (240, 70, 195, 200)  # Green with 50% alpha (0-255); adjust for subtlety

        # Font setup (adjust size/path as needed; use None for default system font)
        #font = pygame.font.SysFont("Arial", 24)
        debug_font = pygame.font.SysFont("Arial", 24)

        """font = pygame.font.SysFont('courier', 25)
        large_font = pygame.font.SysFont("Arial", 120)
        small_font = pygame.font.SysFont("Arial", 50)
        tiny_font  = pygame.font.SysFont("Arial", 25)

        font_1 = pygame.font.SysFont('courier', 16, bold=True)
        font_2 = pygame.font.SysFont('courier', 18, bold=True)
        font_3 = pygame.font.SysFont('courier', 20, bold=True)
        font_4 = pygame.font.SysFont('courier', 22, bold=True)
        font_5 = pygame.font.SysFont('courier', 24, bold=True)
        font_6 = pygame.font.SysFont('courier', 26, bold=True)
        font_7 = pygame.font.SysFont('courier', 28, bold=True)
        font_8 = pygame.font.SysFont('courier', 30, bold=True)
        font_9 = pygame.font.SysFont('courier', 32, bold=True)"""

        font = pygame.font.Font("unifont-17.0.03.otf", 25)
        large_font = pygame.font.Font("unifont-17.0.03.otf", 120)
        small_font = pygame.font.Font("unifont-17.0.03.otf", 50)
        tiny_font  = pygame.font.Font("unifont-17.0.03.otf", 25)

        font_1 = pygame.font.Font("unifont-17.0.03.otf", 16)
        font_2 = pygame.font.Font("unifont-17.0.03.otf", 18)
        font_3 = pygame.font.Font("unifont-17.0.03.otf", 20)
        font_4 = pygame.font.Font("unifont-17.0.03.otf", 22)
        font_5 = pygame.font.Font("unifont-17.0.03.otf", 24)
        font_6 = pygame.font.Font("unifont-17.0.03.otf", 26)
        font_7 = pygame.font.Font("unifont-17.0.03.otf", 28)
        font_8 = pygame.font.Font("unifont-17.0.03.otf", 30)
        font_9 = pygame.font.Font("unifont-17.0.03.otf", 32)

        MATRIX_GLYPH_CACHE = {1: {}, 2: {}}
        matrix_fonts_list = [font_1, font_2, font_3, font_4, font_5, font_6, font_7, font_8, font_9]

        print("Pre-rendering Matrix Glyphs...")
        for f_idx, fnt in enumerate(matrix_fonts_list):
            MATRIX_GLYPH_CACHE[1][f_idx] = {}
            MATRIX_GLYPH_CACHE[2][f_idx] = {}
            for char in set(matrix_chars):
                # Cache Color 1
                surf1 = fnt.render(char, True, overlay_color_1[:3]).convert_alpha()
                surf1.set_alpha(overlay_color_1[3])
                MATRIX_GLYPH_CACHE[1][f_idx][char] = surf1
        
                # Cache Color 2
                surf2 = fnt.render(char, True, overlay_color_2[:3]).convert_alpha()
                surf2.set_alpha(overlay_color_2[3])
                MATRIX_GLYPH_CACHE[2][f_idx][char] = surf2

        SYSFONT_CACHE = {}
        def get_sysfont(name, size):
            key = (name, size)
            if key not in SYSFONT_CACHE:
                SYSFONT_CACHE[key] = pygame.font.SysFont(name, size)
            return SYSFONT_CACHE[key]

        #______________________________________________________________________________________________________
        #___CONSOLE_INIT_______________
        if CONSOLE:
            # Initialize filestream_console
            console_filestream = FileStreamConsole("DATA/console_filestream_data.txt", max_history=100)

            # Initialize console catcher and overwrite sys.stdout            
            console_stdout = PygameConsole()
            sys.stdout = console_stdout

            # Setup the console font
            console_font_1 = pygame.font.SysFont("Consolas", 12)
            console_font_2 = pygame.font.SysFont("Consolas", 22)
#            console_font_3 = pygame.font.SysFont("Consolas", 18)

#            console_font_1 = pygame.font.Font("unifont-17.0.03.otf", 12)
#            console_font_2 = pygame.font.Font("unifont-17.0.03.otf", 22)
            console_font_3 = pygame.font.Font("unifont-17.0.03.otf", 20)
            console_font_4 = pygame.font.Font("unifont-17.0.03.otf", 28)

            #console_line_height = console_font.get_linesize()

            # Calculate how many lines can fit on the screen vertically
            #console_max_lines_on_screen = 350 // console_line_height

            console_surface_1 = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), flags=pygame.SRCALPHA)
            console_surface_1.set_colorkey((0, 0, 0))
            console_surface_mask = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), flags=pygame.SRCALPHA)
            console_surface_mask.blit(mask_image_3_shader_ui, (0, 0))

        #______________________________________________________________________________________________________
        #___Pygame RENDER_TEXTURE______

        # 1. Create a blank off-screen surface the size of your window
        combined_surface = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), flags=pygame.SRCALPHA)

        #______________________________________________________________________________________________________
        #___ModernGL_INIT______________

        # Initialize ModernGL Context
        main_ctx = moderngl.create_context()

        print()
        print("Version Info")
        print("------------")
        print('ModernGL   :', moderngl.__version__)
        print('vendor     :', main_ctx.info['GL_VENDOR'])
        print('renderer   :', main_ctx.info['GL_RENDERER'])
        print('version    :', main_ctx.info['GL_VERSION'])
        print('Max Tex    :', main_ctx.info['GL_MAX_TEXTURE_IMAGE_UNITS'])
        print('Max Cbd Tex:', main_ctx.info['GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS'])
        print('code       :', main_ctx.version_code)
        print('python     :', sys.version)
        print('platform   :', sys.platform)
        print()

        # BEFORE THE LOOP: Create empty texture
        render_texture = main_ctx.texture((SCREEN_WIDTH, SCREEN_HEIGHT), 4)
        render_texture.swizzle = 'BGRA'

        if CONSOLE:
            console_texture_1 = main_ctx.texture((SCREEN_WIDTH, SCREEN_HEIGHT), 4)
            console_texture_1.swizzle = 'BGRA'
            console_texture_mask = main_ctx.texture((SCREEN_WIDTH, SCREEN_HEIGHT), 4)
            console_texture_mask.swizzle = 'BGRA'
        
        # NOTE: No DEPTH_TEST is needed for Shadertoy raymarching,
        # since it's just drawing flat pixels to the screen.

        #______________________________________________________________________________________________________
        # ___LOAD_CONFIG_FROM_CACHE____
        cached_vars = config.load_paths_from_cache()

        # dynamically shuffled per run
        random.shuffle(cached_vars["neural_indices_filenames_all"])

        # Assign out to your isolated variables exactly as they were named originally
        neural_indices_filenames_all     = cached_vars.get("neural_indices_filenames_all", [])
        video_filenames_all_left         = cached_vars.get("video_filenames_all_left", [])
        video_filenames_left_replacement = cached_vars.get("video_filenames_left_replacement", [])
        video_filenames_static           = cached_vars.get("video_filenames_static", [])
        video_base_filenames_static      = cached_vars.get("video_base_filenames_static", [])
        video_filenames_all_right        = cached_vars.get("video_filenames_all_right", [])
        video_filenames_all_vertical     = cached_vars.get("video_filenames_all_vertical", [])

        #______________________________________________________________________________________________________
        #___LOAD_NEURAL_JSON_LEFT______

        log_accumulated_video_filenames_left = []

        video_filenames_left = video_filenames_all_left[:]
        num_videos_left = len(video_filenames_left)

        unique_top_signal_indices = load_neural_indices_json(random.choice(neural_indices_filenames_all))
        print(f"PRIOR 2026-04-28_EXPERIMENT: {len(unique_top_signal_indices)}")

        #__2026-04-28_EXPERIMENT
        unique_top_signal_indices_rnd = [random.randint(1, num_videos_left-1) for _ in range(4000)]
        print(f"RND 2026-04-28_EXPERIMENT: {len(unique_top_signal_indices_rnd)}")
#        unique_top_signal_indices = list(dict.fromkeys(unique_top_signal_indices[:] + unique_top_signal_indices_rnd[:]))
        unique_top_signal_indices = list(dict.fromkeys(unique_top_signal_indices[:]))
        random.shuffle(unique_top_signal_indices)
        print(f"2026-04-28_EXPERIMENT: {len(unique_top_signal_indices)}")

        random.shuffle(video_filenames_left)
        unique_top_signal_filenames = []
        for index in unique_top_signal_indices:
            #print(f"{index}/{len(video_filenames_left)}")
            if index >= len(video_filenames_left):
                #print(f"Skipping invalid int: {index}")
                index = random.randint(1, len(video_filenames_left)-1)
                #print(f"New index for replacement: {index}")
            unique_top_signal_filenames.append(video_filenames_left[index])

        video_filenames_left = unique_top_signal_filenames
        print(f"{len(video_filenames_left)}")

        #______________________________________________________________________________________________________
        #___LOAD_NEURAL_JSON_RIGHT_____

        log_accumulated_video_filenames_right = []

        video_filenames_right = video_filenames_all_right[:]
        num_videos_right = len(video_filenames_right)

        unique_top_signal_indices = load_neural_indices_json(random.choice(neural_indices_filenames_all))
        print(f"PRIOR 2026-04-28_EXPERIMENT: {len(unique_top_signal_indices)}")
  
        #__2026-04-28_EXPERIMENT
        unique_top_signal_indices_rnd = [random.randint(1, num_videos_right-1) for _ in range(4000)]
        print(f"RND 2026-04-28_EXPERIMENT: {len(unique_top_signal_indices_rnd)}")
#        unique_top_signal_indices = list(dict.fromkeys(unique_top_signal_indices[:] + unique_top_signal_indices_rnd[:]))
        unique_top_signal_indices = list(dict.fromkeys(unique_top_signal_indices[:]))
        random.shuffle(unique_top_signal_indices)
        print(f"2026-04-28_EXPERIMENT: {len(unique_top_signal_indices)}")

        random.shuffle(video_filenames_right)
        unique_top_signal_filenames = []
        for index in unique_top_signal_indices:
            #print(f"{index}/{len(video_filenames_right)}")
            if index >= len(video_filenames_right):
                #print(f"Skipping invalid int: {index}")
                index = random.randint(1, len(video_filenames_right)-1)
                #print(f"New index for replacement: {index}")
            unique_top_signal_filenames.append(video_filenames_right[index])

        video_filenames_right = unique_top_signal_filenames
        print(f"{len(video_filenames_right)}")

        #______________________________________________________________________________________________________
        #___SELECT_200_ENTRIES_LEFT____

        # Calculate the start index for the main list
        max_start_index = max(0, len(video_filenames_left) - 200)
        start_index = random.randint(0, max_start_index)
        print(f"start_index: {start_index}")
        video_filenames_left = video_filenames_left[start_index : start_index + 200]
        print(f"{len(video_filenames_left)}")

        #___FRESH_REPLACEMENT_POOL_FOR_STATIC___

        print(f"FRESH_BEFORE: {len(video_filenames_left_replacement)}")
        # Filter out items in video_filenames_left
        random.shuffle(video_filenames_left_replacement)
        video_filenames_left_replacement_src = []
        for each in video_filenames_left_replacement:
            if each not in video_filenames_left:
                video_filenames_left_replacement_src.append(each)
        random.shuffle(video_filenames_left_replacement_src)
        print(f"FRESH_AFTER: {len(video_filenames_left_replacement_src)}")

        # Calculate the start index for the replacement list
        max_start_index = max(0, len(video_filenames_left_replacement_src) - 200)
        start_index = random.randint(0, max_start_index)
        print(f"replacement_start_index: {start_index}")

        video_filenames_left_replacement_src = video_filenames_left_replacement[start_index : start_index + 200]
        print(f"video_filenames_left_replacement_src: {len(video_filenames_left_replacement_src)}")

        if SHIFT_STATIC == 1:
            video_filenames_left = Shift_Static_Position(video_filenames_left, \
                                                         video_base_filenames_static, \
                                                         video_filenames_left_replacement_src)

        #______________________________________________________________________________________________________
        #___SELECT_200_ENTRIES_RIGHT___

        max_start_index = max(0, len(video_filenames_right) - 200)
        start_index = random.randint(0, max_start_index)
        video_filenames_right = video_filenames_right[start_index : start_index + 200]

        num_videos_left  = len(video_filenames_left)
        num_videos_right = len(video_filenames_right)
        print(f"FOO_LEFT: {num_videos_left}")
        print(f"FOO_RIGHT: {num_videos_right}")

        #___LOG___ >> moved at the end
        #Log_Neural_Indices(video_filenames_left)
        #Log_Neural_Indices(video_filenames_right)

        #___DYNAMIC_VIDEO_DURATION/PLAYBACK_SPEED___
        # MAIN light_wave_tech.py
        # only needs to be done for the left side since the right side is identical
        video_durations = []
        video_playback_speeds = []  # <--- NEW: Keep track of the exact speeds!
        for fname in video_filenames_left:
            if "g_horizontal_static" in Path(fname).parts:
                video_duration = 6.0
                video_playback_speeds.append(1.0) # Default speed for static
            else:
                video_default_duration = 12.0
                speed = random.uniform(2.0, 2.3)
                video_duration = video_default_duration / speed
                video_playback_speeds.append(speed) # Save the speed for this specific video
            video_durations.append(video_duration)

        #______________________________________________________________________________________________________
        #___LOAD CACHE_________________

        # --- SETUP THE SLIDING CACHE (QUEUE) ---
        MAX_CACHE_SIZE = 5

        # Start the background loader thread
        video_queue_left = queue.Queue(maxsize=MAX_CACHE_SIZE)
        print(f"Starting background loader thread LEFT (Max cache: {MAX_CACHE_SIZE} videos)...")
        loader_thread_left = threading.Thread(
            target=video_loader_worker_left, 
            args=(video_filenames_left, video_queue_left), 
            daemon=True
        )
        loader_thread_left.start()

        # Start the background loader thread
        video_queue_right = queue.Queue(maxsize=MAX_CACHE_SIZE)
        print(f"Starting background loader thread RIGHT (Max cache: {MAX_CACHE_SIZE} videos)...")
        loader_thread_right = threading.Thread(
            target=video_loader_worker_right, 
            args=(video_filenames_right, video_queue_right), 
            daemon=True
        )
        loader_thread_right.start()

        random.shuffle(video_filenames_all_vertical)
        video_filenames_vertical_triune = video_filenames_all_vertical[:200]

        # Start the background loader thread
        video_queue_triune = queue.Queue(maxsize=MAX_CACHE_SIZE)
        print(f"Starting background loader thread TRIUNE (Max cache: {MAX_CACHE_SIZE} videos)...")
        loader_thread_triune = threading.Thread(
            target=video_loader_worker_triune, 
            args=(video_filenames_vertical_triune, video_queue_triune), 
            daemon=True
        )
        loader_thread_triune.start()

        #__________1st LEFT________________________________________

        # Get the very first video to start the player
        # (This will block for a fraction of a second until the thread loads the first clip)
        #video_left = video_queue_left.get()
        fname_left, video_left = video_queue_left.get()
        log_accumulated_video_filenames_left.append(fname_left)
        if video_left is None:
            print("Error loading initial video (LEFT).")
            return

        video_width_left, video_height_left = video_left.size

        #__________1st RIGHT_______________________________________

        #video_right = video_queue_right.get()
        fname_right, video_right = video_queue_right.get()
        log_accumulated_video_filenames_right.append(fname_right)
        if video_right is None:
            print("Error loading initial video (RIGHT).")
            return

        video_width_right, video_height_right = video_right.size

        #__________1st TRIUNE_______________________________________

        #video_vertical_triune_1 = video_queue_triune.get()
        fname_vertical_triune_1, video_vertical_triune_1 = video_queue_triune.get()
        log_accumulated_video_filenames_right.append(fname_vertical_triune_1)
        if video_vertical_triune_1 is None:
            print("Error loading initial video (TRIUNE_1).")
            return
        video_width_vertical_triune_1, video_height_vertical_triune_1 = video_vertical_triune_1.size

        """video_vertical_triune_2 = video_queue_triune.get()
        if video_vertical_triune_2 is None:
            print("Error loading initial video (TRIUNE_2).")
            return
        video_width_vertical_triune_2, video_height_vertical_triune_2 = video_vertical_triune_2.size

        video_vertical_triune_3 = video_queue_triune.get()
        if video_vertical_triune_3 is None:
            print("Error loading initial video (TRIUNE_3).")
            return
        video_width_vertical_triune_3, video_height_vertical_triune_3 = video_vertical_triune_3.size"""

        #______________________________________________________________________________________________________
        #___VARIOUS_VARS_______________

        screen_w, screen_h = screen.get_size()

        clock = pygame.time.Clock()
        running = True
        exit_signal = False
        total_frame_count = 0

        bass_hit_count  = 0
        snare_hit_count = 0
        hihat_hit_count = 0
        
        previous_amplitude_bass  = 0 
        previous_amplitude_snare = 0
        previous_amplitude_hihat = 0
        bass_snare_delta  = 0
        bass_hihat_delta  = 0
        snare_hihat_delta = 0

        current_time_left   = 0
        current_time_center = 0
        current_time_right  = 0

        matrix_code_video_base_folder = config.get("video_filepaths", {}).get("video_folder_matrix_code")
        matrix_code_videopath_left = f"{matrix_code_video_base_folder}/matrix_code_left_mask_960p.mp4"
        matrix_code_video_left = FastVideoClip(matrix_code_videopath_left)
        matrix_code_video_left_width, matrix_code_video_left_height = matrix_code_video_left.size
        current_time_matrix_code_video_left = 0

        matrix_code_videopath_right = f"{matrix_code_video_base_folder}/matrix_code_right_mask_960p.mp4"
        matrix_code_video_right = FastVideoClip(matrix_code_videopath_right)
        matrix_code_video_right_width, matrix_code_video_right_height = matrix_code_video_right.size
        current_time_matrix_code_video_right = 0

        left_horizontal_fullscreen = 0
        video_playback_counter_left  = 0
        video_playback_counter_right = 0
        random_inject_glitch_interval_left  = 4
        random_inject_glitch_interval_right = 4

        random_text_string_1 = random.choice(inspirational_words_1).upper()
        random_text_string_2 = random.choice(inspirational_words_2).upper()
        random_text_string_3 = random.choice(inspirational_words_combined).upper()
        render_text_flag = 0
        text_pos_flag = random.randint(1, 6)
        text_pos_offset_x = random.randint(300, 700)
        text_pos_offset_y = random.randint(200, 400)

        toggle_sound_effect = 0
        last_matrix_code_timing = 0

        glitch_type_left  = "vertical"
        glitch_type_right = "vertical"

        fps_debug = []
        skipped_frames = 0

        #______________________________________________________________________________________________________
        #___LOAD_AUDIO_SYNC_DATA_______

        print("AUDIO: Loading data...")
        
        if ".mp3" in audio_path:
            audio_len = get_audio_len_mp3(audio_path)
        else:
            audio_len = get_audio_len(audio_path)

        print(f"audio_len: {audio_len}")
        audio_time_elapsed = 0

        # FOR MP3
        #anim_data_bass_filepath  = f"{audio_sync_data_base_folder}/{audio_base_filename}_bass_keyframes.csv"
        #anim_data_snare_filepath = f"{audio_sync_data_base_folder}/{audio_base_filename}_snare_keyframes.csv"
        #anim_data_hihat_filepath = f"{audio_sync_data_base_folder}/{audio_base_filename}_hihat_keyframes.csv"

        audio_base_filename = audio_path.replace("\\", "/")
        audio_base_filename = audio_base_filename.split("/")
        audio_base_filename = audio_base_filename[len(audio_base_filename)-1]
        audio_base_filename = audio_base_filename.split(".wav")
        audio_base_filename = audio_base_filename[0]
        print(f"audio_base_filename = {audio_base_filename}")

        anim_data_bass_filepath  = f"{audio_sync_data_base_folder}/{audio_base_filename}_bass_keyframes.csv"
        anim_data_1 = load_animation_data(anim_data_bass_filepath)
        anim_data_index_1 = 0
        anim_max_index_1 = len(anim_data_1) - 1

        anim_data_snare_filepath = f"{audio_sync_data_base_folder}/{audio_base_filename}_snare_keyframes.csv"
        anim_data_2 = load_animation_data(anim_data_snare_filepath)
        anim_data_index_2 = 0
        anim_max_index_2 = len(anim_data_2) - 1

        anim_data_hihat_filepath = f"{audio_sync_data_base_folder}/{audio_base_filename}_hihat_keyframes.csv"
        anim_data_3 = load_animation_data(anim_data_hihat_filepath)
        anim_data_index_3 = 0
        anim_max_index_3 = len(anim_data_3) - 1

        #______________________________________________________________________________________________________
        #___AUDIO EFFECT SETUP_________

        if ENABLE_AUDIO_EFFECTS == 1:
            audio_effect_pool = []
            for i in range(50):
                audio_effect_random_num = random.randint(1, 26)
                audio_effect_random_filepath = f"audio_effects_wav/002/normalized/audio_effect_{audio_effect_random_num:03d}.wav"
                print(f"audio_effect_random_filepath: {audio_effect_random_filepath}")
                audio_effect_pool.append(pygame.mixer.Sound(audio_effect_random_filepath))
            print(f"len_audio_effect_pool: {len(audio_effect_pool)}")
            random_audio_effect = audio_effect_pool.pop(random.randrange(len(audio_effect_pool)))

        audio_effect_is_playing = False
        audio_effect_times_played = 0
        audio_effect_channel = None

        #______________________________
        #___INIT/LOAD MUSIC____________

        if TEST_INSTRUMENTAL == 1:
            audio_base_filename = audio_path.replace("\\", "/")
            audio_base_filename = audio_base_filename.split("/")
            audio_base_filename = audio_base_filename[len(audio_base_filename)-1]
            audio_base_filename = audio_base_filename.split(".wav")
            audio_base_filename = audio_base_filename[0]
            audio_path = audio_path.replace(f"{audio_base_folder}/{audio_base_filename}.wav", \
                                            f"{audio_instrumental_base_folder}/{audio_base_filename}_Instrumental.wav")


#        if playlist_type == "CORE":
#            my_song = SUNO_v5_load_and_lufs_normalize_in_memory(audio_path, target_lufs=-14.0)
#        else:
#            my_song = SUNO_v6_load_and_lufs_normalize_in_memory(audio_path, target_lufs=-14.0)



#        my_song_array, sample_rate, audio_len_seconds = SUNO_v6_load_and_lufs_normalize(audio_path, target_lufs=-15.0, bass_db=9.5, mid_db=0.0, treble_db=2.5)

        # JBL
#        my_song_array, sample_rate, audio_len_seconds = SUNO_v6_load_and_lufs_normalize(audio_path, target_lufs=-15.0, bass_db=9.5, mid_db=0.5, treble_db=2.7)

        # AKG
        my_song_array, sample_rate, audio_len_seconds = SUNO_v6_load_and_lufs_normalize(audio_path, target_lufs=-15.0, bass_db=7.8, mid_db=1.8, treble_db=3.5)

        ## DIFFERENT APPROACH
#        my_song_array, sample_rate, audio_len_seconds = SUNO_v6_load_and_lufs_normalize(audio_path, target_lufs=-15.0, bass_db=0.0, mid_db=-6.0, treble_db=-4.3)


        inferred_channels = my_song_array.shape[1] if my_song_array.ndim > 1 else 1
        inferred_dtype = my_song_array.dtype.name

        # 1. Query the WASAPI host API directly for the default output device
        try:
            # Retrieve a tuple of all available host APIs
            all_hostapis = sd.query_hostapis()

            # Find the dictionary where 'WASAPI' is in the name
            wasapi_info = next((api for api in all_hostapis if 'WASAPI' in api['name']), None)

            # If we didn't find it, trigger the except block below
            if wasapi_info is None:
                raise ValueError("WASAPI is not available on this system.")

            wasapi_out_index = wasapi_info['default_output_device']
    
            # 2. Get info on that specific device for your print statements
            device_info = sd.query_devices(wasapi_out_index)
    
            print(f"--- CURRENT PLAYBACK SETTINGS ---")
            print(f"Device Name : {device_info['name']}")
            print(f"Host API    : {wasapi_info['name']} ({wasapi_out_index})")
            print(f"Sample Rate : {sample_rate} Hz (Requested)")
            print(f"Channels    : {inferred_channels}")
            print(f"Format      : {inferred_dtype}")
            print(f"Latency     : {device_info['default_low_output_latency']*1000:.1f} ms - {device_info['default_high_output_latency']*1000:.1f} ms")
            print(f"---------------------------------")

            # 3. You can either set it as the global default:
            sd.default.device = wasapi_out_index
            sd.default.latency = 0.117
    
        except ValueError:
            print("WASAPI is not available on this system.")

        #______________________________
        #___INTRO______________________

        random_intro_title = Get_Random_Intro_Title()
        print(f"random_intro_title: {random_intro_title}")

        #helper_functions.song_title_intro(main_ctx, SCREEN_WIDTH, SCREEN_HEIGHT, audio_path, current_audio_file_idx=0, num_audio_files=0)
        helper_functions.intro_countdown(main_ctx, SCREEN_WIDTH, SCREEN_HEIGHT)
        #sys.exit()
        #print(f"============DOODODODODODODODO: {len(console_stdout.get_buffer_contents())}")

        #______________________________
        #___SHADER_CACHE/MANAGER_______
        shader_cache = shader_manager.ShaderCache(main_ctx)
        
        if playlist_index >= 0:
            random_timeline = random.randint(0, 3)
            if random_timeline == 0:
                timeline_json_filepath = "DATA/timelines/timeline_cyan_intro.json"
                console_color_intro = CYAN_LIGHT
            elif random_timeline == 1:
                timeline_json_filepath = "DATA/timelines/timeline_magenta_intro.json"
                console_color_intro = MAGENTA_LIGHT
            elif random_timeline == 2:
                timeline_json_filepath = "DATA/timelines/timeline_rainbow_1_intro.json"
                console_color_intro = MAGENTA_LIGHT
            elif random_timeline == 3:
                timeline_json_filepath = "DATA/timelines/timeline_rainbow_2_intro.json"
                console_color_intro = MAGENTA_LIGHT
        else:
            timeline_json_filepath = "DATA/timelines/v2_timeline_glitch_prod.json"
            console_color_intro = CYAN_LIGHT

        #timeline_json_filepath = "DATA/timelines/timeline_rainbow_1_intro.json"
        #console_color_intro = MAGENTA_LIGHT

        #console_color_intro = MAGENTA_LIGHT
        #timeline_json_filepath = "DATA/timelines/timeline_test.json"
        #timeline_json_filepath = "DATA/timelines/timeline_magenta_intro.json"
        #timeline_json_filepath = "DATA/timelines/timeline_rainbow_2_intro.json"


        timeline_manager = shader_manager.ShaderTimelineManager(
            DEBUG,
            config_shader_path_glsl,
            main_ctx,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            audio_path,
            timeline_json_filepath,
            True,
            shader_cache,
            video_playback_speeds,
            video_durations
        )


# USE THIS TO DEBUG
#        timeline_manager = shader_manager.ShaderTimelineManager(
#            DEBUG,
#            config_shader_path_glsl,
#            main_ctx,
#            SCREEN_WIDTH,
#            SCREEN_HEIGHT,
#            audio_path,
#            "DEBUG/debug_resolved_timeline_9c69432d-1db1-4678-838e-9fc61683565f.json",
#            False,
#            shader_cache,
#            video_playback_speeds,
#            video_durations
#        )


        song_rating_manager = SongRatingManager()

        #______________________________________________________________________________________________________
        #___MAIN_LOOP__________________

        executor = ThreadPoolExecutor(max_workers=4)
        start_time = time.perf_counter()
        last_loop_time = start_time

        #______________________________
        #___START MUSIC________________

        #music_channel = my_song.play()
        #pygame.mixer.music.play()
        #pygame.mixer.music.set_volume(0.0)

        # This directly interfaces with WASAPI/DirectSound
        sd.play(my_song_array, samplerate=sample_rate)

        # --- A/V SYNC COMPENSATION ---
        # 0.05 = 50 milliseconds. 
        #AV_SYNC_OFFSET = -0.065
        #AV_SYNC_OFFSET = -0.090
        #AV_SYNC_OFFSET = -0.105
        #AV_SYNC_OFFSET = -0.114

        AV_SYNC_OFFSET = -0.117
        
        #AV_SYNC_OFFSET = -0.119
        #AV_SYNC_OFFSET = -0.122

        #AV_SYNC_OFFSET = 0.0

        while running:

            total_frame_count += 1          

            # --- CALCULATE DELTA TIME ---
            current_perf_time = time.perf_counter()
            dt = current_perf_time - last_loop_time
            last_loop_time = current_perf_time

            # --- Use the tracked time for sync ---
            # Calculate time in seconds for timeline_manager
            current_pygame_time = (current_perf_time - start_time) + AV_SYNC_OFFSET
            
            # Calculate time in milliseconds for audio sync
            audio_time_elapsed = int(((current_perf_time - start_time) + AV_SYNC_OFFSET) * 1000)

            # --- FIX: REMOVE PER-FRAME RANDOMIZATION ---
            # video_playback_speed = random.uniform(1.9, 2.5) 

            # --- USE THE PRE-CALCULATED SPEED FOR THIS EXACT VIDEO ---
            if video_playback_counter_left < len(video_playback_speeds):
                video_playback_speed = video_playback_speeds[video_playback_counter_left]
            else:
                video_playback_speed = 2.2 # Fallback
            #print(f"______________ {video_playback_speed} _______")
            
            futures = []
            futures_matrix = []
            futures_resize_np_arr = []

            # ADD outro
            if audio_time_elapsed >= (audio_len*1000)+2500:
                running = False

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    # ESC just stops the current song (moves to the next one)
                    if event.key == pygame.K_ESCAPE:
                        running = False

                    # 'x' stops the current song AND sends the kill signal
                    if event.key == pygame.K_x:
                        exit_signal = True
                        running = False 

                    if event.key == pygame.K_KP_PLUS:
                        song_rating_manager.change_song_rating(audio_path, 1)

                    if event.key == pygame.K_KP_MINUS:
                        song_rating_manager.change_song_rating(audio_path, -1)

                    # KEYPAD ETC. MAPPINGS 2026-08-16: 
                    # https://aistudio.google.com/app/prompts/1ctO3OYDyyioOv57ClTba9fmYKR2zIX_v
                    #if event.key == pygame.K_KP1:
                    #if event.key == pygame.K_KP2:
 

            if running:

                if total_frame_count % 55 == 0:
                    random_code_seq = helper_functions.get_random_code_sequence()
                    print(f"{random_code_seq}")
                if total_frame_count % 105 == 0: 
                    random_poem_seq = helper_functions.get_random_poem_sequence()
                    print(f"{random_poem_seq}")

                #______________________________________________________________________________________________________
                #___AUDIO_SYNC_________
                # 1. Determine the glitch/zoom effect ONCE for the entire frame

                apply_glitch_1 = apply_glitch_2 = apply_glitch_3 = False
                apply_flash_1 = apply_flash_2 = apply_flash_3 = False

                #______________________
                # Create a temporary variable to hold the highest spike we find this frame
                highest_bass_this_frame  = 0.0
                highest_snare_this_frame = 0.0
                highest_hihat_this_frame = 0.0

                # Fast-forward our CSV data index to match the song's current time
                # This ensures the visuals stay perfectly in sync even if the frame rate drops
                #___BASS_______________
                while anim_data_index_1 < anim_max_index_1 and anim_data_1[anim_data_index_1 + 1][0] < audio_time_elapsed:
                    anim_data_index_1 += 1
                    skipped_frames += 1

                    # Check if this skipped frame had a high amplitude
                    if anim_data_1[anim_data_index_1][1] > highest_bass_this_frame:
                        highest_bass_this_frame = anim_data_1[anim_data_index_1][1]

                # Now, current_amplitude_bass will never "miss" a spike between visual frames!
                current_amplitude_bass = highest_bass_this_frame

                if current_amplitude_bass >= THRESHOLD_BASS:
                    bass_amplitude_delta = round(current_amplitude_bass - previous_amplitude_bass, 4)
                    previous_amplitude_bass = current_amplitude_bass
                else:
                    bass_amplitude_delta = 0

                #___SNARE______________
                while anim_data_index_2 < anim_max_index_2 and anim_data_2[anim_data_index_2 + 1][0] < audio_time_elapsed:
                    anim_data_index_2 += 1
                    if anim_data_2[anim_data_index_2][1] > highest_snare_this_frame:
                        highest_snare_this_frame = anim_data_2[anim_data_index_2][1]
                current_amplitude_snare = highest_snare_this_frame

                if current_amplitude_snare >= THRESHOLD_SNARE:
                    snare_amplitude_delta = round(current_amplitude_snare - previous_amplitude_snare, 4)
                    previous_amplitude_snare = current_amplitude_snare
                else:
                    snare_amplitude_delta = 0

                #___HIHAT______________
                while anim_data_index_3 < anim_max_index_3 and anim_data_3[anim_data_index_3 + 1][0] < audio_time_elapsed:
                    anim_data_index_3 += 1
                    if anim_data_3[anim_data_index_3][1] > highest_hihat_this_frame:
                        highest_hihat_this_frame = anim_data_3[anim_data_index_3][1]
                current_amplitude_hihat = highest_hihat_this_frame

                if current_amplitude_hihat >= THRESHOLD_HIHAT:
                    hihat_amplitude_delta = round(current_amplitude_hihat - previous_amplitude_hihat, 4)
                    previous_amplitude_hihat = current_amplitude_hihat
                else:
                    hihat_amplitude_delta = 0

                bass_snare_delta  = abs(bass_amplitude_delta - snare_amplitude_delta)
                bass_hihat_delta  = abs(bass_amplitude_delta - hihat_amplitude_delta)
                snare_hihat_delta = abs(snare_amplitude_delta - hihat_amplitude_delta)

                # Pre-scale amplitudes matching your original logic
                # Pack them into tuples representing vec3 in GLSL
                audio_amp_top = (
                    current_amplitude_bass * 60.0,
                    current_amplitude_snare * 60.0,
                    current_amplitude_hihat * 60.0
                )
    
                audio_amp_bottom = (
                    current_amplitude_bass * 35.0, 
                    current_amplitude_snare * 35.0, 
                    current_amplitude_hihat * 35.0
                )

                #____________________________
                # --- (Threshold Trigger) ---

                zoom_amount = 0

                # MEDIUM
                zoom_intensity_1 = 15
                zoom_intensity_2 = 20
                zoom_intensity_3 = 25

                #print(f"______________________ {bass_amplitude_delta}")

                if current_amplitude_bass >= THRESHOLD_BASS:

                    apply_glitch_1 = True

                    if current_amplitude_bass >= 0.8:
                        if DEBUG: print(f"curr_amp_bass: {current_amplitude_bass:.4f}")

                    #___ZOOM_IN________
                    if current_amplitude_bass >= THRESHOLD_BASS_POSITIVE:
                        if random.randint(0, 1) == 0 and (total_frame_count % 10 == 0):
                            #zoom_intensity_to_apply = zoom_intensity_1
                            zoom_intensity_to_apply = zoom_intensity_2
                        else:
                            #zoom_intensity_to_apply = zoom_intensity_2
                            zoom_intensity_to_apply = zoom_intensity_3

                        if current_amplitude_bass >= 0.55:
                            zoom_amount = min(zoom_intensity_to_apply, zoom_intensity_to_apply * (current_amplitude_bass*2))
                        elif current_amplitude_bass >= 0.75:
                            zoom_amount = min(zoom_intensity_to_apply, zoom_intensity_to_apply * (current_amplitude_bass*2))
                        else:
                            zoom_amount = min(zoom_intensity_to_apply, zoom_intensity_to_apply * (current_amplitude_bass*3))
                    elif current_amplitude_bass >= THRESHOLD_BASS_NEGATIVE:
                    #___ZOOM_OUT_______
                        if random.randint(0, 1) == 0 and (total_frame_count % 10 == 0):
                            #zoom_intensity_to_apply = zoom_intensity_2
                            zoom_intensity_to_apply = zoom_intensity_1
                        else:
                            #zoom_intensity_to_apply = zoom_intensity_3
                            zoom_intensity_to_apply = zoom_intensity_2
                        zoom_amount = max(-zoom_intensity_to_apply, -zoom_intensity_to_apply * (current_amplitude_bass*3))

                if current_amplitude_snare >= THRESHOLD_SNARE and bass_snare_delta >= 0.05:
                    apply_glitch_2 = True

                if current_amplitude_snare >= THRESHOLD_SNARE and \
                   bass_snare_delta >= 0.08 and bass_hihat_delta >= 0.08 and snare_hihat_delta >= 0.08:

                    if current_amplitude_snare >= 0.8:
                        if DEBUG: print(f"curr_amp_snare: {current_amplitude_snare:.4f}")

                    #___ZOOM_IN________
                    if random.randint(0, 1) == 0 and (total_frame_count % 10 == 0):
                        if current_amplitude_snare >= 0.65:
                            zoom_amount = min(zoom_intensity_2, zoom_intensity_2 * (current_amplitude_snare*2))
                        elif current_amplitude_snare >= 0.75:
                            zoom_amount = min(zoom_intensity_2, zoom_intensity_2 * (current_amplitude_snare*1.5))
                        else:
                            zoom_amount = min(zoom_intensity_2, zoom_intensity_2 * (current_amplitude_snare*2.5))
                    else:
                    #___ZOOM_OUT_______
                        if current_amplitude_snare >= 0.65:
                            zoom_amount = max(-zoom_intensity_2, -zoom_intensity_2 * (current_amplitude_snare*2))
                        elif current_amplitude_snare >= 0.75:
                            zoom_amount = max(-zoom_intensity_2, -zoom_intensity_2 * (current_amplitude_snare*1.5))
                        else:
                            zoom_amount = max(-zoom_intensity_2, -zoom_intensity_2 * (current_amplitude_snare*2.5))

                if current_amplitude_hihat >= THRESHOLD_HIHAT:
                    apply_glitch_3 = True

                    if current_amplitude_hihat >= 0.8:
                        if DEBUG: print(f"curr_amp_hihat: {current_amplitude_hihat:.4f}")

                #______________________________________________________________________________________________________
                # ___COMPUTE THE FLASH EFFECT INTENSITY___

                current_amplitude_bass_positive_max = 0
                current_amplitude_snare_positive_max = 0

                if current_amplitude_bass >= (THRESHOLD_BASS-0.08) and bass_amplitude_delta >= 0.020:

                    if current_amplitude_bass >= 0.8:
                        if DEBUG: print(f"  BASS_STATE_1: {current_amplitude_bass:.4f}")
                        if bass_amplitude_delta < 0.1:
                            if DEBUG: print(f"  >>>> bass_delta: {bass_amplitude_delta:.4f}\n   prev {previous_amplitude_bass:.4f}\n   curr: {current_amplitude_bass:.4f}")

                        current_amplitude_bass_positive_max = 1
                        apply_flash_1 = True

                        """if current_amplitude_bass >= 0.85:
                            if random.randint(0, 2) == 2:
                                apply_flash_1 = True
                        else:
                            apply_flash_1 = True"""
                    else:
                        if current_amplitude_bass >= THRESHOLD_BASS_POSITIVE:                            
                            if DEBUG: print(f"  BASS_STATE_2: {current_amplitude_bass:.4f}")
                            if bass_amplitude_delta < 0.1:
                                if DEBUG: print(f"  >>>> bass_delta: {bass_amplitude_delta:.4f}\n   prev {previous_amplitude_bass:.4f}\n   curr: {current_amplitude_bass:.4f}")

                            apply_flash_1 = True

                if current_amplitude_snare >= THRESHOLD_SNARE and \
                   snare_amplitude_delta >= 0.040 and \
                   bass_snare_delta > 0.038: # and bass_hihat_delta > 0.065:

                    snare_hit_count += 1

                    if current_amplitude_bass_positive_max == 0:
                        if current_amplitude_snare >= 0.8:
                            if DEBUG: print(f"  SNARE_STATE_1: {current_amplitude_snare:.4f}")
                            if DEBUG: print(f"  BASS_SNARE_DELTA: {bass_snare_delta:.4f}")
                            if snare_amplitude_delta < 0.1:
                                if DEBUG: print(f"  >>>> snare_delta: {snare_amplitude_delta:.4f}\n   prev {previous_amplitude_snare:.4f}\n   curr: {current_amplitude_snare:.4f}")

                            current_amplitude_snare_positive_max = 1
                            apply_flash_2 = True
                            
                            """if current_amplitude_snare >= 0.85:
                                if random.randint(0, 3) == 3:
                                    apply_flash_2 = True
                            else:
                                apply_flash_2 = True"""
                        else:
                            if bass_snare_delta > 0.065 and bass_hihat_delta > 0.065:
                                if DEBUG: print(f"  SNARE_STATE_2: {current_amplitude_snare:.4f}")
                                if DEBUG: print(f"  BASS_SNARE_DELTA: {bass_snare_delta:.4f}")
                                if snare_amplitude_delta < 0.1:
                                    if DEBUG: print(f"  >>>> snare_delta: {snare_amplitude_delta:.4f}\n   prev {previous_amplitude_snare:.4f}\n   curr: {current_amplitude_snare:.4f}")

                                apply_flash_2 = True

                if current_amplitude_hihat >= THRESHOLD_HIHAT and \
                   hihat_amplitude_delta >= 0.040: # and \
                   #snare_hihat_delta > 0.070 and bass_hihat_delta > 0.070:

                    hihat_hit_count += 1

                    if DEBUG: print(f"HIHAT_STATE_1: {current_amplitude_hihat:.4f}")
                    if DEBUG: print(f"  BASS_HIHAT_DELTA: {bass_hihat_delta:.4f}")
                    if DEBUG: print(f"  SNARE_HIHAT_DELTA: {snare_hihat_delta:.4f}")
                    if hihat_amplitude_delta < 0.1:
                        if DEBUG: print(f"  >>>> hihat_delta: {hihat_amplitude_delta:.4f}\n   prev {previous_amplitude_hihat:.4f}\n   curr: {current_amplitude_hihat:.4f}")

                    apply_flash_3 = True

                #______________________________________________________________________________________________________
                #___FRAME_RENDER_______

                current_time_random_var = random.uniform(0, 1)

                # --- Only launch video playback when main_sequence_event requires it (render_texture)
                if timeline_manager.is_main_sequence_event(current_pygame_time):
                    if current_time_left < video_left.duration:

                        nth_frame = 4 if video_width_left == 2560 else 5
                        # 1. Is this video interval scheduled to have the glitch effect?
                        is_glitch_video = (video_playback_counter_left % random_inject_glitch_interval_left == 0)
     
                        # 2. Limit the glitch application to every nth frame (1/nth of the time)
                        if is_glitch_video and (total_frame_count % nth_frame == 0):
                            inject_glitch = 1
                        else:
                            inject_glitch = 0

                        if video_width_left == 2560 and (total_frame_count % nth_frame == 0): inject_glitch = 1
       
                        # Define our target sizes to make the code cleaner
                        target_sizes = (2560, 1504, 1510, 1376, 1280)

                        if (video_width_left == 2560) or \
                           (video_width_left == 2560 and video_width_right == 1504) or \
                           (video_width_left == 2560 and video_width_right == 1510) or \
                           (video_width_left == 2560 and video_width_right == 1376) or \
                           (video_width_left == 2560 and video_width_right == 1280):

                            futures.append(executor.submit(process_video_unified, video_left, current_time_left, \
                                                           actual_width, actual_height, "left_square", video_right.size[0], \
                                                           None, inject_glitch, glitch_type_left, safe_glitch_left))

                        elif (video_width_left == 1510 and video_width_right == 1510) or \
                             (video_width_left == 1504 and video_width_right == 1504) or \
                             (video_width_left == 1376 and video_width_right == 1376) or \
                             (video_width_left == 1280 and video_width_right == 1280) or \
                             (video_width_left == 1510 and video_width_right == 1504) or \
                             (video_width_left == 1504 and video_width_right == 1510) or \
                             (video_width_left == 1376 and video_width_right == 1280) or \
                             (video_width_left == 1280 and video_width_right == 1376) or \
                             (video_width_left == 1376 and video_width_right == 1504) or \
                             (video_width_left == 1504 and video_width_right == 1376) or \
                             (video_width_left == 1376 and video_width_right == 1510) or \
                             (video_width_left == 1510 and video_width_right == 1376) or \
                             (video_width_left == 1280 and video_width_right == 1504) or \
                             (video_width_left == 1504 and video_width_right == 1280) or \
                             (video_width_left == 1280 and video_width_right == 1510) or \
                             (video_width_left == 1510 and video_width_right == 1280):

                            futures.append(executor.submit(process_video_unified, video_left, current_time_left, \
                                                           actual_width, actual_height, "left_square", video_right.size[0], \
                                                           None, inject_glitch, glitch_type_left, safe_glitch_left))

                        elif video_width_right not in target_sizes:
                            # Right is NOT 1504 and NOT 1280 -> Render Left

                            futures.append(executor.submit(process_video_unified, video_left, current_time_left, \
                                                           actual_width, actual_height, "left_square", video_right.size[0], \
                                                           None, inject_glitch, glitch_type_left, safe_glitch_left))

                        #left_horizontal_fullscreen = 1 if video_width_left in target_sizes else 0
                        left_horizontal_fullscreen = 1 if video_width_left in (1504, 1510, 1376, 1280, 2560) else 0

                        # Half the speed for static fullscreen img video
                        if video_width_left == 2560:
                            #current_time_left += dt/2.25
                            current_time_left += dt
                        else:
                            # Advance timeline naturally by real elapsed time (1.0x native speed)
                            #current_time_left += dt * 2.25
                            #current_time_left += dt * video_playback_speed

                            if timeline_manager.is_special_fx_pause(current_pygame_time):
                                current_time_left += dt/2.0
                            else:
                                current_time_left += dt * video_playback_speed
                    else:
                        video_playback_counter_left += 1

                        random_inject_glitch_interval_left = random.randint(4, 8)
                        if random.randint(0, 1) == 1:
                            glitch_type_left = "horizontal"
                        else:
                            glitch_type_left = "vertical"

                        random_text_string_1 = random.choice(inspirational_words_1).upper()
                        random_text_string_2 = random.choice(inspirational_words_2).upper()
                        random_text_string_3 = random.choice(inspirational_words_combined).upper()
                        text_pos_flag = random.randint(1, 6)
                        text_pos_offset_x = random.randint(300, 600)
                        text_pos_offset_y = random.randint(200, 400)

                        if random.randint(0, 2) == 2:
                            render_text_flag = 1
                        else:
                            render_text_flag = 0

                        safe_close_clip(video_left)
                        current_time_left = 0
                        left_horizontal_fullscreen = 0

                        # 1. Get the NEXT video from the preloaded queue!
                        # If queue is empty (because player caught up), this briefly blocks.
                        # As soon as we get it, the Queue size drops, waking up the background thread.
                        #video_left = video_queue_left.get()
                        fname_left, video_left = video_queue_left.get()
                        log_accumulated_video_filenames_left.append(fname_left)
                    
                        # 2. Check for the end of the playlist
                        if video_left is None:
                            print("Reached end of playlist.")
                            running = False
                            break

                        video_width_left, video_height_left = video_left.size
                        #print(f"Video width_left: {video_width_left}")
                        #print(f"Video height_left: {video_height_left}")

                        if (video_width_left == 2560):
                            if ENABLE_AUDIO_EFFECTS == 1:
                                toggle_sound_effect = 1 #random.randint(0, 1)
                                if toggle_sound_effect == 1:
                                    random_audio_effect = audio_effect_pool.pop(random.randrange(len(audio_effect_pool)))
                                    print(f"len_audio_effect_pool: {len(audio_effect_pool)}")
                                    audio_effect_times_played = 0

                        left_horizontal_fullscreen = 1 if video_width_left in (1504, 1510, 1376, 1280, 2560) else 0

                                                                 # -- THIS FOR THE SEGMENTS ENSURE SYNC
                    if current_time_right < video_right.duration and current_time_left < video_left.duration:
                        if left_horizontal_fullscreen == 0: # Only queue right side if left isn't fullscreen

                            is_glitch_video_right = (video_playback_counter_right % random_inject_glitch_interval_right == 0)

                            # 2. Limit the glitch application to every nth frame (1/nth of the time)
                            if is_glitch_video_right and (total_frame_count % 5 == 0):
                                inject_glitch = 1
                            else:
                                inject_glitch = 0

                            if (video_width_left == 1120 or video_width_left == 1122) and video_width_right == 832:

                                futures.append(executor.submit(process_video_unified, video_right, current_time_right, \
                                                               actual_width, actual_height, "vertical_triune", None, \
                                                               22, inject_glitch, glitch_type_right, safe_glitch_triune))

                                futures.append(executor.submit(process_video_unified, video_vertical_triune_1, current_time_right, \
                                                               actual_width, actual_height, "vertical_triune", None, \
                                                               33, inject_glitch, glitch_type_right, safe_glitch_triune))

                            elif (video_width_left == 1120 or video_width_left == 1122) and video_width_right == 928:
 
                                futures.append(executor.submit(process_video_unified, video_right, current_time_right, \
                                                               actual_width, actual_height, "vertical_triune", None, \
                                                               44, inject_glitch, glitch_type_right))

                                futures.append(executor.submit(process_video_unified, video_vertical_triune_1, current_time_right, \
                                                               actual_width, actual_height, "vertical_triune", None, \
                                                               55, inject_glitch, glitch_type_right, safe_glitch_triune))

                            elif (video_width_left == 1120 or video_width_left == 1122) and video_width_right == 960:
 
                                futures.append(executor.submit(process_video_unified, video_right, current_time_right, \
                                                               actual_width, actual_height, "vertical_triune", None, \
                                                               66, inject_glitch, glitch_type_right))

                                futures.append(executor.submit(process_video_unified, video_vertical_triune_1, current_time_right, \
                                                               actual_width, actual_height, "vertical_triune", None, \
                                                               77, inject_glitch, glitch_type_right, safe_glitch_triune))

                            else:
                                futures.append(executor.submit(process_video_unified, video_right, current_time_right, \
                                                               actual_width, actual_height, "right_square", video_left.size[0], None, \
                                                               inject_glitch, glitch_type_right, safe_glitch_right))

                        # Advance timeline naturally by real elapsed time

                        if timeline_manager.is_special_fx_pause(current_pygame_time):
                            current_time_right += dt/2.0
                        else:
                            current_time_right += dt * video_playback_speed
                    else:
                        left_horizontal_fullscreen = 1 if video_width_left in (1504, 1510, 1376, 1280, 2560) else 0
                        video_playback_counter_right += 1

                        random_inject_glitch_interval_right = random.randint(4, 8)
                        if random.randint(0, 1) == 1:
                            glitch_type_right = "horizontal"
                        else:
                            glitch_type_right = "vertical"

                        safe_close_clip(video_right)
                        safe_close_clip(video_vertical_triune_1)
                        current_time_right = 0

                        # 1. Get the NEXT video from the preloaded queue!
                        # If queue is empty (because player caught up), this briefly blocks.
                        # As soon as we get it, the Queue size drops, waking up the background thread.
                        #video_right = video_queue_right.get()
                        fname_right, video_right = video_queue_right.get()
                        log_accumulated_video_filenames_right.append(fname_right)
                    
                        # 2. Check for the end of the playlist
                        if video_right is None:
                            print("Reached end of playlist.")
                            running = False
                            break
                        video_width_right, video_height_right = video_right.size

                        #print(f"Video width_right: {video_width_right}")
                        #print(f"Video height_right: {video_height_right}")

                        # LEFT SITUATION NEVER HAPPENS BECAUSE THERE IS NOT VERTICAL FORMAT IN LEFT
                        if video_width_left == 832 or video_width_left == 928 or video_width_left == 960 or \
                           video_width_right == 832 or video_width_right == 928 or video_width_right == 960:

                            #video_vertical_triune_1 = video_queue_triune.get()
                            fname_vertical_triune_1, video_vertical_triune_1 = video_queue_triune.get()
                            log_accumulated_video_filenames_right.append(fname_vertical_triune_1)
                            if video_vertical_triune_1 is None:
                                print("Reached end of playlist.")
                                running = False
                                break
                            video_width_vertical_triune_1, video_height_vertical_triune_1 = video_vertical_triune_1.size

                #______________________________________________________________________________________________________
                #___HARVEST RESULTS AND DRAW THE FRAMES___

                combined_surface.fill(BLACK)
                if CONSOLE: console_surface_1.fill(BLACK)

                if current_time_matrix_code_video_left < matrix_code_video_left.duration:
                    futures_matrix.append(executor.submit(process_matrix_video, matrix_code_video_left, \
                                                          current_time_matrix_code_video_left, (0, 0)))
                    current_time_matrix_code_video_left += dt
                else:
                    current_time_matrix_code_video_left = 0

                if current_time_matrix_code_video_right < matrix_code_video_right.duration:
                    futures_matrix.append(executor.submit(process_matrix_video, matrix_code_video_right, \
                                                          current_time_matrix_code_video_right, (3190, 0)))
                    current_time_matrix_code_video_right += dt
                else:
                    current_time_matrix_code_video_right = 0

                for future_matrix in as_completed(futures_matrix):
                    try:
                        matrix_np, position = future_matrix.result()
                        matrix_surface = pygame.surfarray.make_surface(matrix_np)
                        combined_surface.blit(matrix_surface, position)
                    except Exception as e:
                        print(f"Error in rendering thread: {e}")

                # 2. Wait for all concurrent tasks to finish and assemble the pieces
                """for future in as_completed(futures):
                    try:
                        resized_np, position, dimensions = future.result()
                        surface = pygame.surfarray.make_surface(resized_np)

                        if video_width_left == 2560:
                            tmp_pos_x, tmp_pos_y = position
                            tmp_width, tmp_height = dimensions

                            tmp_surface = surface
                            if current_time_left >= int(video_left.duration/2.25):
                                tmp_surface = pygame.transform.rotate(tmp_surface, -1)
                                tmp_pos_y = tmp_pos_y-30

                            if current_time_left >= int(video_left.duration/1.5):
                                tmp_surface = pygame.transform.rotate(tmp_surface, 1)
                                tmp_surface = pygame.transform.flip(tmp_surface, True, False)
                                tmp_pos_y = tmp_pos_y-30

                            if surface is not None:
                                combined_surface.blit(tmp_surface, (tmp_pos_x, tmp_pos_y))
                        else:
                            if surface is not None:
                                # Blit the un-altered puzzle piece onto our combined canvas
                                combined_surface.blit(surface, position)

                    except Exception as e:
                        print(f"Error in rendering thread: {e}")"""


                # 2. Wait for all concurrent tasks to finish and assemble the pieces
                for future in as_completed(futures):
                    try:
                        frame_np, position, dimensions = future.result()
                        target_width, target_height = dimensions
                        preallocated_buffer = np.empty((target_width, target_height, 3), dtype=np.uint8)
                        futures_resize_np_arr.append(executor.submit(resize_np_arr, frame_np, position, dimensions, preallocated_buffer))
                        
                        #futures_resize_np_arr.append(executor.submit(resize_np_arr, frame_np, position, dimensions))
                    except Exception as e:
                        print(f"Error in rendering thread: {e}")

                for fut in as_completed(futures_resize_np_arr):
                    try:
                        resized_frame_np, position, dimensions = fut.result()
                        surface = pygame.surfarray.make_surface(resized_frame_np)

                        if video_width_left == 2560:
                            tmp_pos_x, tmp_pos_y = position
                            tmp_width, tmp_height = dimensions

                            tmp_surface = surface
                            if current_time_left >= int(video_left.duration/2.25):
                                tmp_surface = pygame.transform.rotate(tmp_surface, -1)
                                tmp_pos_y = tmp_pos_y-30

                            if current_time_left >= int(video_left.duration/1.5):
                                tmp_surface = pygame.transform.rotate(tmp_surface, 1)
                                tmp_surface = pygame.transform.flip(tmp_surface, True, False)
                                tmp_pos_y = tmp_pos_y-30

                            if surface is not None:
                                combined_surface.blit(tmp_surface, (tmp_pos_x, tmp_pos_y))
                        else:
                            if surface is not None:
                                # Blit the un-altered puzzle piece onto our combined canvas
                                combined_surface.blit(surface, position)
                    except Exception as e:
                        print(f"Error in resize_frame_np thread: {e}")

                #______________________________________________________________________________________________________
                # ___SURFACE_MANIPULATIONS___

                #___APPLY_UI_MASK______
                combined_surface.blit(mask_image_1, (0, 0))

                if CONSOLE:
                    # 1. Draw the stdout console
                    draw_console(
                        console_obj=console_stdout, 
                        target_surface=combined_surface, 
                        font=console_font_1, 
                        start_x=0, 
                        start_y=1090, 
                        max_height=350, 
                        max_chars=50
                    )

                    if timeline_manager.is_intro_fx(current_pygame_time):
                        # variables for the console_filestream
                        start_x = 250
                        start_y = 300
                        max_height = 800
                        max_chars = 90
                        console_color = console_color_intro
                        console_filestream_font = console_font_4

                        if current_pygame_time < 6.4:
                            helper_functions.title_intro(console_surface_1, current_pygame_time, 
                                                         random_intro_title, SCREEN_WIDTH, SCREEN_HEIGHT) #audio_path
                        if current_pygame_time < 7.0:
                            console_filestream.update(chars_per_tick=5)
                            draw_console(
                                console_obj=console_filestream,
                                target_surface=console_surface_1, 
                                font=console_filestream_font, 
                                start_x=start_x,
                                start_y=start_y,
                                max_height=max_height,
                                max_chars=max_chars,
                                color=console_color
                            )
                    else:
                        # 2. Draw the copy of stdout console
                        if DEBUG:
                            max_chars = 200
                        else:
                            max_chars = 60
                        draw_console(
                            console_obj=console_stdout,
                            target_surface=console_surface_1, 
                            font=console_font_2, 
                            start_x=1380,
                            start_y=40,
                            max_height=200,
                            max_chars=max_chars
                        )
                        # variables for the console_filestream
                        start_x = 280
                        start_y = 260
                        max_height = 700
                        max_chars = 77
                        console_color = WHITE
                        console_filestream_font = console_font_3

                        console_filestream.update(chars_per_tick=5)

                        draw_console(
                            console_obj=console_filestream,
                            target_surface=console_surface_1, 
                            font=console_filestream_font, 
                            start_x=start_x,
                            start_y=start_y,
                            max_height=max_height,
                            max_chars=max_chars,
                            color=console_color
                        )

                #___APPLY_UI_AUDIO_BAR_VIZ___
                current_amplitudes = [current_amplitude_bass, current_amplitude_snare, current_amplitude_hihat]
                audio_bar_visualizer(combined_surface, 3360, 500, current_amplitudes)

                #__________________________________________________________________________________________________
                #___ANUTTARA_VIMUTTI_LOGO___

                if audio_time_elapsed >= ((audio_len*1000)-7000):
                   combined_surface.blit(mask_image_2, (0, 0))

                """if audio_time_elapsed >= 0 and audio_time_elapsed <= 7000:
                    combined_surface.blit(mask_image_2, (0, 0))
                elif audio_time_elapsed >= ((audio_len*1000)-7000):
                   combined_surface.blit(mask_image_2, (0, 0))"""


                """elif audio_time_elapsed >= 60000 and audio_time_elapsed <= 65000:
                    combined_surface.blit(mask_image_2, (0, 0))
                elif audio_time_elapsed >= 120000 and audio_time_elapsed <= 125000:
                   combined_surface.blit(mask_image_2, (0, 0))
                elif audio_time_elapsed >= 180000 and audio_time_elapsed <= 185000:
                    combined_surface.blit(mask_image_2, (0, 0))
                elif audio_time_elapsed >= 240000 and audio_time_elapsed <= 245000:
                    combined_surface.blit(mask_image_2, (0, 0))
                elif audio_time_elapsed >= 300000 and audio_time_elapsed <= 305000:
                   combined_surface.blit(mask_image_2, (0, 0))"""
                
                #__________________________________________________________________________________________________
                #___APPLY_ZOOM_EFFECT___
                # to the COMBINED surface and blit to the real screen

                needs_transform = False
                angle_to_apply = 0
                zoom_to_apply = 0

                #___APPLY_ZOOM_FOR_BASS_AND_ROTATION_FOR_SNARE___
                if apply_glitch_1 and apply_glitch_2:
                    needs_transform = True
                    zoom_to_apply = zoom_amount
                    rotate_angle_positive = 0
                    rotate_angle_negative = 0

                    rotate_angle_positive += current_amplitude_snare
                    rotate_angle_negative -= current_amplitude_snare

                    if (total_frame_count % 1 == 0) and bass_amplitude_delta >= 0.065 and \
                        bass_snare_delta >= 0.065 and bass_hihat_delta >= 0.065:
                        if snare_amplitude_delta >= 0.065:
                            mult = 1.20; random_rotate_orientation = 1
                        elif snare_amplitude_delta >= 0.075:
                            mult = 1.30; random_rotate_orientation = 2
                        elif snare_amplitude_delta >= 0.085:
                            mult = 1.40; random_rotate_orientation = 3
                        else:
                            random_rotate_orientation = 0
                    #else:
                    #    angle_to_apply = 0.0; random_rotate_orientation = 0
                    else:
                        mult = 1.05; random_rotate_orientation = random.randint(0, 3)

                    if random_rotate_orientation == 0:   angle_to_apply = rotate_angle_positive
                    elif random_rotate_orientation == 1: angle_to_apply = rotate_angle_negative
                    elif random_rotate_orientation == 2: angle_to_apply = min(1, rotate_angle_positive*mult)
                    elif random_rotate_orientation == 3: angle_to_apply = max(-1, rotate_angle_negative*mult)

                    #HIGH
                    #elif random_rotate_orientation == 2: angle_to_apply = min(3, rotate_angle_positive*mult)
                    #elif random_rotate_orientation == 3: angle_to_apply = max(-3, rotate_angle_negative*mult)


                #___APPLY__ZOOM_FOR_BASS___
                elif apply_glitch_1:
                    needs_transform = True
                    zoom_to_apply = zoom_amount
                    angle_to_apply = 0
    
                #___APPLY_ZOOM_AND_ROTATION_FOR_SNARE___
                elif apply_glitch_2:
                    needs_transform = False
                    zoom_to_apply = zoom_amount
                    rotate_angle_positive = 0
                    rotate_angle_negative = 0
                   
                    rotate_angle_positive += current_amplitude_snare
                    rotate_angle_negative -= current_amplitude_snare

                    if (total_frame_count % 1 == 0) and bass_amplitude_delta >= 0.075 and \
                       bass_snare_delta >= 0.075 and bass_hihat_delta >= 0.075:
                        if snare_amplitude_delta >= 0.075:
                            mult = 1.20; random_rotate_orientation = 0
                        elif snare_amplitude_delta >= 0.085:
                            mult = 1.30; random_rotate_orientation = 3
                        elif snare_amplitude_delta >= 0.095:
                            mult = 1.40; random_rotate_orientation = 2
                        else:
                            random_rotate_orientation = 1
                    else:
                        mult = 1.05; random_rotate_orientation = random.randint(0, 3) 
                    #else:
                    #    angle_to_apply = 0.0; random_rotate_orientation = 1

                    if random_rotate_orientation == 0:   angle_to_apply = rotate_angle_positive
                    elif random_rotate_orientation == 1: angle_to_apply = rotate_angle_negative
                    elif random_rotate_orientation == 2: angle_to_apply = min(1, rotate_angle_positive*mult)
                    elif random_rotate_orientation == 3: angle_to_apply = max(-1, rotate_angle_negative*mult)

                    # HIGH
                    #elif random_rotate_orientation == 2: angle_to_apply = min(3, rotate_angle_positive*mult)
                    #elif random_rotate_orientation == 3: angle_to_apply = max(-3, rotate_angle_negative*mult)

                angle_to_apply = angle_to_apply * 0.6

                #______________________________________________________________________________________________________
                #___LEFT MATRIX CODE___

                if last_matrix_code_timing <= 1000:
                    # Random chance to add overlays (e.g., 15% per frame; adjust for density)
                    if random.random() < 0.60:
                        num_chars = random.randint(1, 30)  # How many to add this frame
                        screen_width, screen_height = screen.get_size()  # Use actual screen dims
    
                        for _ in range(num_chars):
                            random_font = random.randint(1, 9)
                            if random_font == 1: font = font_1
                            elif random_font == 2: font = font_2
                            elif random_font == 3: font = font_3
                            elif random_font == 4: font = font_4
                            elif random_font == 5: font = font_5
                            elif random_font == 6: font = font_6
                            elif random_font == 7: font = font_7
                            elif random_font == 8: font = font_8
                            elif random_font == 9: font = font_9

                            char = random.choice(matrix_chars)
                            # Random position, offset by font size to avoid clipping
                            font_size = font.get_height()  # Dynamic based on font
                            #x = random.randint(0, screen_width - font_size)

                            if video_width_left == 2560:
                                x = random.randint(0, 420 - font_size)
                            elif video_width_left == 1504:
                                x = random.randint(0, 480 - font_size)
                            elif video_width_left == 1510:
                                x = random.randint(0, 480 - font_size)
                            elif video_width_left == 1376:
                                x = random.randint(0, 550 - font_size)
                            elif video_width_left == 1280:
                                x = random.randint(0, 600 - font_size)

                            elif video_width_right == 1504:
                                x = random.randint(0, 480 - font_size)
                            elif video_width_right == 1510:
                                x = random.randint(0, 480 - font_size)
                            elif video_width_right == 1376:
                                x = random.randint(0, 550 - font_size)
                            elif video_width_right == 1280:
                                x = random.randint(0, 600 - font_size)

                            elif video_width_left in (1120, 1122) and video_width_right in (1120, 1122):
                                x = random.randint(0, 320 - font_size)
                            else:
                                x = random.randint(0, 300 - font_size)

                            y = random.randint(0, screen_height - font_size)
        
                            # Get pre-rendered surface instead of rendering it live!
                            random_font_idx = random_font - 1 # Arrays are 0-indexed
                            color_choice = 1 if random.randint(0, 1) == 1 else 2
                            char_surface = MATRIX_GLYPH_CACHE[color_choice][random_font_idx][char]
                            combined_surface.blit(char_surface, (x, y))

                #______________________________________________________________________________________________________
                #___RIGHT MATRIX CODE___

                if last_matrix_code_timing <= 1000:
                    # Random chance to add overlays (e.g., 15% per frame; adjust for density)
                    if random.random() < 0.60:
                        num_chars = random.randint(1, 30)  # How many to add this frame
                        screen_width, screen_height = screen.get_size()  # Use actual screen dims
    
                        for _ in range(num_chars):
                            random_font = random.randint(1, 9)
                            if random_font == 1: font = font_1
                            elif random_font == 2: font = font_2
                            elif random_font == 3: font = font_3
                            elif random_font == 4: font = font_4
                            elif random_font == 5: font = font_5
                            elif random_font == 6: font = font_6
                            elif random_font == 7: font = font_7
                            elif random_font == 8: font = font_8
                            elif random_font == 9: font = font_9

                            char = random.choice(matrix_chars)
                            # Random position, offset by font size to avoid clipping
                            font_size = font.get_height()  # Dynamic based on font
                            #x = random.randint(0, screen_width - font_size)

                            if video_width_left == 2560:
                                x = screen_width - random.randint(0, 420 - font_size)
                            elif video_width_left == 1504:
                                x = screen_width - random.randint(0, 480 - font_size)
                            elif video_width_left == 1510:
                                x = screen_width - random.randint(0, 480 - font_size)
                            elif video_width_left == 1376:
                                x = screen_width - random.randint(0, 550 - font_size)
                            elif video_width_left == 1280:
                                x = screen_width - random.randint(0, 600 - font_size)

                            elif video_width_left == 1504:
                                x = screen_width - random.randint(0, 480 - font_size)
                            elif video_width_left == 1510:
                                x = screen_width - random.randint(0, 480 - font_size)
                            elif video_width_right == 1376:
                                x = screen_width - random.randint(0, 550 - font_size)
                            elif video_width_right == 1280:
                                x = screen_width - random.randint(0, 600 - font_size)

                            elif video_width_left in (1120, 1122) and video_width_right in (1120, 1122):
                                x = screen_width - random.randint(0, 320 - font_size)
                            else:
                                x = screen_width - random.randint(0, 300 - font_size)

                            y = random.randint(0, screen_height - font_size)

                            # Get pre-rendered surface instead of rendering it live!
                            random_font_idx = random_font - 1 # Arrays are 0-indexed
                            color_choice = 1 if random.randint(0, 1) == 1 else 2
                            char_surface = MATRIX_GLYPH_CACHE[color_choice][random_font_idx][char]
                            combined_surface.blit(char_surface, (x, y))

                    last_matrix_code_timing = 0
                elif last_matrix_code_timing >= 1000 and last_matrix_code_timing <= 10000:
                    last_matrix_code_timing += 0.5
                elif last_matrix_code_timing >= 10000:
                    last_matrix_code_timing = 0
                else:
                    last_matrix_code_timing += 0.5

                #___VERTICAL_TEXT_RENDER_IF_1440p___
                if video_width_left == 2560:
                    if current_time_left >= int(video_left.duration/1.5):
                        helper_functions.render_text_vertical(combined_surface, random_text_string_3, 70, 420, 0, -90)

                #___HORIZONTAL_TEXT_RENDER___
                if audio_time_elapsed >= 7000:
                    if video_width_left in (1120, 1122) and video_width_right in (1120, 1122):
                        if render_text_flag == 1 and random.randint(0, 3) == 3:
                            if current_time_left >= int(video_left.duration/2.5):
                                tmp_pos_x = 1500
                                tmp_pos_y = 500

                                if text_pos_flag == 1:
                                    text_x = tmp_pos_x + text_pos_offset_x
                                    text_y = tmp_pos_y
                                elif text_pos_flag == 2:
                                    text_x = tmp_pos_x 
                                    text_y = tmp_pos_y + text_pos_offset_x
                                elif text_pos_flag == 3:
                                    text_x = tmp_pos_x - text_pos_offset_x
                                    text_y = tmp_pos_y
                                elif text_pos_flag == 4:
                                    text_x = tmp_pos_x 
                                    text_y = tmp_pos_y - text_pos_offset_y
                                elif text_pos_flag == 5:
                                    text_x = tmp_pos_x + text_pos_offset_x
                                    text_y = tmp_pos_y + text_pos_offset_y
                                elif text_pos_flag == 6:
                                    text_x = tmp_pos_x - text_pos_offset_x
                                    text_y = tmp_pos_y - text_pos_offset_y

                                helper_functions.render_text_horizontal(combined_surface, f"{random_text_string_1}:{random_text_string_2}", 80, text_x, text_y, -90)

                #song_title = audio_path.split('/')[-1]
                #song_title = song_title.split('.wav')[0]
                #helper_functions.render_white_text_horizontal(screen, f"{song_title}", 40, 1500, 10)

                fps_debug.append(clock.get_fps())
                if DEBUG: # or \
                   #video_width_vertical_triune_1 == 928 or video_width_right == 928 or \
                   #video_width_vertical_triune_1 == 960 or video_width_right == 960:
                    # Display FPS counter                    
                    fps = "FPS: {:.2f}".format(clock.get_fps())
                    fps_text = debug_font.render(f"{fps} | L: {video_queue_left.qsize()}/{MAX_CACHE_SIZE} <> R: {video_queue_right.qsize()}/{MAX_CACHE_SIZE} | video_width_left: {video_width_left} | video_width_right: {video_width_right} | video_width_vertical_triune_1: {video_width_vertical_triune_1} | glitch_type_left: {glitch_type_left} | glitch_type_right: {glitch_type_right}", True, (255, 255, 255))
                    combined_surface.blit(fps_text, (10, 10))

                fps_debug.append(clock.get_fps())

                #______________________________________________________________________________________________________
                #___APPLY_FLASH_EFFECT___


                if apply_glitch_1 or apply_glitch_2 or apply_glitch_3:
                    #sync_value_1 = 1.0
                    sync_value_1 = current_amplitude_bass
                else:
                    sync_value_1 = 0.0

                if apply_glitch_2:
                    #sync_value_2 = 1.0
                    sync_value_2 = current_amplitude_snare
                else:
                    sync_value_2 = 0.0

                #__OPTIMIZED__
                if apply_flash_1 and apply_flash_2 and apply_flash_3:
                    sync_value_3 = 0.10 + math.sqrt(max(current_amplitude_bass, current_amplitude_snare, current_amplitude_hihat))
                elif apply_flash_1 and apply_flash_2:
                    sync_value_3 = 0.10 + math.sqrt(max(current_amplitude_bass, current_amplitude_snare))
                elif apply_flash_1 and apply_flash_3:
                    sync_value_3 = 0.10 + math.sqrt(max(current_amplitude_bass, current_amplitude_hihat))
                elif apply_flash_2 and apply_flash_3:
                    sync_value_3 = 0.10 + math.sqrt(max(current_amplitude_snare, current_amplitude_hihat))
                elif apply_flash_1: # BASS
                    sync_value_3 = 0.10 +  math.sqrt(current_amplitude_bass)
                elif apply_flash_3: # HIHAT
                    sync_value_3 = 0.10 + math.sqrt(current_amplitude_hihat)
                elif apply_flash_2:
                    sync_value_3 = 0.07 + math.sqrt(current_amplitude_snare)
                    sync_value_3 = max(0.0, min(1.0, sync_value_3))
                else:
                    sync_value_3 = 0.0

                audio_sync_data: dict[str, float] = {
                    'sync_value_1': sync_value_1,
                    'sync_value_2': sync_value_2,
                    'sync_value_3': sync_value_3,
                }

                # Clear screen every frame
                main_ctx.clear(0.0, 0.0, 0.0)

                render_texture.write(combined_surface.get_view('1'))

                console_textures = []
                if CONSOLE:
                    console_texture_1.write(console_surface_1.get_view('1'))

                    if audio_time_elapsed >= ((audio_len*1000)-7000):
                        #___ANUTTARA_VIMUTTI_LOGO___
                        console_surface_mask.fill(BLACK)
                        console_surface_mask.blit(mask_image_2, (0, 0))
                        console_texture_mask.write(console_surface_mask.get_view('1'))
                    else:
                        console_texture_mask.write(console_surface_mask.get_view('1'))

                    console_textures.append(console_texture_1)
                    console_textures.append(console_texture_mask)

                #render_texture.use(0)

                
                #main_ctx.disable(moderngl.DEPTH_TEST)

                # Tell ModernGL to enable blending
                #main_ctx.enable(moderngl.BLEND)

                # Set the blending mode to standard Alpha Blending
                #main_ctx.blend_func = moderngl.SRC_ALPHA, moderngl.ONE_MINUS_SRC_ALPHA
                #main_ctx.blend_func = moderngl.ONE, moderngl.ONE
                
                if current_amplitude_bass >= THRESHOLD_BASS_POSITIVE:
                    cycle_position = total_frame_count % 6
                    if cycle_position < 2:
                        zoom_direction = "vertical_stretch"
                    elif cycle_position < 4:
                        zoom_direction = "horizontal_stretch"
                    else:
                        zoom_direction = "equal"
                else:
                    cycle_position = total_frame_count % 6
                    if cycle_position < 2:
                        zoom_direction = "vertical_squeeze"
                    elif cycle_position < 4:
                        zoom_direction = "horizontal_squeeze"
                    else:
                        zoom_direction = "equal"

                # --- Base default values for normal frames ---
                u_pixel_offset = (0.0, 0.0)
                u_target_size = (screen_w, screen_h)
                u_angle_deg = 0.0
                u_pivot = (0.5, 0.5)

                if apply_glitch_1 and apply_glitch_2:
                    # 1. Start with the base zoom applied equally to both axes
                    zoom_w = zoom_to_apply
                    zoom_h = zoom_to_apply
                    
                    # 2. Calculate a subtle distortion delta to lessen the radical impact.
                    # We use abs() so the stretch logic remains visually consistent 
                    # whether zoom_to_apply is currently positive or negative.
                    # (e.g., 20% of the zoom + 2 baseline pixels)
                    if zoom_to_apply <= 20:
                        distortion = int(abs(zoom_to_apply) * 0.10) + 1
                    else:
                        distortion = int(abs(zoom_to_apply) * 0.12) + 2

                    # 3. Apply the stretch/squeeze by slightly modifying the axes, 
                    # rather than discarding the zoom completely on one axis.
                    if zoom_direction == "vertical_stretch":
                        zoom_h += distortion
                        zoom_w -= distortion
                    elif zoom_direction == "horizontal_stretch":
                        zoom_w += distortion
                        zoom_h -= distortion
                    elif zoom_direction == "vertical_squeeze":
                        zoom_h -= distortion
                        zoom_w += distortion
                    elif zoom_direction == "horizontal_squeeze":
                        zoom_w -= distortion
                        zoom_h += distortion

                    # 4. Calculate final dimensions
                    new_width = screen_w + zoom_w
                    new_height = screen_h + zoom_h
                    
                    # 5. Calculate mathematically perfect centering offsets 
                    # based on the actual distorted dimensions
                    offset_x = (screen_w - new_width) // 2
                    offset_y = (screen_h - new_height) // 2

                    u_target_size = (new_width, new_height)
                    u_pixel_offset = (offset_x, offset_y)

                    u_angle_deg = angle_to_apply
                    u_pivot = (0.5, 0.5)

                elif apply_glitch_1:
                    # 1. Start with the base zoom applied equally to both axes
                    zoom_w = zoom_to_apply
                    zoom_h = zoom_to_apply
                    
                    # 2. Calculate a subtle distortion delta to lessen the radical impact.
                    # We use abs() so the stretch logic remains visually consistent 
                    # whether zoom_to_apply is currently positive or negative.
                    # (e.g., 20% of the zoom + 2 baseline pixels)
                    if zoom_to_apply <= 20:
                        distortion = int(abs(zoom_to_apply) * 0.10) + 1
                    else:
                        distortion = int(abs(zoom_to_apply) * 0.12) + 2

                    # 3. Apply the stretch/squeeze by slightly modifying the axes, 
                    # rather than discarding the zoom completely on one axis.
                    if zoom_direction == "vertical_stretch":
                        zoom_h += distortion
                        zoom_w -= distortion
                    elif zoom_direction == "horizontal_stretch":
                        zoom_w += distortion
                        zoom_h -= distortion
                    elif zoom_direction == "vertical_squeeze":
                        zoom_h -= distortion
                        zoom_w += distortion
                    elif zoom_direction == "horizontal_squeeze":
                        zoom_w -= distortion
                        zoom_h += distortion

                    # 4. Calculate final dimensions
                    new_width = screen_w + zoom_w
                    new_height = screen_h + zoom_h
                    
                    # 5. Calculate mathematically perfect centering offsets 
                    # based on the actual distorted dimensions
                    offset_x = (screen_w - new_width) // 2
                    offset_y = (screen_h - new_height) // 2

                    u_target_size = (new_width, new_height)
                    u_pixel_offset = (offset_x, offset_y)

                    u_angle_deg = 0.0
                    u_pivot = (0.5, 0.5)

                elif apply_glitch_2:
                    new_width = screen_w + zoom_to_apply
                    new_height = screen_h + zoom_to_apply
                    offset_x = (screen_w - new_width) // 2
                    offset_y = (screen_h - new_height) // 2
    
                    # THE SECRET SAUCE RETAINED: 
                    # Offset is based on zoomed size, but target size is unscaled!
                    u_target_size = (screen_w, screen_h)
                    u_pixel_offset = (offset_x, offset_y)
                    u_angle_deg = angle_to_apply
                    #u_pivot = (0.0, 0.0)
                    u_pivot = (0.5, 0.5) 
                    # THIS u_pivot = (0.5, 0.5) SEEMS TO WORK HERE 
                    # THE KEY IS u_target_size = (screen_w, screen_h) 

                # FOR TESTING PURPOSES tilt from right-top corner 10deg
                #u_pixel_offset = (0, 0)
                #u_angle_deg = 10.0
                #u_pivot = (0.5, 0.5)

                #print(f">> u_target_size: {u_target_size} | u_pixel_offset: {u_pixel_offset}")
                #print(f">> u_angle_deg: {u_angle_deg} | u_pivot: {u_pivot}")             
                
                timeline_manager.update(
                    current_time=current_pygame_time, 
                    audio_amp_top=audio_amp_top, 
                    audio_amp_bottom=audio_amp_bottom, 
                    audio_sync_data=audio_sync_data,
                    angle_deg=u_angle_deg,
                    pivot=u_pivot,
                    pixel_offset=u_pixel_offset,
                    target_size=u_target_size,
                    render_texture=render_texture,
                    console_texture=console_textures
                )

                if timeline_manager.is_main_sequence_event(current_pygame_time) and (current_time_left == 0 or current_time_right == 0):
                    main_ctx.clear(1, 1, 1)

                pygame.display.flip()

            clock.tick(48) #video.fps)  # Limit frame rate

        #______________________________________________________________________________________________________
        #___CLEAN_UP___________________

        render_texture.release()

        if CONSOLE:
            console_texture_1.release()
            console_texture_mask.release()

        shader_cache.release_all()
        main_ctx.release()

        max_fps = max(fps_debug)
        min_fps = min(fps_debug)
        avg_fps = statistics.mean(fps_debug)

        print(f"MAX_FPS: {max_fps}")
        print(f"MIN_FPS: {min_fps}")
        print(f"AVG_FPS: {avg_fps}")
        print(f"  skipped_frames: {int(skipped_frames/1000)}")

        sd.stop()               # Instantly stops hardware playback
        del my_song_array       # Free up RAM

        safe_close_clip(video_left)
        safe_close_clip(video_right)
        safe_close_clip(video_vertical_triune_1)

        safe_close_clip(matrix_code_video_left)
        safe_close_clip(matrix_code_video_right)

        print("Emptying cache and closing background processes (L)...")
        while not video_queue_left.empty():
            cached_clip = video_queue_left.get()
            if cached_clip is not None:
                safe_close_clip(cached_clip)

        print("Emptying cache and closing background processes (R)...")
        while not video_queue_right.empty():
            cached_clip = video_queue_right.get()
            if cached_clip is not None:
                safe_close_clip(cached_clip)

        print("Emptying cache and closing background processes (TRI)...")
        while not video_queue_triune.empty():
            cached_clip = video_queue_triune.get()
            if cached_clip is not None:
                safe_close_clip(cached_clip)

        #executor.shutdown(wait=False)
        executor.shutdown(wait=True)

        Log_Neural_Indices(log_accumulated_video_filenames_left)
        Log_Neural_Indices(log_accumulated_video_filenames_right)

        pygame.display.quit()
        #pygame.quit()

    except Exception as e:
        # This will print the full, multi-line error showing the exact file, 
        # the exact line number, and the true root cause.
        traceback.print_exc()
        exit_signal = True

    return exit_signal


if __name__ == '__main__':

    """
    audio_base_folder = config.get("audio_filepaths", {}).get("music_folder")
    audio_sync_data_base_folder = config.get("audio_filepaths", {}).get("sync_folder")

    from audio_vars import *

    play_video_fullscreen(audio_path)
    #play_video_fullscreen("C:/1/light_wave_tech/DATA/SUNO_HIGHEST_QUALITY/PSY_TRANCE/0 Elara's Transmission.wav")

    pygame.quit()
    sys.exit()
    """

####____PLAYLIST____####
    
    ###___PASS_VARIABLE TO play_video_fullscreen() TO ADJUST "shaking"/tilt
    ###_____ 2026-09-25 ADJUSTED rot to lower values 
    ###_____ -2 >> -1 and angle_to_apply = angle_to_apply * 0.6
    ###_____ ALSO TESTED total_frame_count % 30 but i might not have been that good

# TRY "shader_effect_file": "DATA/shaders/music_video/v2/crack_monochrome.txt",
# TRY rainbow vortex + zoom/rot

    CORE_EDITION       = False
    SUMMER_EDITION     = False
    PSY_TRANCE_EDITION = False
    HARDWAVE_EDITION   = True

    #audio_base_folder = config.get("audio_filepaths", {}).get("music_folder")
    
    # DUE TO THE LACK OF STORAGE 3 PLACES
    audio_base_folder_1 = "X:/SUNO_32-BIT_AUDIO" # CORE
    audio_base_folder_2 = "C:/SUNO_32-BIT_AUDIO" # SUMMER
    audio_base_folder_3 = "F:/SUNO_32-BIT_AUDIO" # HARDWAVE + PSY_TRANCE

    audio_sync_data_base_folder = config.get("audio_filepaths", {}).get("sync_folder")

    from audio_vars_playlist import *
    if CORE_EDITION:
        songs_all_random = SUNO_AUDIO_CORE
    elif SUMMER_EDITION:
        songs_all_random = SUNO_AUDIO_SUMMER
    elif HARDWAVE_EDITION:
        songs_all_random = SUNO_AUDIO_HARDWAVE
    elif PSY_TRANCE_EDITION:
        songs_all_random = SUNO_AUDIO_PSY_TRANCE

    random.shuffle(songs_all_random)

    print(f"{len(songs_all_random)} items in playlist")
    #print(songs_all_random)

    for i, audio_file in enumerate(songs_all_random):
        if CORE_EDITION:
            playlist_type = "CORE"
            audio_path = f"{audio_base_folder_1}/CORE/{audio_file}"
        elif SUMMER_EDITION:
            playlist_type = "SUMMER"
            audio_path = f"{audio_base_folder_2}/SUMMER/{audio_file}"
        elif PSY_TRANCE_EDITION:
            playlist_type = "PSY_TRANCE"
            audio_path = f"{audio_base_folder_3}/PSY_TRANCE/{audio_file}"
        elif HARDWAVE_EDITION:
            playlist_type = "HARDWAVE"
#            audio_path = f"{audio_base_folder}/HARDWAVE/SUPER_EVOLVED/{audio_file}"
            audio_path = f"{audio_base_folder_3}/HARDWAVE/{audio_file}"

        print(f"audio_path: {audio_path}")
        print(f"==================IIIIIIIIIII: {get_audio_len(audio_path)}")

        # Catch the return value from the function
        kill_playlist = play_video_fullscreen(audio_path, playlist_index=i, playlist_type=playlist_type)
        gc.collect()
        
        # Check if the user pressed 'x'
        if kill_playlist == True:
            print("Kill command received. Exiting playlist gracefully...")
            break  # <--- This immediately stops the 'for' loop

    pygame.quit()
    sys.exit()


# >>> GPU COMPOSITION michael.
# >>> https://aistudio.google.com/u/1/prompts/1szFxnGrEKhjbHy9xREAlQp6EapdCLKcN
# >>> VR R&D
# >>> https://aistudio.google.com/u/1/prompts/1ShDZkQ3-S555cigxgHORuEv2hQSyMzZX
    

