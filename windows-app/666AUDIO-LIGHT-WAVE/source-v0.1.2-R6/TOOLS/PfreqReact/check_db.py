# "The Cosmic Wyrdetide.wav",						# SEMISUPA "story"
# "Instrumental v3.wav",						# SUPAGOOD "glitchy" TOO MUCH SYNC-MOVEMENT

import argparse


def main():
    parser = argparse.ArgumentParser(description="LUFS und Pegel einer Audiodatei messen")
    parser.add_argument("audio")
    args = parser.parse_args()
    import numpy as np
    import pyloudnorm as pyln
    import soundfile as sf

    data, rate = sf.read(args.audio)
    if not len(data) or not np.isfinite(data).all():
        parser.error("Keine gültigen Audiosamples.")
    def db(amplitude):
        return 20 * np.log10(amplitude) if amplitude > 0 else float("-inf")

    if len(data) >= rate * 0.4:
        print(f"Perceived Loudness: {pyln.Meter(rate).integrated_loudness(data):.2f} LUFS")
    print(f"Average Volume (RMS): {db(np.sqrt(np.mean(data ** 2))):.2f} dBFS")
    print(f"Peak Volume: {db(np.max(np.abs(data))):.2f} dBFS")


if __name__ == "__main__":
    main()
