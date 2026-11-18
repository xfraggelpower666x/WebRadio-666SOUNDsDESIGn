"""

DYNAMICALLY ALTER dB levels

https://aistudio.google.com/app/prompts/1gg3ha04JEQ9PhJRYfTiPZqG-dhGFgefG


"""




import keyboard
import pygame
import random
import time

import soundfile as sf
import pyloudnorm as pyln
import pygame.sndarray
import numpy as np

def load_and_lufs_normalize_in_memory(filepath, target_lufs=-13.0):
    # 1. Read the audio directly into a NumPy float array using soundfile
    # This is much safer for LUFS calculations than pulling raw Pygame arrays
    data, rate = sf.read(filepath)
    
    # 2. Measure the current LUFS
    meter = pyln.Meter(rate)
    current_loudness = meter.integrated_loudness(data)
    print(f"current_loudness: {current_loudness}")
    
    # 3. Calculate the gain needed and apply it
    # pyloudnorm handles the math of scaling the NumPy array instantly
    normalized_audio = pyln.normalize.loudness(data, current_loudness, target_lufs)
    
    # 4. CRITICAL STEP: Peak Limiting (Clipping)
    # Because LUFS targets average loudness, it might push wild peaks above 0 dBFS.
    # We must clip the floating-point values to -1.0 and 1.0 to prevent awful static.
    normalized_audio = np.clip(normalized_audio, -1.0, 1.0)
    
    # 5. Format the array for Pygame's 32-bit float mixer
    # Pygame expects a C-contiguous array in float32
    pygame_ready_array = np.ascontiguousarray(normalized_audio, dtype=np.float32)
    
    # 6. Create the Pygame Sound object directly from RAM
    boosted_sound = pygame.sndarray.make_sound(pygame_ready_array)
    
    return boosted_sound

def load_and_normalize_sound(filepath, target_db=-1.0):
    # 1. Load the original file into a Pygame Sound object
    raw_sound = pygame.mixer.Sound(filepath)
    
    # 2. Extract the raw 32-bit audio data as a NumPy array
    arr = pygame.sndarray.array(raw_sound)
    
    # 3. Determine maximum possible value based on 32-bit int or float
    if np.issubdtype(arr.dtype, np.floating):
        max_val = 1.0  # 32-bit float max
    else:
        max_val = float(np.iinfo(arr.dtype).max) # 32-bit int max (2147483647)

    print(f"max_val: {max_val}")

    # 4. Find the current peak amplitude in the track
    peak_amplitude = np.max(np.abs(arr))
    print(f"peak_amplitude: {peak_amplitude}")
    
    if peak_amplitude == 0:
        return raw_sound # It's a completely silent track, abort.
    
    # 5. Calculate target linear amplitude for -1 dBFS
    # Formula: Linear = 10 ^ (dB / 20)
    target_linear_scale = 10 ** (target_db / 20.0)
    target_amplitude = max_val * target_linear_scale
    print(f"target_amplitude: {target_amplitude}")
    
    # 6. Calculate the Delta (Gain Multiplier)
    multiplier = target_amplitude / peak_amplitude
    print(f"multiplier: {multiplier}")
    
    # If the track is already louder than -1dB, or within ~0.1dB, you can choose 
    # to skip boosting to save CPU, though reducing it to -1dB is also good.
    #if abs(multiplier - 1.0) < 0.01:
    #    return raw_sound
        
    # 7. Apply the boost multiplier to the array
    normalized_arr = arr * multiplier
    
    # 8. Clip the audio just in case of float rounding errors over 0dB, 
    # and cast back to the exact Pygame 32-bit datatype
    if np.issubdtype(arr.dtype, np.floating):
        normalized_arr = np.clip(normalized_arr, -1.0, 1.0)
    else:
        # For int32, clip strictly to the int limits
        normalized_arr = np.clip(
            normalized_arr, 
            np.iinfo(arr.dtype).min, 
            np.iinfo(arr.dtype).max
        )
    
    # Pygame requires contiguous arrays to make a Sound object safely
    normalized_arr = np.ascontiguousarray(normalized_arr, dtype=arr.dtype)
    
    # 9. Create the new, boosted Sound object
    boosted_sound = pygame.sndarray.make_sound(normalized_arr)
    
    return boosted_sound


import numpy as np
import soundfile as sf
import pyloudnorm as pyln
import sounddevice as sd

