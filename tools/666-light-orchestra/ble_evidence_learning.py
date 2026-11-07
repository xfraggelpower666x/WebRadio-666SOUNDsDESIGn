"""Offline protocol-learning helpers for stored BLE evidence.

This module verifies local evidence files, groups repeated frames and highlights
byte positions that vary across observations. It never performs hardware IO and
never promotes a protocol to VERIFIED automatically.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

from ble_capture_store import load_capture_evidence
from ble_protocol_observation import Observation, analyze, normalize_hex


def list_evidence_files(directory: str | Path) -> list[Path]:
    base = Path(directory)
    if not base.exists():
        return []
    return sorted(
        (p for p in base.glob("*.json") if p.is_file()),
        key=lambda p: (p.stat().st_mtime, p.name),
    )


def load_evidence_directory(directory: str | Path) -> dict:
    valid = []
    invalid = []
    for path in list_evidence_files(directory):
        try:
            record = load_capture_evidence(path)
            valid.append({"path": str(path), "record": record})
        except Exception as exc:
            invalid.append({"path": str(path), "error": str(exc)})
    return {
        "valid_count": len(valid),
        "invalid_count": len(invalid),
        "valid": valid,
        "invalid": invalid,
    }


def _samples_from_record(entry: dict) -> list[dict]:
    record = entry["record"]
    payload = record.get("payload", {})
    capture = payload.get("capture", {})
    samples = capture.get("samples", [])
    family = str(payload.get("family") or "")
    device_id = str(payload.get("device_id") or "")
    experiment_label = str(payload.get("experiment_label") or "")
    notes = str(payload.get("notes") or "")
    source_path = str(entry.get("path") or "")
    out = []
    for sample in samples if isinstance(samples, list) else []:
        if not isinstance(sample, dict):
            continue
        raw = sample.get("payload_hex")
        try:
            normalized = normalize_hex(raw)
        except ValueError:
            continue
        observation = Observation(
            family=family,
            direction="notify",
            characteristic_uuid=str(sample.get("characteristic_uuid") or ""),
            payload_hex=normalized,
            label=device_id,
            source=source_path,
        )
        result = analyze(observation)
        out.append({
            "device_id": device_id,
            "family": family,
            "experiment_label": experiment_label,
            "notes": notes,
            "payload_hex": normalized,
            "bytes": bytes.fromhex(normalized),
            "characteristic_uuid": observation.characteristic_uuid,
            "analysis": result,
            "evidence_path": source_path,
            "evidence_sha256": record.get("sha256"),
        })
    return out


def collect_samples(entries: Iterable[dict], family: str | None = None, device_id: str | None = None) -> list[dict]:
    rows = []
    wanted_family = str(family or "").lower()
    wanted_device = str(device_id or "")
    for entry in entries:
        for row in _samples_from_record(entry):
            if wanted_family and row["family"].lower() != wanted_family:
                continue
            if wanted_device and row["device_id"] != wanted_device:
                continue
            rows.append(row)
    return rows


def _byte_variability(payloads: list[bytes]) -> dict:
    if not payloads:
        return {"same_length": True, "lengths": [], "stable_positions": [], "variable_positions": []}
    lengths = sorted({len(x) for x in payloads})
    if len(lengths) != 1:
        return {"same_length": False, "lengths": lengths, "stable_positions": [], "variable_positions": []}
    length = lengths[0]
    stable = []
    variable = []
    for index in range(length):
        values = sorted({payload[index] for payload in payloads})
        item = {"index": index, "values_hex": [f"{v:02X}" for v in values]}
        if len(values) == 1:
            stable.append(item)
        else:
            variable.append(item)
    return {
        "same_length": True,
        "lengths": lengths,
        "stable_positions": stable,
        "variable_positions": variable,
    }


def learning_summary(entries: Iterable[dict], family: str | None = None, device_id: str | None = None) -> dict:
    samples = collect_samples(entries, family=family, device_id=device_id)
    exact = Counter(row["payload_hex"] for row in samples)
    frame_families = Counter(row["analysis"].frame_family for row in samples)
    candidate_commands = Counter(
        row["analysis"].candidate_command
        for row in samples
        if row["analysis"].candidate_command
    )
    devices = Counter(row["device_id"] for row in samples)
    characteristics = Counter(row["characteristic_uuid"] for row in samples)
    labels = Counter(row["experiment_label"] or "(unlabeled)" for row in samples)

    grouped_by_length = defaultdict(list)
    for row in samples:
        grouped_by_length[len(row["bytes"])].append(row["bytes"])

    variability = {
        str(length): _byte_variability(payloads)
        for length, payloads in sorted(grouped_by_length.items())
    }

    exact_frames = [
        {"payload_hex": payload, "count": count}
        for payload, count in exact.most_common()
    ]

    label_groups = {}
    for label in sorted(labels):
        group = [row for row in samples if (row["experiment_label"] or "(unlabeled)") == label]
        frames = Counter(row["payload_hex"] for row in group)
        lengths = defaultdict(list)
        for row in group:
            lengths[len(row["bytes"])].append(row["bytes"])
        label_groups[label] = {
            "sample_count": len(group),
            "exact_frames": [{"payload_hex": p, "count": c} for p, c in frames.most_common()],
            "variability_by_length": {
                str(length): _byte_variability(payloads)
                for length, payloads in sorted(lengths.items())
            },
        }

    hypotheses = []
    if samples:
        if family and str(family).lower() == "lenze":
            if len(exact) == 1:
                hypotheses.append("LENZE capture currently shows one repeated frame; semantics remain unresolved.")
            elif len(exact) > 1:
                hypotheses.append("LENZE has multiple observed frames; compare variable byte positions before assigning command meaning.")
        if family and str(family).lower() in ("magic_lantern", "oc21w"):
            if candidate_commands:
                hypotheses.append("OC21W candidate command bytes are structurally recurring; still not hardware-verified.")
    return {
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "sample_count": len(samples),
        "device_counts": dict(devices),
        "characteristic_counts": dict(characteristics),
        "experiment_label_counts": dict(labels),
        "frame_family_counts": dict(frame_families),
        "candidate_command_counts": dict(candidate_commands),
        "exact_frames": exact_frames,
        "variability_by_length": variability,
        "label_groups": label_groups,
        "hypotheses": hypotheses,
    }


def compare_frames(payload_a: str, payload_b: str) -> dict:
    a = bytes.fromhex(normalize_hex(payload_a))
    b = bytes.fromhex(normalize_hex(payload_b))
    max_len = max(len(a), len(b))
    differences = []
    for index in range(max_len):
        av = a[index] if index < len(a) else None
        bv = b[index] if index < len(b) else None
        if av != bv:
            differences.append({
                "index": index,
                "a": None if av is None else f"{av:02X}",
                "b": None if bv is None else f"{bv:02X}",
            })
    return {
        "equal": a == b,
        "length_a": len(a),
        "length_b": len(b),
        "differences": differences,
    }
