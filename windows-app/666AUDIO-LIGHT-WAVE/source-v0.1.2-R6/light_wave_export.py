"""Videoaufnahme der Renderfläche und Audio-Konvertierung."""
from fractions import Fraction
from itertools import chain
from pathlib import Path
from uuid import uuid4

import numpy as np

AUDIO_RATE = 48000
VIDEO_FPS = 30
WIDTH, HEIGHT = 1280, 720
H264 = ("h264_nvenc", "h264_qsv", "h264_amf", "libx264")
VIDEO_FORMATS = {
    "MP4": (".mp4", "mp4", "H.264", "aac", "AAC", H264),
    "WebM": (".webm", "webm", "VP9", "libopus", "Opus", ("libvpx-vp9",)),
}
RESOLUTIONS = {
    "640 × 360": (640, 360),
    "854 × 480": (854, 480),
    "1280 × 720": (1280, 720),
    "1920 × 1080": (1920, 1080),
    "2560 × 1440": (2560, 1440),
    "3840 × 2160": (3840, 2160),
    "1080 × 1080": (1080, 1080),
    "1080 × 1920": (1080, 1920),
}
# H.264-Zielrate für 720p, VP9-CRF und Audiobitrate in kbit/s.
VIDEO_QUALITIES = {
    "Kompakt": (3_000_000, 37, 96),
    "Standard": (5_000_000, 32, 128),
    "Hoch": (8_000_000, 26, 192),
    "Maximum": (12_000_000, 19, 256),
}
AUDIO_QUALITIES = {
    "WAV": {
        "16 Bit PCM": ("pcm_s16le", "s16", None),
        "24 Bit PCM": ("pcm_s24le", "s32", None),
        "32 Bit PCM": ("pcm_s32le", "s32", None),
        "32 Bit Float": ("pcm_f32le", "flt", None),
    },
    "FLAC": {
        "16 Bit": ("flac", "s16", None),
        "24 Bit": ("flac", "s32", None),
    },
    "MP3": {
        f"{rate} kbit/s": ("libmp3lame", "fltp", rate * 1000)
        for rate in (128, 160, 192, 256, 320)
    },
}
AUDIO_RATES = {"Original": None, "32 kHz": 32000, "44,1 kHz": 44100,
               "48 kHz": 48000, "96 kHz": 96000}
MP3_RATES = ("Original", "32 kHz", "44,1 kHz", "48 kHz")
DEFAULT_AUDIO_QUALITIES = {"WAV": "16 Bit PCM", "FLAC": "16 Bit", "MP3": "320 kbit/s"}


def temporary_path(path):
    return path.with_name(f".{path.stem}-{uuid4().hex}.partial{path.suffix}")


def convert_audio(av, source, destination, *, sample_rate=None, quality=None):
    source, destination = Path(source), Path(destination)
    if source.resolve() == destination.resolve():
        raise ValueError("Bitte einen anderen Dateinamen für die Zieldatei wählen.")
    target = destination.suffix[1:].upper()
    if target not in AUDIO_QUALITIES:
        raise ValueError("Unterstützte Zielformate sind WAV, FLAC und MP3.")
    if quality is None:
        quality = DEFAULT_AUDIO_QUALITIES[target]
    if quality not in AUDIO_QUALITIES[target]:
        raise ValueError(f"Ungültige Qualität für {target}: {quality}")
    fmt = target.lower()
    codec, sample_format, bitrate = AUDIO_QUALITIES[target][quality]
    if fmt == "mp3" and sample_rate not in (None, 32000, 44100, 48000):
        raise ValueError("Für MP3 bitte 32, 44,1 oder 48 kHz bzw. Original wählen.")
    temp = temporary_path(destination)
    try:
        with av.open(str(source)) as input_file:
            frames = input_file.decode(audio=0)
            first = next(frames, None)
            if first is None:
                raise ValueError("Die gewählte Datei enthält kein Audio.")
            source_rate = first.sample_rate
            rate = sample_rate or source_rate
            if fmt == "mp3" and rate not in (32000, 44100, 48000):
                rate = 48000
            layout = first.layout.name
            if fmt == "mp3" or layout not in {"mono", "stereo", "5.1", "7.1", "quad"}:
                layout = "mono" if len(first.layout.channels) == 1 else "stereo"
            with av.open(str(temp), "w", format=fmt) as output:
                stream = output.add_stream(codec, rate=rate, layout=layout, format=sample_format)
                if bitrate:
                    stream.bit_rate = bitrate
                converter = av.AudioResampler(format=sample_format, layout=layout, rate=rate)
                for frame in chain((first,), frames, (None,)):
                    for chunk in converter.resample(frame):
                        output.mux(stream.encode(chunk))
                output.mux(stream.encode(None))
        temp.replace(destination)
    finally:
        temp.unlink(missing_ok=True)