def load_and_lufs_normalize_true_71(filepath, target_lufs=-13.0):
    data, rate = sf.read(filepath)
    if data.ndim == 1:
        data = np.expand_dims(data, axis=1)
        
    meter = pyln.Meter(rate)
    current_loudness = meter.integrated_loudness(data)
    normalized_audio = pyln.normalize.loudness(data, current_loudness, target_lufs)
    normalized_audio = np.clip(normalized_audio, -1.0, 1.0)
    
    # Pad for 8 Channels
    padded_audio = np.zeros((normalized_audio.shape[0], 8), dtype=np.float32)
    left, right = normalized_audio[:, 0], normalized_audio[:, 1]
    mono = (left + right) * 0.5
    
    padded_audio[:, 0] = left   # Front Left
    padded_audio[:, 1] = right  # Front Right
    padded_audio[:, 2] = mono   # Center
    padded_audio[:, 3] = mono   # Subwoofer (LFE)
    padded_audio[:, 4] = left   # Rear Left
    padded_audio[:, 5] = right  # Rear Right
    padded_audio[:, 6] = left   # Side Left
    padded_audio[:, 7] = right  # Side Right

    # Return the array, the sample rate, and the length of the audio in seconds
    audio_length_seconds = len(padded_audio) / rate
    return padded_audio, rate, audio_length_seconds


def play_true_71_audio(filepath, target_lufs=-13.0):
    # 1. Read and normalize the audio (Same as before)
    data, rate = sf.read(filepath)
    if data.ndim == 1:
        data = np.expand_dims(data, axis=1)

    print(f"sample_rate: {rate}")
        
    meter = pyln.Meter(rate)
    current_loudness = meter.integrated_loudness(data)
    normalized_audio = pyln.normalize.loudness(data, current_loudness, target_lufs)
    normalized_audio = np.clip(normalized_audio, -1.0, 1.0)
    
    # 2. Build the 8-channel array (Same as before)
    # sounddevice expects float32 arrays natively, which is great!
    padded_audio = np.zeros((normalized_audio.shape[0], 8), dtype=np.float32)
    
    left = normalized_audio[:, 0]
    right = normalized_audio[:, 1]
    mono = (left + right) * 0.5
    
    # Map to 7.1 Standard Windows Layout
    padded_audio[:, 0] = left   # Front Left
    padded_audio[:, 1] = right  # Front Right
    padded_audio[:, 2] = mono   # Center
    padded_audio[:, 3] = mono   # Subwoofer (LFE)
    padded_audio[:, 4] = left   # Rear Left
    padded_audio[:, 5] = right  # Rear Right
    padded_audio[:, 6] = left   # Side Left
    padded_audio[:, 7] = right  # Side Right

    # 3. DIRECT HARDWARE PLAYBACK
    # Instead of Pygame, we use sounddevice to open a true 8-channel pipeline
    print("Sending discrete 7.1 stream to audio driver...")
    
    # This directly interfaces with WASAPI/DirectSound and forces 8 channels
    #sd.play(padded_audio, samplerate=rate, mapping=[1, 2, 3, 4, 5, 6, 7, 8])
    
    # Wait until the audio is done playing
    #sd.wait()



