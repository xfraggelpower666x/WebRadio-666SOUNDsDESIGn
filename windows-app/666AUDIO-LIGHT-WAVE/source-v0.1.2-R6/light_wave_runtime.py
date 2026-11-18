"""Geräteauswahl und abbrechbarer Video-Preload."""
import logging
from queue import Empty, Full


def output_devices(sounddevice):
    device_error = sounddevice.PortAudioError if hasattr(sounddevice, "PortAudioError") else RuntimeError
    indices = []
    try:
        for api in sounddevice.query_hostapis():
            index = api.get("default_output_device", -1)
            if "WASAPI" in api.get("name", "") and isinstance(index, int) and index >= 0:
                indices.append(index)
    except (device_error, ValueError) as error:
        logging.warning("Audio-Schnittstellen konnten nicht abgefragt werden: %s", error)
    seen = set()
    for index in dict.fromkeys([*indices, None]):
        try:
            device = (sounddevice.query_devices(kind="output") if index is None
                      else sounddevice.query_devices(index, kind="output"))
        except (device_error, ValueError) as error:
            logging.warning("Audio-Ausgang %s nicht verfügbar: %s", index, error)
            continue
        actual_index = device.get("index", index)
        if actual_index not in seen and device["max_output_channels"] > 0:
            seen.add(actual_index)
            yield index, device


def select_output_device(sounddevice):
    for index, device in output_devices(sounddevice):
        return index, device["max_output_channels"]
    raise RuntimeError("Kein Audio-Ausgabegerät verfügbar.")


def play_output(sounddevice, audio, source_rate):
    """Startet das Audio mit einem vom Gerät akzeptierten Float32-Format."""
    from math import gcd, isfinite
    from scipy.signal import resample_poly
    from light_wave_dsp import finalize_output

    source_rate = int(source_rate)
    source_channels = 1 if audio.ndim == 1 else audio.shape[1]
    last_failure = None
    for index, device in output_devices(sounddevice):
        capacity = device["max_output_channels"]
        stereo_channels = min(source_channels, capacity, 2)
        channel_options = [source_channels, stereo_channels] if source_channels <= capacity else [stereo_channels]
        default_rate = device.get("default_samplerate")
        rates = [source_rate]
        if default_rate and isfinite(default_rate) and default_rate > 0:
            rates.append(round(default_rate))
        rates.extend((48000, 44100))
        device_name = device.get("name", "Standardausgang")

        for channels in dict.fromkeys(channel_options):
            source = audio
            if channels < source_channels:
                front = audio[:, :2]
                source = front.mean(axis=1, keepdims=True) if channels == 1 else front
            for rate in dict.fromkeys(rates):
                output_format = f"{device_name} · {rate} Hz · {channels} Kanal/Kanäle"
                try:
                    sounddevice.check_output_settings(device=index, channels=channels, samplerate=rate, dtype="float32")
                    output = source
                    if rate != source_rate:
                        factor = gcd(source_rate, rate)
                        output = resample_poly(source, rate // factor, source_rate // factor, axis=0)
                    if rate != source_rate or channels != source_channels:
                        output = finalize_output(output)
                    sounddevice.play(output, samplerate=rate, device=index)
                except sounddevice.PortAudioError as error:
                    last_failure = f"{output_format}: {error}"
                    logging.warning("Audioformat abgelehnt: %s", last_failure)
                    continue
                print(f"Audio-Ausgabe: {output_format} (Quelle: {source_rate} Hz)")
                return
    if last_failure:
        raise RuntimeError(f"Ausgabestream konnte nicht geöffnet werden. Letzter Versuch: {last_failure}")
    raise RuntimeError("Kein Audio-Ausgabegerät verfügbar.")


def video_loader(filenames, output, stop, open_clip):
    def enqueue(item):
        while not stop.is_set():
            try:
                output.put(item, timeout=0.1)
                return True
            except Full:
                continue
        return False

    for filename in filenames:
        if stop.is_set():
            break
        try:
            clip = open_clip(filename)
        except Exception:
            logging.exception("Video nicht lesbar: %s", filename)
            continue
        if not enqueue((filename, clip)):
            clip.close()
            return
    enqueue((None, None))


def drain_clips(output, close_clip):
    while True:
        try:
            _, clip = output.get_nowait()
        except Empty:
            return
        close_clip(clip)