class Recorder:
    def __init__(self, av, destination, started, *, codecs=None, size=(WIDTH, HEIGHT), quality="Hoch"):
        self.av = av
        self.destination = Path(destination)
        fmt_label = self.destination.suffix[1:].lower()
        format_name = {"mp4": "MP4", "webm": "WebM"}.get(fmt_label)
        if format_name is None or quality not in VIDEO_QUALITIES or size not in RESOLUTIONS.values():
            raise ValueError("Ungültiges Videoformat, Qualitätsprofil oder Ausgabegröße.")
        _, fmt, video_name, audio_codec, audio_name, default_codecs = VIDEO_FORMATS[format_name]
        self.description = f"{video_name} · {audio_name}"
        h264_rate, crf, audio_kbps = VIDEO_QUALITIES[quality]
        width, height = size
        self.temp = temporary_path(self.destination)
        self.started = started
        self.frames = 0
        self.samples = 0
        self.input_format = None
        self.resampler = None
        self.container = None
        failures = []
        for codec in codecs or default_codecs:
            try:
                options = {"movflags": "faststart"} if fmt == "mp4" else {}
                output = av.open(str(self.temp), "w", format=fmt, options=options)
                self.container = output
                self.video = output.add_stream(codec, rate=VIDEO_FPS, width=width, height=height,
                                               pix_fmt="nv12" if codec == "h264_qsv" else "yuv420p")
                if fmt == "webm":
                    self.video.bit_rate = 0
                    self.video.options = {"crf": str(crf), "deadline": "realtime", "cpu-used": "6",
                                          "row-mt": "1", "lag-in-frames": "0"}
                else:
                    self.video.bit_rate = round(h264_rate * ((width * height) / (WIDTH * HEIGHT)) ** .75)
                    if codec == "libx264":
                        self.video.options = {"preset": "veryfast", "tune": "zerolatency"}
                self.audio = output.add_stream(audio_codec, rate=AUDIO_RATE, layout="stereo")
                self.audio.bit_rate = audio_kbps * 1000
                output.start_encoding()
            except (av.FFmpegError, OSError, ValueError) as error:
                failures.append(f"{codec}: {error}")
                self.abort()
                continue
            self.codec = codec
            return
        raise RuntimeError(f"{format_name}-Encoder nicht verfügbar. " + " / ".join(failures))

    def video_frame(self, rgb, index):
        frame = self.av.VideoFrame.from_ndarray(rgb, format="rgb24")
        frame.pts = index
        frame.time_base = Fraction(1, VIDEO_FPS)
        self.container.mux(self.video.encode(frame))
        self.frames = index + 1

    def pcm(self, block, rate, timestamp):
        # Sounddevice liefert Mono/Stereo in nativer Rate. Die MP4 verwendet AAC-Stereo.
        channels = block.shape[1]
        fmt = (rate, channels)
        if self.input_format != fmt:
            self.resampler = self.av.AudioResampler(format="fltp", layout="stereo", rate=AUDIO_RATE)
            self.input_format = fmt
        frame = self.av.AudioFrame.from_ndarray(np.ascontiguousarray(block.T), format="fltp",
                                                layout="mono" if channels == 1 else "stereo")
        frame.sample_rate = rate
        # Der erste Block positioniert Audio auf derselben monotonen Zeitachse wie das Bild.
        target = round((timestamp - self.started) * AUDIO_RATE)
        for chunk in self.resampler.resample(frame):
            array = chunk.to_ndarray()
            if target + array.shape[1] <= 0:
                continue
            if target < 0:
                array = array[:, -target:]
            if target > self.samples + AUDIO_RATE // 12 or self.samples == 0:
                self.pad(max(self.samples, target))
            self.write_pcm(array)
            target += array.shape[1]

    def write_pcm(self, array):
        if array.shape[1] == 0:
            return
        audio = self.av.AudioFrame.from_ndarray(np.ascontiguousarray(array, dtype=np.float32),
                                                format="fltp", layout="stereo")
        audio.sample_rate = AUDIO_RATE
        audio.time_base = Fraction(1, AUDIO_RATE)
        audio.pts = self.samples
        self.container.mux(self.audio.encode(audio))
        self.samples += array.shape[1]

    def pad(self, until):
        while self.samples < until:
            size = min(8192, until - self.samples)
            self.write_pcm(np.zeros((2, size), np.float32))

    def finish(self):
        if not self.frames:
            self.abort()
            raise RuntimeError("Es wurde kein Vorschau-Frame aufgenommen.")
        try:
            self.pad(round(self.frames * AUDIO_RATE / VIDEO_FPS))
            self.container.mux(self.video.encode(None))
            self.container.mux(self.audio.encode(None))
            self.container.close()
            self.container = None
            self.temp.replace(self.destination)
        except BaseException:
            self.abort()
            raise

    def abort(self):
        if self.container is not None:
            try:
                self.container.close()
            except (self.av.FFmpegError, OSError, ValueError):
                pass
            self.container = None
        self.temp.unlink(missing_ok=True)
