from pathlib import Path

ROOT = Path('.')


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    file = ROOT / path
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} matches for {old!r}, got {count}')
    file.write_text(text.replace(old, new, expected), encoding='utf-8')


def replace_pair(path: str, old: str, new: str, expected: int = 1) -> None:
    replace_exact(path, old, new, expected)
    replace_exact(f'public/{path}', old, new, expected)


def main() -> None:
    # Preserve the existing navigation label while relocating the same VELUNA link.
    replace_pair(
        'index.html',
        '<span class="status-code">VELUNA</span></a>',
        '<span class="status-code">VELUNA PLAYER</span></a>',
    )
    replace_pair(
        'css/player-stage-v2.css',
        '.top-hud #playerDesignSwitch{min-width:82px!important;max-width:92px!important;',
        '.top-hud #playerDesignSwitch{min-width:100px!important;max-width:112px!important;',
    )

    # These tests protected the previous deliberately hotter visual calibration.
    # The current repair keeps the same real analyser, MeterBus, logarithmic mapping,
    # attack/release and no-synthetic-motion guards, but updates the expected visual
    # headroom constants so normal ~85% listening no longer looks permanently clipped.
    replace_exact(
        'tests/audio-reactivity-high-response-runtime.test.mjs',
        "test('canonical audio reactivity is live and high-response'",
        "test('canonical audio reactivity is live with proportional peak headroom'",
    )
    replace_exact(
        'tests/audio-reactivity-high-response-runtime.test.mjs',
        r'/spectralResponse \* 0\.92 \+ adaptiveResponse/',
        r'/spectralResponse \* 0\.86 \+ adaptiveResponse/',
    )

    replace_exact(
        'tests/central-boot-all-player-runtime.test.mjs',
        r'/const visualVolumeScale = Math\.pow\(volume, 0\.85\)/',
        r'/const visualVolumeScale = Math\.pow\(volume, 1\.15\)/',
    )
    replace_exact(
        'tests/central-boot-all-player-runtime.test.mjs',
        r'/const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 1\.10/',
        r'/const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 0\.48/',
    )

    replace_exact(
        'tests/pc-eq-balanced-headroom.test.mjs',
        '// PC EQ high-response headroom regression contract v1.1.0.',
        '// PC EQ proportional visual headroom regression contract v1.2.0.',
    )
    replace_exact(
        'tests/pc-eq-balanced-headroom.test.mjs',
        "test('PC EQ keeps logarithmic mapping while restoring high-response visual headroom'",
        "test('PC EQ keeps logarithmic mapping with proportional visual headroom'",
    )
    for old, new in [
        (r'/const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 1\.10/', r'/const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 0\.48/'),
        (r'/const spectral = Math\.pow\(absolute, 0\.52\) \* visualTilt/', r'/const spectral = Math\.pow\(absolute, 0\.78\) \* visualTilt/'),
        (r'/const adaptiveResponse = Math\.pow\(relative, 0\.70\) \* 0\.22 \* localGate/', r'/const adaptiveResponse = Math\.pow\(relative, 0\.82\) \* 0\.14 \* localGate/'),
        (r'/clamp\(spectralResponse \* 0\.92 \+ adaptiveResponse, 0\.012, 1\)/', r'/clamp\(spectralResponse \* 0\.86 \+ adaptiveResponse, 0\.012, 1\)/'),
    ]:
        replace_exact('tests/pc-eq-balanced-headroom.test.mjs', old, new)

    replace_exact(
        'tests/pc-high-frequency-response.test.mjs',
        '// PC high-frequency response regression contract v1.2.0.',
        '// PC high-frequency proportional-response regression contract v1.3.0.',
    )
    replace_exact(
        'tests/pc-high-frequency-response.test.mjs',
        "test('right-side bands use real high-response compensation without synthetic motion'",
        "test('right-side bands use real proportional compensation without synthetic motion'",
    )
    for old, new in [
        (r'/const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 1\.10/', r'/const visualTilt = 1 \+ Math\.pow\(position, 1\.18\) \* 0\.48/'),
        (r'/const adaptiveResponse = Math\.pow\(relative, 0\.70\) \* 0\.22 \* localGate/', r'/const adaptiveResponse = Math\.pow\(relative, 0\.82\) \* 0\.14 \* localGate/'),
        (r'/clamp\(spectralResponse \* 0\.92 \+ adaptiveResponse, 0\.012, 1\)/', r'/clamp\(spectralResponse \* 0\.86 \+ adaptiveResponse, 0\.012, 1\)/'),
    ]:
        replace_exact('tests/pc-high-frequency-response.test.mjs', old, new)

    replace_exact(
        'tests/pc-meter-reactivity-floor.test.mjs',
        r'/const visualVolumeScale = Math\.pow\(volume, 0\.85\)/',
        r'/const visualVolumeScale = Math\.pow\(volume, 1\.15\)/',
    )
    replace_exact(
        'tests/pc-meter-reactivity-floor.test.mjs',
        r'/0\.72 \+ Math\.pow\(volume, 0\.85\) \* 0\.28/',
        r'/0\.72 \+ Math\.pow\(volume, 1\.15\) \* 0\.28/',
    )

    print('Legacy UI/audio regression contracts aligned with proportional headroom.')


if __name__ == '__main__':
    main()
