"""Endpegel für den fertig gemischten Float32-Ausgabepuffer."""
import numpy as np
from scipy.signal import resample_poly


def finalize_output(audio, peak_db=-1.0):
    audio = np.asarray(audio, dtype=np.float32)
    if audio.size == 0 or not np.isfinite(audio).all():
        raise ValueError("Die Audiodaten sind leer oder enthalten ungültige Samples.")
    channels = audio.reshape(len(audio), -1)
    ceiling = 10 ** (peak_db / 20)
    peak = float(np.max(np.abs(audio)))
    # Vierfache Abtastung als True-Peak-Näherung. Kanalweise rechnen.
    for channel in channels.T:
        peak = max(peak, float(np.max(np.abs(resample_poly(channel, 4, 1)))))
    return audio * (ceiling / peak) if peak > ceiling else audio
