"""Ähnliche Bilder prüfen und optional nur Kandidaten in Quarantäne verschieben."""
import argparse
from pathlib import Path
import shutil


def duplicate_candidates(source, threshold):
    from PIL import Image
    import imagehash

    original_hashes = []
    for path in sorted(source.iterdir()):
        if not path.is_file() or path.is_symlink() or path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
            continue
        try:
            with Image.open(path) as image:
                fingerprint = imagehash.phash(image)
        except OSError as error:
            print(f"Übersprungen: {path.name}: {error}")
            continue
        for original, reference in original_hashes:
            distance = fingerprint - reference
            if distance <= threshold:
                yield path, original, distance
                break
        else:
            original_hashes.append((path, fingerprint))


def quarantine(source, destination):
    # Exklusiv anlegen und erst nach erfolgreicher Kopie aus der Quelle löschen.
    # Dadurch bleiben bestehende Dateien und fehlgeschlagene Kopien geschützt.
    with source.open("rb") as stream, destination.open("xb") as target:
        try:
            shutil.copyfileobj(stream, target)
            target.flush()
            shutil.copystat(source, destination)
        except BaseException:
            target.close()
            destination.unlink()
            raise
    source.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("quarantine", type=Path)
    parser.add_argument("--threshold", type=int, default=10)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    source, target = args.source.resolve(), args.quarantine.resolve()
    if source == target or not source.is_dir() or not 0 <= args.threshold <= 64:
        parser.error("Getrennte Ordner und einen Schwellenwert von 0 bis 64 angeben.")
    if args.apply:
        target.mkdir(parents=True, exist_ok=True)
    failure = False
    for path, original, distance in duplicate_candidates(source, args.threshold):
        print(f"{path.name} ≈ {original.name} · Distanz {distance}")
        if args.apply:
            try:
                quarantine(path, target / path.name)
            except OSError as error:
                failure = True
                print(f"Quarantäne fehlgeschlagen: {path.name}: {error}")
    return int(failure)


if __name__ == "__main__":
    raise SystemExit(main())
