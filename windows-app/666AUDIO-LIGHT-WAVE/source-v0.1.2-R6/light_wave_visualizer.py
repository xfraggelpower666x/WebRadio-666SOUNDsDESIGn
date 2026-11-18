"""Lokaler Audioplayer mit sanft geglättetem Spektrum aus der Wiedergabedatei."""
from pathlib import Path

import numpy as np

from light_wave_dsp import finalize_output
from light_wave_runtime import play_output


class Spectrum:
    def __init__(self, audio, rate, bars=28, size=4096, *, adaptive=False):
        self.audio = np.asarray(audio, dtype=np.float32)
        self.rate = rate
        self.adaptive = adaptive
        self.size = size
        self.window = np.hanning(size)
        self.scale = 2 / self.window.sum()
        upper = min(14000, rate / 2)
        edges = np.geomspace(min(45, upper / 2), upper, bars + 1)
        bins = len(self.window) // 2 + 1
        edges = np.minimum(bins - 1, np.floor(edges * size / rate).astype(int))
        self.bands = [(lo, max(lo + 1, hi)) for lo, hi in zip(edges[:-1], edges[1:])]
        self.levels = np.zeros(bars)

    def update(self, seconds, dt):
        center = max(0, min(len(self.audio), round(seconds * self.rate)))
        start = max(0, center - self.size // 2)
        return self.update_block(self.audio[start:start + self.size], dt)

    def update_block(self, samples, dt):
        samples = samples[-self.size:]
        if samples.ndim == 1:
            samples = samples[:, None]
        windowed = samples * self.window[:len(samples), None]
        power = np.abs(np.fft.rfft(windowed, n=self.size, axis=0)) ** 2
        energy = np.sqrt(power.mean(axis=1)) * self.scale
        db = 20 * np.log10(np.maximum(1e-8, [energy[lo:hi].max() for lo, hi in self.bands]))
        if self.adaptive and db.max() > -60:
            # Normierung an den stärksten und schwächsten Bändern des aktuellen Blocks.
            peak = db.max()
            floor = max(float(db.min()), peak - 46)
            target = np.clip((db - floor) / max(peak - floor, 12), 0, 1)
        else:
            target = np.clip((db + 72) / 60, 0, 1)
        # Kürzere Anstiegszeit, längere Abklingzeit gegen hektische Sprünge.
        tau = np.where(target > self.levels, 0.075, 0.24)
        self.levels += (target - self.levels) * (1 - np.exp(-max(dt, 0) / tau))
        return self.levels


def time_text(seconds):
    minutes, seconds = divmod(max(0, int(seconds)), 60)
    return f"{minutes}:{seconds:02d}"


def render(pygame, screen, fonts, name, levels, position, duration, *, status=None, overlay=None, content_top=92):
    width, height = screen.get_size()
    side = min(45, width // 12)
    w = max(1, width - 2 * side)
    title_font, body_font = fonts
    title = name
    while len(title) > 1 and title_font.size(title)[0] > w:
        title = title[:-2].rstrip("…") + "…"
    screen.fill((15, 17, 28))
    screen.blit(title_font.render(title, True, (228, 230, 245)), (side, 26))
    if levels is not None:
        bottom = height - 82
        max_height = max(1, bottom - content_top)
        for index, level in enumerate(levels):
            left, right = (round(i * w / len(levels)) + side for i in (index, index + 1))
            bar_height = max(3, round(level * max_height))
            fraction = index / max(1, len(levels) - 1)
            color = tuple(round(a + (b - a) * fraction) for a, b in zip((124, 95, 193), (61, 153, 169)))
            pygame.draw.rect(screen, color, (left, bottom - bar_height, max(1, right - left - 3), bar_height),
                             border_radius=2)
    y = height - 58
    if duration:
        pygame.draw.rect(screen, (41, 45, 64), (side, y, w, 4))
        pygame.draw.rect(screen, (124, 107, 202), (side, y, round(w * min(position / duration, 1)), 4))
    label = status if status is not None else f"{time_text(position)} / {time_text(duration)}"
    screen.blit(body_font.render(label, True, (159, 169, 193)), (side, y + 15))
    hint = body_font.render("Esc  Zurück", True, (159, 169, 193))
    screen.blit(hint, (width - side - hint.get_width(), y + 15))
    if overlay is not None:
        overlay()
    pygame.display.flip()


def play_local(path: Path, *, spectrum=True):
    import pygame
    import sounddevice as sd
    import soundfile as sf

    with sf.SoundFile(path) as source:
        rate = source.samplerate
        audio = finalize_output(source.read(dtype="float32", always_2d=True))
    analyzer = Spectrum(audio, rate) if spectrum else None
    duration = len(audio) / rate

    pygame.display.init()
    pygame.font.init()
    started = False
    try:
        screen = pygame.display.set_mode((960, 520))
        pygame.display.set_caption("666AUDIO LIGHT WAVE · " + path.name)
        fonts = pygame.font.Font(None, 36), pygame.font.Font(None, 23)
        render(pygame, screen, fonts, path.stem, None, 0, duration)
        play_output(sd, audio, rate)
        started = True
        stream = sd.get_stream()
        origin = stream.time + stream.latency
        clock = pygame.time.Clock()
        while stream.active:
            dt = clock.tick(50) / 1000
            for event in pygame.event.get():
                if event.type == pygame.QUIT or (
                    event.type == pygame.KEYDOWN and event.key in (pygame.K_ESCAPE, pygame.K_x)
                ):
                    return
            position = max(0, min(duration, stream.time - origin))
            levels = analyzer.update(position, dt) if analyzer is not None else None
            render(pygame, screen, fonts, path.stem, levels, position, duration)
    finally:
        if started:
            sd.stop()
        pygame.quit()