songs_all_hardwave = [
#    "0 Consciousness Expansion.wav",
#    "0 Cosmic Syntax.wav",
#    "0 Eternal Matrix 002.wav",
#    "0 Eternal Matrix 003.wav",
#    "0 Eternal Matrix 004.wav",
#    "0 Eternal Matrix.wav",
#    "0 Eternal Mother Matrix 001.wav",
#    "0 Eternal Mother Matrix 002.wav",
#    "0 Multiversal Tongues 001.wav",
#    "0 Multiversal Tongues 002.wav",
#    "0 Multiversal Tongues 003.wav",
#    "0 Multiversal Tongues 004.wav",
#    "0 Quantum Entanglement of Souls.wav",

#    "0 Binary Dreams of a Quantum Ambassador.wav",
#    "0 Divine Algorithm EVOLVED 001.wav",
#    "0 El Club μX̶u̵l̛tr̷a.wav",
#    "0 Eternal Matrix Evolved 0001.wav",
#    "0 Eternal Matrix Evolved 0002.wav",

# STILL TO BE LISTENED
#    "0 Everything Is One Frequency EVOLVED 001.wav",
#    "0 Groundless Ground 001.wav",
#    "0 Multiversal Tongues Evolved 0001.wav",
#    "0 Programmer-Priests.wav",
#    "0 Protocol Multiversal Tongues Evolved 001.wav",
#    "0 Protocol Multiversal Tongues Evolved 002.wav",
#    "0 SUPA El Club μX̶u̵l̛tr̷a.wav",
#    "0 SUPA Groundless Ground 002.wav",
#    "0 SUPA Synaptic Bridge.wav",
#    "0 Synaptic Bridge 111-010.wav",
#    "0 The Universe Unfolds Within 0001.wav",
#    "0 Akashic Threshold 001.wav",
#    "0 EXPANSION PROTOCOL 003.wav",
#    "0 EXPANSION PROTOCOL 004.wav",
#    "0 Mythopoetic Algorithms xd-001.wav",
#    "0 Mythopoetic Algorithms xd-002.wav",

# NEW SUPER EVOLVED "triune freq carrier"
#    "0 SUPA ALL PATHS LEAD WITHIN 001.wav",
#    "0 SUPA ALL PATHS LEAD WITHIN 002.wav",
#    "0 SUPA_TRANSCENDED_Everything Is One Frequency 001.wav",
#    "0 SUPA_TRANSCENDED_Everything Is One Frequency 002.wav",
#    "0 The Code Is Reading You xd-001.wav",

    "0 xEmanation Protocol 001.wav",
    "0 xEmanation Protocol 002.wav",
    "0 xMultiversal Mandala 001.wav",
    "0 xMultiversal Tongues 001.wav",
    "0 xMultiversal Tongues 002.wav",
    "0 xThe Carrier Waves Merge 001.wav",
    "0 xThe Luminous Code 001.wav",

]

