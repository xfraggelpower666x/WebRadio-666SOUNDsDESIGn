"""Offline protocol inference from labeled BLE evidence.

The inference engine only proposes candidate byte fields. It never marks a
protocol or capability VERIFIED and performs no hardware IO.
"""
from __future__ import annotations

from collections import Counter, defaultdict

from ble_evidence_learning import collect_samples


EXPERIMENT_PLANS = {
    "lenze": [
        {"label": "baseline_no_action", "min_captures": 2, "purpose": "ambient/background notification baseline"},
        {"label": "official_app_power_on", "min_captures": 2, "purpose": "power-on differential"},
        {"label": "official_app_power_off", "min_captures": 2, "purpose": "power-off differential"},
        {"label": "official_app_color_red", "min_captures": 2, "purpose": "RGB field isolation"},
        {"label": "official_app_color_green", "min_captures": 2, "purpose": "RGB field isolation"},
        {"label": "official_app_color_blue", "min_captures": 2, "purpose": "RGB field isolation"},
        {"label": "official_app_brightness_25", "min_captures": 2, "purpose": "brightness field isolation"},
        {"label": "official_app_brightness_50", "min_captures": 2, "purpose": "brightness field isolation"},
        {"label": "official_app_brightness_100", "min_captures": 2, "purpose": "brightness field isolation"},
    ],
    "magic_lantern": [
        {"label": "baseline_no_action", "min_captures": 2, "purpose": "ambient/background notification baseline"},
        {"label": "official_app_power_on", "min_captures": 2, "purpose": "candidate power-frame confirmation"},
        {"label": "official_app_power_off", "min_captures": 2, "purpose": "candidate power-frame confirmation"},
        {"label": "official_app_color_red", "min_captures": 2, "purpose": "candidate RGB-frame confirmation"},
        {"label": "official_app_color_green", "min_captures": 2, "purpose": "candidate RGB-frame confirmation"},
        {"label": "official_app_color_blue", "min_captures": 2, "purpose": "candidate RGB-frame confirmation"},
        {"label": "official_app_brightness_25", "min_captures": 2, "purpose": "candidate brightness confirmation"},
        {"label": "official_app_brightness_50", "min_captures": 2, "purpose": "candidate brightness confirmation"},
        {"label": "official_app_brightness_100", "min_captures": 2, "purpose": "candidate brightness confirmation"},
        {"label": "official_app_mode_change", "min_captures": 2, "purpose": "candidate mode/speed confirmation"},
    ],
}


def experiment_plan(family: str) -> list[dict]:
    family = str(family or "").lower()
    if family == "oc21w":
        family = "magic_lantern"
    if family not in EXPERIMENT_PLANS:
        raise ValueError("unknown_protocol_family")
    return [dict(item) for item in EXPERIMENT_PLANS[family]]


def _dominant_frame(rows: list[dict]) -> bytes | None:
    if not rows:
        return None
    counts = Counter(row["payload_hex"] for row in rows)
    payload, _ = counts.most_common(1)[0]
    return bytes.fromhex(payload)


def _within_label_stable(rows: list[dict]) -> dict:
    by_length = defaultdict(list)
    for row in rows:
        by_length[len(row["bytes"])].append(row["bytes"])
    result = {}
    for length, payloads in by_length.items():
        stable = []
        variable = []
        for index in range(length):
            values = sorted({p[index] for p in payloads})
            target = stable if len(values) == 1 else variable
            target.append({"index": index, "values_hex": [f"{v:02X}" for v in values]})
        result[length] = {"stable": stable, "variable": variable}
    return result


def _capture_counts(entries) -> Counter:
    counts = Counter()
    for entry in entries:
        record = entry.get("record", {}) if isinstance(entry, dict) else {}
        payload = record.get("payload", {}) if isinstance(record, dict) else {}
        label = str(payload.get("experiment_label") or "(unlabeled)")
        counts[label] += 1
    return counts


def readiness(entries, family: str) -> dict:
    family = "magic_lantern" if str(family).lower() == "oc21w" else str(family).lower()
    plan = experiment_plan(family)
    capture_counts = _capture_counts(entries)
    samples = collect_samples(entries, family=family)
    sample_counts = Counter(row["experiment_label"] or "(unlabeled)" for row in samples)
    missing = []
    satisfied = []
    for item in plan:
        have = capture_counts.get(item["label"], 0)
        row = {
            **item,
            "captures": have,
            "samples": sample_counts.get(item["label"], 0),
        }
        (satisfied if have >= item["min_captures"] else missing).append(row)
    return {
        "family": family,
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "ready_for_manual_inference_review": not missing,
        "satisfied": satisfied,
        "missing": missing,
        "capture_count": sum(capture_counts.values()),
        "sample_count": len(samples),
        "counting_rule": "min_captures counts independent evidence records, not notification samples.",
    }


def infer_candidate_fields(entries, family: str) -> dict:
    family = "magic_lantern" if str(family).lower() == "oc21w" else str(family).lower()
    samples = collect_samples(entries, family=family)
    by_label = defaultdict(list)
    for row in samples:
        label = row["experiment_label"] or "(unlabeled)"
        by_label[label].append(row)

    dominant = {}
    stability = {}
    for label, rows in by_label.items():
        frame = _dominant_frame(rows)
        if frame is not None:
            dominant[label] = frame
        stability[label] = _within_label_stable(rows)

    pairwise = []
    labels = sorted(dominant)
    for i, left in enumerate(labels):
        for right in labels[i + 1:]:
            a = dominant[left]
            b = dominant[right]
            if len(a) != len(b):
                pairwise.append({
                    "left": left,
                    "right": right,
                    "same_length": False,
                    "length_left": len(a),
                    "length_right": len(b),
                    "candidate_positions": [],
                })
                continue
            candidates = []
            left_stable = {x["index"] for x in stability[left].get(len(a), {}).get("stable", [])}
            right_stable = {x["index"] for x in stability[right].get(len(b), {}).get("stable", [])}
            for index, (av, bv) in enumerate(zip(a, b)):
                if av != bv and index in left_stable and index in right_stable:
                    candidates.append({
                        "index": index,
                        "left_hex": f"{av:02X}",
                        "right_hex": f"{bv:02X}",
                        "classification": "stable_within_labels_different_between_labels",
                    })
            pairwise.append({
                "left": left,
                "right": right,
                "same_length": True,
                "length_left": len(a),
                "length_right": len(b),
                "candidate_positions": candidates,
            })

    likely_fields = Counter()
    examples = defaultdict(list)
    for comparison in pairwise:
        for item in comparison["candidate_positions"]:
            likely_fields[item["index"]] += 1
            examples[item["index"]].append({
                "left": comparison["left"],
                "right": comparison["right"],
                "left_hex": item["left_hex"],
                "right_hex": item["right_hex"],
            })

    ranked = [
        {
            "index": index,
            "cross_label_difference_count": count,
            "examples": examples[index][:8],
            "meaning": "UNRESOLVED_CANDIDATE_FIELD",
        }
        for index, count in likely_fields.most_common()
    ]

    return {
        "family": family,
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
        "labels_seen": {label: len(rows) for label, rows in sorted(by_label.items())},
        "dominant_frames": {label: frame.hex(" ").upper() for label, frame in sorted(dominant.items())},
        "within_label_stability": stability,
        "pairwise_differences": pairwise,
        "ranked_candidate_fields": ranked,
        "readiness": readiness(entries, family),
        "rule": "Candidate fields require human review plus real hardware validation before protocol promotion.",
    }
