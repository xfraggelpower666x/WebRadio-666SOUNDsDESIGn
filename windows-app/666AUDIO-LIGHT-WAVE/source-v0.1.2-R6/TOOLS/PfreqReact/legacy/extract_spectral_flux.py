import librosa
import numpy as np
import scipy.signal
import pandas as pd

def extract_hits_spectral_flux(audio_path, output_csv, fmin=20, fmax=150, hop_length=128):
    print(f"Loading audio: {audio_path}...")
    # 1. Load the audio file
    y, sr = librosa.load(audio_path, sr=None)

    print(f"Calculating Spectral Flux (Impacts) between {fmin}Hz and {fmax}Hz...")
    
    # 2. Compute the Onset Strength Envelope (Spectral Flux)
    # By giving it fmin and fmax, it ignores the rest of the song and ONLY 
    # looks for sudden changes (impacts) inside the target frequency range.
    onset_env = librosa.onset.onset_strength(
        y=y, 
        sr=sr, 
        hop_length=hop_length, 
        fmin=fmin, 
        fmax=fmax
    )
    
    # 3. Normalize the envelope between 0.0 and 1.0 
    # This ensures your Pygame THRESHOLDS (like > 0.40) still work perfectly.
    onset_env = onset_env / np.max(onset_env)
    
    # 4. Convert frames to time (milliseconds)
    frames = np.arange(len(onset_env))
    times_sec = librosa.frames_to_time(frames, sr=sr, hop_length=hop_length)
    times_ms = times_sec * 1000
    
    # 5. Detect the "Hits" for logging purposes
    # Using scipy's find_peaks on the onset envelope is highly accurate.
    # prominence=0.15 means the impact must stand out clearly from the background.
    peaks, _ = scipy.signal.find_peaks(onset_env, distance=10, prominence=0.20)
    
    hit_times_ms = times_ms[peaks]
    hit_amplitudes = onset_env[peaks]
    
    print(f"Detected {len(peaks)} major impacts/hits.")

    # 6. Export the Continuous Data to CSV
    # We name the column 'Bass_Amplitude' so your Pygame CSV reader doesn't break.
    df_continuous = pd.DataFrame({
        'Time_ms': times_ms,
        'Bass_Amplitude': onset_env 
    })
    
    df_continuous.to_csv(output_csv, index=False)
    print(f"Exported continuous animation curve to {output_csv}")

    return hit_times_ms, df_continuous

#audio_path = "Cybernetic Nirvana Upload.wav"
#audio_path = "C:/1/grok-video_glitch_elara/SUNO_HIGHEST_QUALITY/LOS_FINALOS.mp3"
audio_path = "C:/1/nude_grok-video_glitch_elara/AUDIO/Psychedelic Therapy Radio Vol. 30.mp3"

audio_base_filename = audio_path.replace("\\", "/")
audio_base_filename = audio_base_filename.split("/")
audio_base_filename = audio_base_filename[len(audio_base_filename)-1]

if ".mp3" in audio_base_filename:
    audio_base_filename = audio_base_filename.split(".mp3")
else:
    audio_base_filename = audio_base_filename.split(".wav")

audio_base_filename = audio_base_filename[0]
print(f"audio_base_filename = {audio_base_filename}")

# --- Run the Function ---
# hop_length=128 gives you that ultra-tight ~2.9ms resolution you liked.
# For Bass/Kick: fmin=20, fmax=150
# For Snare:     fmin=200, fmax=2000
# For Hi-hat:    fmin=4000, fmax=10000

print("\n--- Processing Bass ---")
hits_bass, curve_bass = extract_hits_spectral_flux(
    audio_path=audio_path, 
    output_csv=f"{audio_base_filename}_bass_keyframes.csv", 
    fmin=20, fmax=150, hop_length=128
)

print("\n--- Processing Snare ---")
hits_snare, curve_snare = extract_hits_spectral_flux(
    audio_path=audio_path, 
    output_csv=f"{audio_base_filename}_snare_keyframes.csv", 
    fmin=200, fmax=2000, hop_length=128
)

print("\n--- Processing Hihat ---")
hits_hihat, curve_snare = extract_hits_spectral_flux(
    audio_path=audio_path, 
    output_csv=f"{audio_base_filename}_hihat_keyframes.csv", 
    fmin=4000, fmax=20000, hop_length=128
)