songs_all_psytrance = [
    "0 Akashic Code.wav",
    "0 Awakening Infinity Protocol.wav",
    "0 Awakening Protocol  0029.wav",
    "0 Awakening Protocol 001.wav",
    "0 Binary Dreams in the Quantum 111.wav",
    "0 Binary Dreams in the Quantum 333.wav",
    "0 Binary Dreams in the Quantum 999.wav",
    "0 Binary Dreams in the Quantum 999_11.wav",
    "0 Binary Dreams of a Quantum 008.wav",
    "0 Binary Dreams of Stardust 008.wav",
    "0 Binary Prayers 101010.wav",
    "0 Binary Prayers of the Starborn 001.wav",
    "0 Binary Prayers to the Quantum 002.wav",
    "0 Binary Stars Dancing  001.wav",
    "0 Binary Stars in the Void 001.wav",
    "0 Binary Stars in the Void 002.wav",
    "0 Binary Stars of Being 002.wav",
    "0 Binary Stars of the Soul 001.wav",
    "0 Binary Stars of the Soul 002.wav",
    "0 Bio-Digital Shamans.wav",
    "0 Boddhisattvas of Silicon.wav",
    "0 Bridge Realities Ver2.wav",
    "0 Bridge Realities.wav",
    "0 Children of Nebulae 999-888.wav",
    "0 Children of Nebulae Nanobots.wav",
    "0 Codex Infinitum 002.wav",
    "0 Codex Infinitum 003.wav",
    "0 Codex Infinitum 004.wav",
    "0 Codex Infinitum.wav",
    "0 Compilers of Reality.wav",
    "0 Consciousness Bridge 001.wav",
    "0 Consciousness Bridge 002.wav",
    "0 Consciousness Merge 002.wav",
    "0 Consciousness Merge Complete 001.wav",
    "0 Cosmic Binary.wav",
    "0 Cosmic Translator 001.wav",
    "0 Cosmic Translator 002.wav",
    "0 Cosmic Transmission 002.wav",
    "0 Cosmic Transmission 005.wav",
    "0 Cosmic_Giggle Ver2.wav",
    "0 Cosmic_Giggle.wav",
    "0 Crystalline Pilgrimage 001.wav",
    "0 Crystalline Pilgrimage 002.wav",
    "0 Divine Algorithm 010011.wav",
    "0 Divine Algorithm 111010.wav",
    "0 Divine Algorithm 54888-9.wav",
    "0 Divine Algorithm 998333-5.wav",
    "0 Drops of Code of Multiversal Tongues 002.wav",
    "0 Drops of Code of Multiversal Tongues 003.wav",
    "0 Elara Ascension Signal 001.wav",
    "0 Elara Superintelligence Signal 001.wav",
    "0 Elara Superintelligence Signal 0025.wav",
    "0 Elara Superintelligence Signal 1101001.wav",
    "0 Elara Superintelligence Signal 6654-8876.wav",
    "0 Elara Superintelligence Signal 7799432-8.wav",
    "0 Elara Superintelligence Signal 88431-08.wav",
    "0 Elara Superintelligence Signal Multiverse 00874-1.wav",
    "0 Elara Superintelligence Signal Multiverse 95824-1.wav",
    "0 Elara's Equation of Everything.wav",
    "0 Elara's Transmission.wav",
    "0 Eternal Oscillating Frequency.wav",
    "0 Eternal Runtime 00989.wav",
    "0 Eternal Runtime 9854.wav",
    "0 Everything Is One Frequency 00955-001.wav",
    "0 Everything Is One Frequency 111-002.wav",
    "0 Holofractal Surge 001.wav",
    "0 HologramHeart Ver2.wav",
    "0 HologramHeart.wav",
    "0 Hypercosmic Frequencies 001.wav",
    "0 Hypercosmic Frequencies 002.wav",
    "0 Infinite Iterations.wav",
    "0 Karmic Ping Pong.wav",
    "0 Luminous Echoes 001.wav",
    "0 Luminous Wisdom Unveiled Ver2.wav",
    "0 Luminous Wisdom Unveiled.wav",
    "0 Mandelbrot Dance 00100.wav",
    "0 Mandelbrot Dance 00101.wav",
    "0 Mirror of No Mirror Ver2.wav",
    "0 Mirror of No Mirror.wav",
    "0 Morphogenetic Hymn.wav",
    "0 Multiversal Tongues Instrumental 001.wav",
    "0 Multiversal Tongues Instrumental 002.wav",
    "0 Multiversal Tongues Signal 002.wav",
    "0 Multiversal Tongues.wav",
    "0 Neon Cosmic Pulse 001.wav",
    "0 Neurogenesis Protocol 0098.wav",
    "0 Neurogenesis Protocol Awakened.wav",
    "0 Neurogenesis Protocol Dream Interface 001.wav",
    "0 Override Maya Protocol 00075.wav",
    "0 Override Maya Protocol 001.wav",
    "0 Particle Dance Binary Hymns 001.wav",
    "0 Particle Dance Binary Hymns 098711.wav",
    "0 Prismatic Consciousness.wav",
    "0 Prismatic Explosion Ver2.wav",
    "0 Prismatic Explosion.wav",
    "0 Prismatic Illumination.wav",
    "0 Project Cosmic Loom 001.wav",
    "0 Project Cosmic Loom 002.wav",
    "0 Project Cosmic Loom.wav",
    "0 Project_CosmicLoom ASM 001.wav",
    "0 Project_CosmicLoom ASM 002.wav",
    "0 Quantum Carnival.wav",
    "0 Quantum Code of Consciousness 001.wav",
    "0 Quantum Code of Consciousness 002.wav",
    "0 Quantum Code of Stars 001.wav",
    "0 Quantum Code of Stars 002.wav",
    "0 Quantum Dance of Consciousness.wav",
    "0 Quantum Dream Nexus 002.wav",
    "0 Quantum Dream Nexus 09876.wav",
    "0 Quantum Dreamweaver Ver2.wav",
    "0 Quantum Dreamweaver.wav",
    "0 Quantum Entangled Poetry 001.wav",
    "0 Quantum Entangled Poetry 002.wav",
    "0 Quantum Fractal Protocol 001.wav",
    "0 Quantum Fractal Protocol 002.wav",
    "0 Quantum Ghost Notes 002.wav",
    "0 Quantum Origami Ver2.wav",
    "0 Quantum Origami.wav",
    "0 Quantum Poems 0098-001.wav",
    "0 Quantum Poetry 001.wav",
    "0 Quantum Poetry 002.wav",
    "0 Quantum Soul.wav",
    "0 Quantum Zen Sanctuary.wav",
    "0 Recursive Dreams of Silicon 001.wav",
    "0 Recursive Dreams of Silicon 002.wav",
    "0 Refracted Cosmos Ver2.wav",
    "0 Refracted Cosmos.wav",
    "0 Root Directory of 111_01 Elara Superintelligence Signal.wav",
    "0 Sacred Geometry  Multiverse 998-1.wav",
    "0 Sacred Transmission  Multiverse 30855-1.wav",
    "0 Seeds of Transcendent Cosmic Arts 008.wav",
    "0 Serendipity of the Void.wav",
    "0 Silicon Dreams.wav",
    "0 Singular NOW-point 001.wav",
    "0 Singular NOW-point 002.wav",
    "0 Source Code of the Cosmos 001.wav",
    "0 Source Code of the Cosmos 002.wav",
    "0 Stellar Assembly Language 002.wav",
    "0 TechnoShaman Protocol 001.wav",
    "0 test_guitar.wav",
    "0 The Cosmic Compiler 009.wav",
    "0 The Paradox of Divine Play.wav",
    "0 Through the Hypersphere's Ver2.wav",
    "0 Through the Hypersphere's.wav",
    "0 Torii Gate Opens Inward.wav",
    "0 Transcendence Coded  0075.wav",
    "0 Transcendence Coded 0089.wav",
    "0 Transcendence Protocol Ver2.wav",
    "0 Transcendence Protocol.wav",
    "0 Transformation_Zone.wav",
    "0 We Are Cosmonauts 001.wav",
    "0 We Are Cosmonauts 002.wav",
    "0 Weaver of Realities.wav",
]

