"""Wiedergabe des öffentlichen 666SOUNDsDESIGn-Streams mit begrenztem Puffer."""
from contextlib import closing
from dataclasses import dataclass
from math import isfinite
from threading import Event, Thread
from time import monotonic

import numpy as np

from light_wave_runtime import output_devices
from light_wave_visualizer import Spectrum, render

# WebRadio-Default-Branch: index.html, STREAM_URL='/stream'. Der öffentliche
# HTTPS-Pfad wurde mit Audioinhalt (MP3, 44,1 kHz, Stereo) gelesen.
STATION = "666SOUNDsDESIGn · Live-Radio"
STREAM_URL = "https://webradio.666soundsdesign-broadcaster.com/stream"
HISTORY_FRAMES = 4096
ATTEMPTS = 3
IO_TIMEOUT = 6


@dataclass(frozen=True)
class RadioState:
    status: str
    rate: int = 0
    audio: np.ndarray | None = None
    failed: bool = False
    position: float = 0
    duration: float = 0


def open_live_output(sd, source_rate):
    error = None
    for index, device in output_devices(sd):
        maximum = device["max_output_channels"]
        default_rate = device.get("default_samplerate")
        rates = [source_rate]
        if default_rate and isfinite(default_rate) and default_rate > 0:
            rates.append(round(default_rate))
        rates.extend((48000, 44100))
        for channels in range(min(2, maximum), 0, -1):
            for rate in dict.fromkeys(rates):
                stream = None
                try:
                    settings = dict(device=index, channels=channels, samplerate=rate, dtype="float32")
                    sd.check_output_settings(**settings)
                    stream = sd.OutputStream(**settings)
                    stream.start()
                except (sd.PortAudioError, ValueError) as fault:
                    error = fault
                    if stream is not None:
                        stream.close()
                    continue
                print(f"Live-Audio: {device.get('name', index)} · {rate} Hz · {channels} Kanal/Kanäle")
                return stream, rate, channels
    raise RuntimeError(f"Kein kompatibler Audioausgang: {error or 'kein Ausgabegerät'}")


class LiveRadio:
    def __init__(self, av, sd, url, *, tls_ca, live=True):
        self.av = av
        self.sd = sd
        self.url = url
        self.tls_ca = tls_ca
        self.live = live
        self.volume = 1.0
        self.audio_tap = None
        self.paused = Event()
        self.stop = Event()
        self.state = RadioState("Verbinde …")

    def receive(self):
        if not self.live:
            try:
                self.decode_once()
                if not self.stop.is_set():
                    state = self.state
                    self.state = RadioState("Titel beendet", position=state.duration or state.position,
                                            duration=state.duration)
            except (self.av.FFmpegError, self.sd.PortAudioError, OSError, ValueError, RuntimeError) as error:
                print(f"Lokale Wiedergabe fehlgeschlagen: {error}")
                self.state = RadioState("Datei konnte nicht abgespielt werden · Details im Startprotokoll", failed=True)
            return
        for attempt in range(ATTEMPTS):
            if self.stop.is_set():
                return
            self.state = RadioState("Verbinde …" if attempt == 0 else f"Verbinde erneut … ({attempt + 1}/{ATTEMPTS})")
            try:
                self.decode_once()
                if self.stop.is_set():
                    return
                print("Live-Stream hat die Verbindung beendet.")
            except (self.av.FFmpegError, self.sd.PortAudioError, OSError, ValueError, RuntimeError) as error:
                print(f"Live-Verbindung beendet: {error}")
            if attempt < ATTEMPTS - 1 and self.stop.wait(1.5):
                return
        self.state = RadioState("Wiedergabe beendet · Esc zurück · Details im Startprotokoll", failed=True)

    def decode_once(self):
        options = {"probesize": "65536", "analyzeduration": "1000000",
                   "tls_verify": "1", "ca_file": self.tls_ca}
        media = (self.av.open(self.url, options=options, timeout=(IO_TIMEOUT, IO_TIMEOUT))
                 if self.live else self.av.open(self.url))
        with media as source:
            frames = source.decode(audio=0)
            first = next(frames, None)
            if self.stop.is_set():
                return
            if first is None:
                raise ValueError("Keine Audiodaten verfügbar.")
            stream, rate, channels = open_live_output(self.sd, first.sample_rate)
            with closing(stream):
                resampler = self.av.AudioResampler(format="flt", layout="stereo" if channels == 2 else "mono",
                                                    rate=rate)
                history = np.empty((0, channels), dtype=np.float32)
                duration = source.duration / self.av.time_base if not self.live and source.duration else 0
                written = 0
                label = "LIVE · 666STREAM" if self.live else "Wiedergabe"
                frame = first
                while frame is not None and not self.stop.is_set():
                    for decoded in resampler.resample(frame):
                        while self.paused.is_set() and not self.stop.wait(0.04):
                            pass
                        if self.stop.is_set():
                            return
                        block = np.ascontiguousarray(decoded.to_ndarray().reshape(-1, channels))
                        if self.volume != 1.0:
                            block *= np.float32(self.volume)
                        stream.write(block)
                        if self.audio_tap is not None:
                            timestamp = monotonic() + stream.latency - len(block) / rate
                            self.audio_tap(block, rate, timestamp)
                        written += len(block)
                        history = np.concatenate((history, block), axis=0)[-HISTORY_FRAMES:].copy()
                        self.state = RadioState(label, rate, history, position=written / rate, duration=duration)
                    frame = next(frames, None)
                if not self.live and not self.stop.is_set():
                    stream.stop()


def play_radio():
    import av
    import certifi
    import pygame
    import sounddevice as sd

    radio = LiveRadio(av, sd, STREAM_URL, tls_ca=certifi.where())
    worker = Thread(target=radio.receive, name="666STREAM")
    analyzer = None
    last_rate = None
    pygame.display.init()
    pygame.font.init()
    try:
        screen = pygame.display.set_mode((960, 520))
        pygame.display.set_caption(STATION)
        fonts = pygame.font.Font(None, 36), pygame.font.Font(None, 23)
        render(pygame, screen, fonts, STATION, None, 0, 0, status=radio.state.status)
        worker.start()
        clock = pygame.time.Clock()
        while True:
            dt = clock.tick(35) / 1000
            for event in pygame.event.get():
                if event.type == pygame.QUIT or (
                    event.type == pygame.KEYDOWN and event.key in (pygame.K_ESCAPE, pygame.K_x)
                ):
                    return 2 if radio.state.failed else 0
            state = radio.state
            levels = None
            if state.audio is not None:
                if last_rate != state.rate:
                    analyzer = Spectrum(np.empty(0), state.rate, size=HISTORY_FRAMES)
                    last_rate = state.rate
                levels = analyzer.update_block(state.audio, dt)
            render(pygame, screen, fonts, STATION, levels, 0, 0, status=state.status)
    finally:
        radio.stop.set()
        pygame.quit()
        if worker.ident is not None:
            worker.join()
