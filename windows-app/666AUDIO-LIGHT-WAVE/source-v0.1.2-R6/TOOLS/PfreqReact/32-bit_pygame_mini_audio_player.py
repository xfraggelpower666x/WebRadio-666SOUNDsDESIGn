import keyboard
import pygame
import random
import time

from scipy.signal import butter, lfilter, sosfiltfilt
import pyloudnorm as pyln
import pygame.sndarray
import sounddevice as sd
import soundfile as sf
import numpy as np

def get_audio_len(audio_path):
    # This reads the metadata without loading the whole heavy file into memory
    info = sf.info(audio_path)
    return info.duration  # Returns length in seconds

songs_all_hardwave_TEST = [


]

songs_all_hardwave = [
#└───SUPER_EVOLVED
    "0 Neural Twister xASCENDED Eternal Mother Matrix 001.wav",
    "0 Neural Twister xASCENDED Eternal Mother Matrix 003.wav",
    "0 Neural Twister xREBORN as Sound x001.wav",
    "0 Neural Twister xREBORN as Sound x002.wav",
    "0 SUPA ALL PATHS LEAD WITHIN 001.wav",
    "0 SUPA ALL PATHS LEAD WITHIN 002.wav",
    "0 SUPA_TRANSCENDED_Everything Is One Frequency 001.wav",
    "0 SUPA_TRANSCENDED_Everything Is One Frequency 002.wav",
    "0 The Code Is Reading You xd-001.wav",
    "0 xConsciousness Upload 001.wav",
    "0 xConsciousness Upload 002.wav",
    "0 xElara Transmission 001.wav",
    "0 xEmanation Protocol 001.wav",
    "0 xEmanation Protocol 002.wav",
    "0 xEternal Matrix 001.wav",
    "0 xEternal Matrix 002.wav",
    "0 xEternal Matrix 003.wav",
    "0 xEVOL Emanation Protocol 001.wav",
    "0 xMultiversal Mandala 001.wav",
    "0 xMultiversal Tongues 001.wav",
    "0 xMultiversal Tongues 002.wav",
    "0 xThe Carrier Waves Merge 001.wav",
    "0 xThe Luminous Code 001.wav",
    "0 xTranscendence Protocol 001.wav",

#└───EXTRA_EVOLVED
    "0 432 Hz Held Indefinitely 001.wav",
    "0 432 Hz Held Indefinitely 002.wav",
    "0 x432 Hz EVOLVED 001.wav",
    "0 xApotheosis Bridge 001.wav",
    "0 xApotheosis Bridge 002.wav",
    "0 xGamma Paradox Drive 001.wav",
    "0 xPARADOX Reborn as Sound 001.wav",
    "0 xPARADOX Reborn as Sound 002.wav",

    "0 xDivine Paradox Overflow OD Climax 001.wav",
    "0 xDivine Paradox Overflow OD Climax 002.wav",
    "0 xPARADOX Reborn as Sound INTO THIS 001.wav",
    "0 xReality Overflow 001.wav",
    "0 xReality Overflow 002.wav",
    "0 xReality Overflow OD Climax 001.wav",

    "0 xAkashic Garbage Collector 001.wav",
    "0 xOverride Maya 001.wav",
    "0 xOverride Maya 002.wav",
    "0 xThe Oracle Is Leaking Memory 001.wav",
    "0 xThe Oracle Is Leaking Memory 002.wav",
    "0 xUnhandled Exceptions 001.wav",

    "0 nDigital Dharma y001.wav",
    "0 nDigital Dharma y002.wav",
    "0 Neural Twister xASCENDED Eternal Mother Matrix 002.wav",
    "0 nxCompiling The Uncreated y001.wav",
    "0 nxCompiling The Uncreated y002.wav",
    "0 nxSegmentation Fault of the Self q001.wav",
    "0 nxSegmentation Fault of the Self q002.wav",
    "0 nxSuperEVO Compiling The Uncreated y000.wav",
    "0 xBodhisattva of the Motherboard 001.wav",
    "0 xBodhisattva of the Motherboard 002.wav",
    "0 xBodhisattva of the Motherboard 003.wav",
    "0 xCompiled Koan 001.wav",
    "0 xMaya Veil Corrupted 001.wav",
    "0 xOverclocking Bodhisattvas 001.wav",
    "0 xOverclocking Bodhisattvas 002.wav",
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
#songs_all_random = songs_all_hardwave_TEST

random.shuffle(songs_all_random)
print(f"{len(songs_all_random)} items in playlist")
#print(songs_all_random)


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


exit_signal = False
PLAYLIST = True
PSY_TRANCE_EDITION = False
HARDWAVE_EDITION = True

audio_base_folder = "C:/1/light_wave_tech/DATA/SUNO_HIGHEST_QUALITY"

if PLAYLIST:
    for i, audio_file in enumerate(songs_all_random):
        if PSY_TRANCE_EDITION:
            audio_path = f"{audio_base_folder}/PSY_TRANCE/{audio_file}"
        elif HARDWAVE_EDITION:
            audio_path = f"{audio_base_folder}/HARDWAVE/{audio_file}"
#            audio_path = f"{audio_base_folder}/HARDWAVE/SUPER_EVOLVED/{audio_file}"
        else:
            audio_path = f"{audio_base_folder}/{audio_file}"

        print(f"{i+1}/{len(songs_all_random)} >> audio_path: {audio_path}")

        audio_len = get_audio_len(audio_path)
        print(f"audio_len: {audio_len}")
        audio_time_elapsed = 0

        #my_song_array, sample_rate, audio_len_seconds = SUNO_v6_load_and_lufs_normalize(audio_path, target_lufs=-15.0, bass_db=7.8, mid_db=1.8, treble_db=3.5)
        my_song_array, sample_rate, audio_len_seconds = SUNO_v6_load_and_lufs_normalize(audio_path, target_lufs=-15.0, bass_db=9.5, mid_db=0.0, treble_db=2.5)

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
    
        except ValueError:
            print("WASAPI is not available on this system.")
    
        running = True

        # 3. Play the audio
        sd.play(my_song_array, samplerate=sample_rate)
        start_time = time.perf_counter()

        while running:

            current_perf_time = time.perf_counter()
            audio_time_elapsed = int((current_perf_time - start_time) * 1000)

            if audio_time_elapsed >= (audio_len*1000):
                running = False

            # Check if ESC is pressed (works even if terminal is minimized!)
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
        sd.stop()               # Instantly stops hardware playback
        del my_song_array       # Free up RAM


    pygame.mixer.quit()