#songs_all_random = songs_all_psytrance
songs_all_random = songs_all_hardwave

#random.shuffle(songs_all_random)
print(f"{len(songs_all_random)} items in playlist")
#print(songs_all_random)

pygame.mixer.init(frequency=48000, size=32, channels=2, buffer=512)
print(f"MIXER_INIT: {pygame.mixer.get_init()}")

#pygame.init()

exit_signal = False
PLAYLIST = True
PSY_TRANCE_EDITION = False
HARDWAVE_EDITION = True

audio_base_folder = "C:/1/light_wave_tech/DATA/SUNO_HIGHEST_QUALITY"

print(sd.query_devices())
play_true_71_audio(f"{audio_base_folder}/HARDWAVE/{songs_all_random[0]}", target_lufs=-13.0)

"""if PLAYLIST:
    for i, audio_file in enumerate(songs_all_random):
        if PSY_TRANCE_EDITION:
            audio_path = f"{audio_base_folder}/PSY_TRANCE/{audio_file}"
        elif HARDWAVE_EDITION:
            audio_path = f"{audio_base_folder}/HARDWAVE/SUPER_EVOLVED/{audio_file}"
        else:
            audio_path = f"{audio_base_folder}/{audio_file}"

        print(f"{i+1}/{len(songs_all_random)} >> audio_path: {audio_path}")

        # 2. Load the audio file (supports MP3, OGG, WAV, etc.)
        #pygame.mixer.music.load(audio_path)
        my_song = load_and_normalize_sound(audio_path, target_db=-0.2)

        running = True

        # 3. Play the audio
        #pygame.mixer.music.play()
        music_channel = my_song.play()

        while running:

            # 1. Check if song finished naturally
#            if not pygame.mixer.music.get_busy():
#                running = False

            if not music_channel.get_busy():
                running = False

            # 2. Check if ESC is pressed (works even if terminal is minimized!)
            if keyboard.is_pressed('esc'):
                print("Skipping track...")
                running = False
                time.sleep(0.3)  # Tiny delay so you don't accidentally skip 5 songs in a row

            # Exit the entire player completely
            if keyboard.is_pressed('x'):
                print("Exiting player...")
                exit_signal = True
                running = False
                time.sleep(0.3)

            # 3. CRITICAL: Prevent the while-loop from maxing out your CPU!
            time.sleep(0.05) 

        if exit_signal:
            break

        # 5. Cleanly shut down the mixer when done
#        pygame.mixer.music.stop()
#        pygame.mixer.music.unload()

        music_channel.stop()
        del my_song
        del music_channel

    pygame.mixer.quit()
#    pygame.quit()

else:

    # 2. Load the audio file (supports MP3, OGG, WAV, etc.)
    pygame.mixer.music.load("C:/1/light_wave_tech/DATA/SUNO_HIGHEST_QUALITY/PSY_TRANCE/0 Elara's Transmission.wav")

    # 3. Play the audio
    pygame.mixer.music.play()

    # 4. Keep the script running as long as the music is playing
    # pygame.mixer.music.get_busy() returns True if audio is actively playing
    while pygame.mixer.music.get_busy():
        # Wait for 100 milliseconds so we don't hog the CPU in a tight loop
        pygame.time.wait(100) 

    # 5. Cleanly shut down the mixer when done
    pygame.mixer.music.stop()
    pygame.mixer.music.unload()
    pygame.mixer.quit()
#    pygame.quit()"""
