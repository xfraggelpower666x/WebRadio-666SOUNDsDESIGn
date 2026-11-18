"""Zeitlich disjunkte Trainings- und Validierungsdaten."""
import math


def split_sequence(text, val_fraction, minimum_length):
    if not 0 < val_fraction < 1:
        raise ValueError("val_split muss zwischen 0 und 1 liegen.")
    chunks = text.split(",")
    if chunks and not chunks[-1].strip():
        chunks.pop()
    try:
        numbers = [float(value.strip()) for value in chunks]
    except ValueError as error:
        raise ValueError("Die Sequenz muss kommaseparierte Zahlen enthalten.") from error
    if not all(math.isfinite(value) for value in numbers):
        raise ValueError("Die Sequenz enthält nicht-finite Werte.")
    split = len(numbers) - int(len(numbers) * val_fraction)
    if min(split, len(numbers) - split) < minimum_length:
        raise ValueError("Training und Validierung brauchen jeweils ein vollständiges Fenster.")
    return numbers[:split], numbers[split:]
