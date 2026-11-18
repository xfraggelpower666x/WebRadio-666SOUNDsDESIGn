import numpy as np
from scipy.io import wavfile
from scipy import signal

def detect_pseudo_stereo(wav_path, max_delay_ms=50.0):
    """
    Analyzes a stereo WAV file to determine if the channels are true stereo, 
    identical mono, or phase-shifted mono (pseudo-stereo).
    """
    try:
        # 1. Read the audio file
        sample_rate, data = wavfile.read(wav_path)
    except Exception as e:
        return f"Error reading file: {e}"

    # 2. Verify the file is stereo
    if len(data.shape) != 2 or data.shape[1] != 2:
        return "Audio is not stereo. Please provide a 2-channel WAV file."

    # 3. Extract channels and convert to float64 to prevent overflow during math
    # We take a 10-second chunk from the middle to speed up processing
    mid_point = len(data) // 2
    chunk_size = 10 * sample_rate
    start = max(0, mid_point - (chunk_size // 2))
    end = min(len(data), mid_point + (chunk_size // 2))
    
    left = data[start:end, 0].astype(np.float64)
    right = data[start:end, 1].astype(np.float64)

    # 4. Normalize the signals (zero mean, unit variance)
    # This ensures amplitude differences don't skew the correlation
    left_norm = (left - np.mean(left)) / (np.std(left) + 1e-10)
    right_norm = (right - np.mean(right)) / (np.std(right) + 1e-10)

    # 5. Calculate max samples to shift based on max_delay_ms
    max_shift_samples = int(sample_rate * (max_delay_ms / 1000.0))

    # 6. Compute Cross-Correlation
    # We use 'valid' mode on padded data to restrict computation to our max delay window
    left_padded = np.pad(left_norm, (max_shift_samples, max_shift_samples), mode='constant')
    correlation = signal.correlate(left_padded, right_norm, mode='valid')
    
    # Normalize correlation array to represent Pearson correlation (-1.0 to 1.0)
    correlation /= len(left_norm)

    # 7. Find the peak correlation and its corresponding lag
    peak_idx = np.argmax(np.abs(correlation))
    peak_correlation = correlation[peak_idx]
    
    # Calculate lag in samples and milliseconds
    lag_samples = peak_idx - max_shift_samples
    lag_ms = (lag_samples / sample_rate) * 1000.0

    # 8. Interpret the results
    print(f"--- Analysis for: {wav_path} ---")
    print(f"Maximum Correlation: {abs(peak_correlation):.4f}")
    print(f"Time Lag at Max Correlation: {lag_ms:.2f} ms ({lag_samples} samples)")

    if abs(peak_correlation) > 0.90 and lag_samples == 0:
        print("Verdict: PURE MONO (Identical signals in Left and Right)")
    elif abs(peak_correlation) > 0.80 and lag_samples != 0:
        print("Verdict: PSEUDO-STEREO (Identical signals, but phase/time shifted)")
    elif abs(peak_correlation) < 0.70:
        print("Verdict: TRUE STEREO (Distinctly different Left and Right channels)")
    else:
        print("Verdict: INCONCLUSIVE (Likely true stereo with heavy center-panning, or heavily EQ'd pseudo-stereo)")
        
    return peak_correlation, lag_ms

# Example usage:
detect_pseudo_stereo(r"C:\1\light_wave_tech\DATA\SUNO_HIGHEST_QUALITY\HARDWAVE\SUPER_EVOLVED\0 xDivine Paradox Overflow OD Climax 001.wav")