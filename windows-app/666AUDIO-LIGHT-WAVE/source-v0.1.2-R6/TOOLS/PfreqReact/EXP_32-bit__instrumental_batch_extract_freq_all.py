# infinite.quantum https://aistudio.google.com/app/prompts/1lzaF_CxtVr93hWzYCiWH_Gl64Eylz_Xn
# conda create -n audio python=3.9.12
# conda activate audio

import librosa
import numpy as np
import scipy.signal
import pandas as pd
import glob
import os

def extract_hits(audio_path, output_csv, fmin=20, fmax=150):
    print(f"Loading audio: {audio_path}...")
    # 1. Load the audio file (librosa handles both mp3 and wav)
    # sr=None preserves the original sample rate of the audio file
    y, sr = librosa.load(audio_path, sr=None)

    # 2. Compute the Short-Time Fourier Transform (STFT)
    # This turns the 1D audio waveform into a 2D grid of Frequencies vs. Time
    hop_length = 128 # Number of audio samples between frames (controls timeline resolution)
    #hop_length = 256 # Number of audio samples between frames (controls timeline resolution)

    # NEW: Define a high n_fft for 48kHz bass precision
    #n_fft = 4096
    n_fft = 8192

    # Pass n_fft explicitly
    D = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
    #D = librosa.stft(y, hop_length=hop_length)
    
    # Convert complex STFT output to magnitude (amplitude/loudness)
    S_magnitude = np.abs(D)

    # 3. Get the frequencies    
    # Pass n_fft here too so the labels match the bins exactly
    freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft) 

    # 3. Get the frequencies that correspond to the rows of our 2D grid
    #freqs = librosa.fft_frequencies(sr=sr)
    
    # Find the row indices that fall within our target bass range (e.g., 20Hz - 150Hz)
    bass_bin_indices = np.where((freqs >= fmin) & (freqs <= fmax))[0]
    
    # 4. Isolate the bass frequencies and calculate the average amplitude per frame
    bass_stft = S_magnitude[bass_bin_indices, :]
    
    # The mean across the isolated frequency bins gives us a continuous 1D curve over time.
    # This is equivalent to the "baked" keyframes in After Effects!
    bass_envelope = np.mean(bass_stft, axis=0)
    
    # Normalize the envelope between 0 and 1 so it's easy to use for animations
    bass_envelope = bass_envelope / np.max(bass_envelope)
    
    # 5. Convert frame indices to time (milliseconds)
    frames = np.arange(len(bass_envelope))
    times_sec = librosa.frames_to_time(frames, sr=sr, hop_length=hop_length)
    times_ms = times_sec * 1000
    
    # 6. Detect the "Hits" (peaks in the bass envelope)
    # distance=10 means hits must be at least 10 frames apart (prevents double-counting a single hit)
    # prominence=0.2 means the hit must stand out by at least 20% compared to surrounding audio
    peaks, _ = scipy.signal.find_peaks(bass_envelope, distance=10, prominence=0.2)
    
    hit_times_ms = times_ms[peaks]
    hit_amplitudes = bass_envelope[peaks]
    
    print(f"Detected {len(peaks)} major bass hits.")

    # 7. Export the Continuous Data (The "Bake") to CSV
    # This saves the timeline in MS and the bass strength from 0.0 to 1.0
    df_continuous = pd.DataFrame({
        'Time_ms': times_ms,
        'Bass_Amplitude': bass_envelope
    })
    df_continuous.to_csv(output_csv, index=False)
    print(f"Exported continuous animation curve to {output_csv}")

    # Print the first 10 hit timestamps as an example
    print("\n--- First 10 Events ---")
    for i in range(min(10, len(hit_times_ms))):
        print(f"Hit {i+1}: {hit_times_ms[i]:.2f} ms (Amplitude: {hit_amplitudes[i]:.2f})")

    return hit_times_ms, df_continuous



base_path = "C:/1/light_wave_tech/DATA/SUNO_HIGHEST_QUALITY/PSY_TRANCE"
suno_instrumental_path = f"C:/1/light_wave_tech/DATA/SUNO_HIGHEST_QUALITY/PSY_TRANCE"

input_filename = f"C:/1/light_wave_tech/DATA/SUNO_HIGHEST_QUALITY/PSY_TRANCE/music_filelist.txt"
with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()
audio_files = text.split('\n')
total_audio_files = len(audio_files)
print(total_audio_files)

for i, audio_path in enumerate(audio_files):
    audio_base_filename = audio_path.replace(".wav", "")
    print(f"{i+1}/{total_audio_files}: audio_base_filename = {audio_base_filename}")
    target_audio_path = f"{suno_instrumental_path}/{audio_base_filename}.wav"

    # Check if the file exists
    if not os.path.exists(target_audio_path):
        print(f"File not found, skipping: {target_audio_path}")
        continue  # Skips the rest of the loop and moves to the next file

### --- PURELY INSTRUMENTAL TRACK WIDEN THE SPECTRUM
# hop_length=128 gives you that ultra-tight ~2.9ms resolution you liked.
# For Bass/Kick: fmin=20, fmax=200
# For Snare:     fmin=200, fmax=4000
# For Hi-hat:    fmin=4000, fmax=20000

### --- VOCALS INCLUDED TRACK KEEP NORMAL SPECTRUM
# hop_length=128 gives you that ultra-tight ~2.9ms resolution you liked.
# For Bass/Kick: fmin=20, fmax=150
# For Snare:     fmin=200, fmax=900
# For Hi-hat:    fmin=4000, fmax=20000


    # --- BASS ---
    # fmin=20 and fmax=150 is great for Kick Drums and Sub Bass.
    hits, animation_curve = extract_hits(
        audio_path=target_audio_path, 
        output_csv=f"{base_path}/audio_sync_data/{audio_base_filename}_bass_keyframes.csv", 
        fmin=20, 
        fmax=200 
    )

    # --- SNARE ---
    hits, animation_curve = extract_hits(
        audio_path=target_audio_path, 
        output_csv=f"{base_path}/audio_sync_data/{audio_base_filename}_snare_keyframes.csv", 
        fmin=200, 
        fmax=4000
    )

    # --- HI-HAT ---
    hits, animation_curve = extract_hits(
        audio_path=target_audio_path, 
        output_csv=f"{base_path}/audio_sync_data/{audio_base_filename}_hihat_keyframes.csv", 
        fmin=4000,
        fmax=20000
    )

