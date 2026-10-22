"""Offline BLE protocol observation and evidence analysis.

No Bluetooth access and no writes. This module only classifies captured hex
frames and records evidence for LENZE/OC21W protocol development.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Iterable


@dataclass(frozen=True)
class Observation:
    family: str
    direction: str
    characteristic_uuid: str
    payload_hex: str
    label: str = ""
    source: str = "manual_capture"


@dataclass(frozen=True)
class Analysis:
    valid_hex: bool
    byte_length: int
    frame_family: str
    command_byte: int | None
    candidate_command: str | None
    confidence: str
    notes: tuple[str, ...]


OC21W_COMMANDS = {
    0x01: "brightness_candidate",
    0x02: "speed_candidate",
    0x03: "mode_candidate",
    0x04: "power_candidate",
    0x05: "rgb_candidate",
}


def normalize_hex(value: str) -> str:
    text = "".join(ch for ch in str(value) if ch not in " :-_\t\r\n").upper()
    if len(text) % 2:
        raise ValueError("hex_length_must_be_even")
    try:
        bytes.fromhex(text)
    except ValueError as exc:
        raise ValueError("invalid_hex") from exc
    return " ".join(text[i:i+2] for i in range(0, len(text), 2))


def analyze(observation: Observation) -> Analysis:
    try:
        normalized = normalize_hex(observation.payload_hex)
        payload = bytes.fromhex(normalized)
    except ValueError as exc:
        return Analysis(False, 0, "invalid", None, None, "none", (str(exc),))

    notes: list[str] = []
    command = None
    candidate = None
    family = "unknown"
    confidence = "low"

    if len(payload) == 9 and payload[0] == 0x7E and payload[-1] == 0xEF:
        family = "7e-length-command-5payload-ef"
        command = payload[2]
        if observation.family.lower() in ("oc21w", "magic_lantern", "magic-lantern"):
            candidate = OC21W_COMMANDS.get(command)
            confidence = "candidate_match" if candidate else "structural_match"
            notes.append("OC21W structural candidate only; not hardware verification")
        else:
            confidence = "structural_match"
            notes.append("Do not transfer OC21W semantics to LENZE without observed evidence")
    elif observation.family.lower() == "lenze":
        family = "lenze_unresolved_capture"
        confidence = "observation_only"
        notes.append("LENZE payload retained as evidence; command semantics unresolved")
    else:
        notes.append("No known frame-family match")

    return Analysis(True, len(payload), family, command, candidate, confidence, tuple(notes))


def evidence_summary(observations: Iterable[Observation]) -> dict:
    rows = []
    families: dict[str, int] = {}
    candidates: dict[str, int] = {}
    for observation in observations:
        result = analyze(observation)
        rows.append({
            "observation": asdict(observation),
            "analysis": asdict(result),
        })
        families[result.frame_family] = families.get(result.frame_family, 0) + 1
        if result.candidate_command:
            candidates[result.candidate_command] = candidates.get(result.candidate_command, 0) + 1
    return {
        "observation_count": len(rows),
        "frame_families": families,
        "candidate_commands": candidates,
        "hardware_verified": False,
        "rows": rows,
    }
