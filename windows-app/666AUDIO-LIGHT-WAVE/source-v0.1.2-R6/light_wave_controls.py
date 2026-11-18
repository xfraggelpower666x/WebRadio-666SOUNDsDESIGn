"""Gemeinsames Bedienfenster für lokale Audiodateien und das Webradio."""
from pathlib import Path
from threading import Thread

import numpy as np

from light_wave_radio import LiveRadio, RadioState, STATION, STREAM_URL
from light_wave_visualizer import Spectrum, render, time_text

APP_NAME = "666AUDIO LIGHT WAVE · Player"


class Player:
    def __init__(self, av, sd, tls_ca, *, audio_tap=None):
        self.av = av
        self.sd = sd
        self.tls_ca = tls_ca
        self.audio_tap = audio_tap
        self.source = None
        self.worker = None
        self.pending = None
        self.title = APP_NAME
        self.volume = 0.75
        self.notice = "Datei wählen oder Live-Radio starten"

    def select(self, path, *, live=False):
        self.stop()
        self.pending = (str(path), live)
        self.title = STATION if live else Path(path).name
        self.notice = "Wechsle Quelle …"

    def update(self):
        if self.worker is not None and not self.worker.is_alive():
            self.worker.join()
            self.worker = None
        if self.pending and self.worker is None:
            path, live = self.pending
            self.pending = None
            self.source = LiveRadio(self.av, self.sd, path, tls_ca=self.tls_ca, live=live)
            self.source.state = RadioState("Verbinde …" if live else "Öffne Audiodatei …")
            self.source.volume = self.volume
            self.source.audio_tap = self.audio_tap
            self.worker = Thread(target=self.source.receive, name="Light Wave Audio")
            self.worker.start()

    def stop(self):
        self.pending = None
        if self.source is not None:
            self.source.stop.set()
            self.source = None
        self.title = APP_NAME
        self.notice = "Wiedergabe gestoppt"

    def pause(self):
        if self.source is None or self.source.live or self.worker is None or not self.worker.is_alive():
            return
        if self.source.paused.is_set():
            self.source.paused.clear()
        else:
            self.source.paused.set()

    def set_volume(self, value):
        self.volume = max(0, min(1, value))
        if self.source is not None:
            self.source.volume = self.volume

    def close(self):
        self.stop()
        if self.worker is not None:
            self.worker.join()


def run_player():
    import av
    import certifi
    import pygame
    import sounddevice as sd

    from light_wave_menu import audio_file, choose_audio

    player = Player(av, sd, certifi.where())
    pygame.display.init()
    pygame.font.init()
    try:
        screen = pygame.display.set_mode((960, 520))
        pygame.display.set_caption(APP_NAME)
        fonts = pygame.font.Font(None, 36), pygame.font.Font(None, 23)
        clock = pygame.time.Clock()
        spectrum_rate = None
        analyzer = None
        spectrum_visible = True
        dragging = False
        buttons = {
            "file": pygame.Rect(45, 78, 145, 35),
            "live": pygame.Rect(200, 78, 145, 35),
            "pause": pygame.Rect(355, 78, 105, 35),
            "stop": pygame.Rect(470, 78, 100, 35),
            "spectrum": pygame.Rect(580, 78, 160, 35),
        }
        slider = pygame.Rect(156, 130, 235, 16)
        slider_hit = slider.inflate(10, 12)

        def action(key):
            nonlocal spectrum_visible
            if key == "file":
                try:
                    selected = choose_audio(cinematic=False)
                except (OSError, RuntimeError, ValueError) as error:
                    print(error)
                    player.notice = "Dateiauswahl fehlgeschlagen · Details im Startprotokoll"
                    return
                if selected is not None:
                    player.select(selected)
            elif key == "live":
                player.select(STREAM_URL, live=True)
            elif key == "pause":
                player.pause()
            elif key == "stop":
                player.stop()
            elif key == "spectrum":
                spectrum_visible = not spectrum_visible

        def toolbar():
            source = player.source
            pause_available = (source is not None and not source.live and player.worker is not None
                               and player.worker.is_alive())
            labels = {
                "file": "Datei öffnen",
                "live": "Live-Radio",
                "pause": "Weiter" if pause_available and source.paused.is_set() else "Pause",
                "stop": "Stopp",
                "spectrum": "Spektrum an" if spectrum_visible else "Spektrum aus",
            }
            for key, rect in buttons.items():
                enabled = key != "pause" or pause_available
                color = (48, 46, 75) if enabled else (32, 34, 48)
                pygame.draw.rect(screen, color, rect, border_radius=6)
                label = fonts[1].render(labels[key], True, (230, 230, 245) if enabled else (132, 139, 158))
                screen.blit(label, label.get_rect(center=rect.center))
            screen.blit(fonts[1].render("Lautstärke", True, (195, 201, 221)), (45, 130))
            pygame.draw.rect(screen, (44, 49, 68), slider, border_radius=6)
            fill = slider.copy()
            fill.width = round(slider.width * player.volume)
            if fill.width:
                pygame.draw.rect(screen, (105, 137, 193), fill, border_radius=6)
            screen.blit(fonts[1].render(f"{round(player.volume * 100)} %", True, (195, 201, 221)),
                        (405, 130))

        keys = {
            pygame.K_o: "file", pygame.K_l: "live", pygame.K_SPACE: "pause",
            pygame.K_s: "stop", pygame.K_v: "spectrum",
        }
        while True:
            dt = clock.tick(40) / 1000
            for event in pygame.event.get():
                if event.type == pygame.QUIT or (
                    event.type == pygame.KEYDOWN and event.key in (pygame.K_ESCAPE, pygame.K_x)
                ):
                    return 0
                if event.type == pygame.DROPFILE:
                    try:
                        selected = audio_file(event.file)
                    except (OSError, ValueError) as error:
                        print(error)
                        player.notice = "Dateiauswahl fehlgeschlagen · Details im Startprotokoll"
                    else:
                        player.select(selected)
                if event.type == pygame.KEYDOWN:
                    if event.key in keys:
                        action(keys[event.key])
                    elif event.key in (pygame.K_UP, pygame.K_DOWN):
                        player.set_volume(player.volume + (0.05 if event.key == pygame.K_UP else -0.05))
                if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    dragging = slider_hit.collidepoint(event.pos)
                    if dragging:
                        player.set_volume((event.pos[0] - slider.left) / slider.width)
                    else:
                        for key, rect in buttons.items():
                            if rect.collidepoint(event.pos):
                                action(key)
                                break
                elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
                    dragging = False
                elif event.type == pygame.MOUSEMOTION and dragging:
                    player.set_volume((event.pos[0] - slider.left) / slider.width)

            player.update()
            source = player.source
            state = source.state if source is not None else RadioState(player.notice)
            status = player.notice if player.notice.startswith("Dateiauswahl") else state.status
            levels = None
            if source is not None and source.paused.is_set():
                status = "Pause"
            elif spectrum_visible and state.audio is not None:
                if spectrum_rate != state.rate:
                    analyzer = Spectrum(np.empty(0), state.rate)
                    spectrum_rate = state.rate
                levels = analyzer.update_block(state.audio, dt)
            if state.duration:
                status += f" · {time_text(min(state.position, state.duration))} / {time_text(state.duration)}"
            render(pygame, screen, fonts, player.title, levels, state.position, state.duration,
                   status=status, overlay=toolbar, content_top=168)
    finally:
        pygame.quit()
        player.close()
