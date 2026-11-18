# infinite.quantum https://aistudio.google.com/app/prompts/1lzaF_CxtVr93hWzYCiWH_Gl64Eylz_Xn

import librosa
import numpy as np
import scipy.signal
import pandas as pd

def extract_hits(audio_path, output_csv, fmin=20, fmax=150):
    print(f"Loading audio: {audio_path}...")
    # 1. Load the audio file (librosa handles both mp3 and wav)
    # sr=None preserves the original sample rate of the audio file
    y, sr = librosa.load(audio_path, sr=None)

    # 2. Compute the Short-Time Fourier Transform (STFT)
    # This turns the 1D audio waveform into a 2D grid of Frequencies vs. Time
    hop_length = 512 # Number of audio samples between frames (controls timeline resolution)
    D = librosa.stft(y, hop_length=hop_length)
    
    # Convert complex STFT output to magnitude (amplitude/loudness)
    S_magnitude = np.abs(D)
    
    # 3. Get the frequencies that correspond to the rows of our 2D grid
    freqs = librosa.fft_frequencies(sr=sr)
    
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


audio_path = "Cybernetic Nirvana Upload.wav"
audio_base_filename = audio_path.replace("\\", "/")
audio_base_filename = audio_base_filename.split("/")
audio_base_filename = audio_base_filename[len(audio_base_filename)-1]
audio_base_filename = audio_base_filename.split(".wav")
audio_base_filename = audio_base_filename[0]
print(f"audio_base_filename = {audio_base_filename}")

# --- BASS ---
# fmin=20 and fmax=100 is great for Kick Drums and Sub Bass.
hits, animation_curve = extract_hits(
    audio_path=audio_path, 
    output_csv=f"{audio_base_filename}_bass_keyframes.csv", 
    fmin=20, 
    fmax=100 
)

# --- SNARE ---
hits, animation_curve = extract_hits(
    audio_path=audio_path, 
    output_csv=f"{audio_base_filename}_snare_keyframes.csv", 
    fmin=300, 
    fmax=900 
)

# --- HI-HAT ---
hits, animation_curve = extract_hits(
    audio_path=audio_path, 
    output_csv=f"{audio_base_filename}_hihat_keyframes.csv", 
    fmin=4000,
    fmax=10000
)



"""
Tuning the Parameters:

Targeting specific instruments: If you want to isolate a snare drum instead of a bassline, change fmin and fmax to the snare's prominent frequencies (usually around 200 Hz to 900 Hz). High-hats usually live around 4000 Hz to 10000 Hz.

Adjusting timeline resolution: If your timeline data isn't precise enough, lower the hop_length variable from 512 to 256. This makes the "frames" closer together, generating a higher-resolution path (at the cost of taking a little longer to process).
"""