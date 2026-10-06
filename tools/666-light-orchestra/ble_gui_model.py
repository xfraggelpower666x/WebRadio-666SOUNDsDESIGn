"""Pure GUI support model for LIGHT ORCHESTRA BLE workflows.

No Tk and no hardware access. Keeps discovery suggestions deterministic and
prevents automatic device binding.
"""
from __future__ import annotations


def ble_registry_entries(registry):
    return [
        dict(item) for item in registry
        if item.get("transport") == "ble" and item.get("family") in ("lenze", "magic_lantern")
    ]


def propose_bindings(discovered, registry):
    """Return suggestions only. Never mutates registry and never auto-binds."""
    slots = ble_registry_entries(registry)
    used = {item.get("windows_ble_address") for item in slots if item.get("windows_ble_address")}
    free_by_family = {}
    for item in slots:
        if not item.get("windows_ble_address"):
            free_by_family.setdefault(item["family"], []).append(item["id"])

    rows = []
    counters = {}
    for dev in discovered:
        family = str(dev.get("family") or "")
        address = str(dev.get("address") or "")
        existing = next((x for x in slots if x.get("windows_ble_address") == address), None)
        if existing:
            suggestion = existing["id"]
            state = "BOUND"
        elif address in used:
            suggestion = None
            state = "CONFLICT"
        else:
            idx = counters.get(family, 0)
            candidates = free_by_family.get(family, [])
            suggestion = candidates[idx] if idx < len(candidates) else None
            counters[family] = idx + 1
            state = "SUGGESTED" if suggestion else "NO_SLOT"
        rows.append({
            "name": str(dev.get("name") or ""),
            "address": address,
            "family": family,
            "rssi": dev.get("rssi"),
            "suggested_device_id": suggestion,
            "binding_state": state,
        })
    return rows


def capture_summary(result):
    capture = result.get("capture", {}) if isinstance(result, dict) else {}
    analysis = result.get("analysis", {}) if isinstance(result, dict) else {}
    rows = analysis.get("rows", []) if isinstance(analysis, dict) else []
    commands = analysis.get("candidate_commands", {}) if isinstance(analysis, dict) else {}
    return {
        "device_id": result.get("device_id") if isinstance(result, dict) else None,
        "family": result.get("family") if isinstance(result, dict) else None,
        "hardware_io": result.get("hardware_io") if isinstance(result, dict) else None,
        "samples": len(capture.get("samples", [])) if isinstance(capture, dict) else 0,
        "characteristics": len(capture.get("characteristics", [])) if isinstance(capture, dict) else 0,
        "subscribed": list(capture.get("subscribed", [])) if isinstance(capture, dict) else [],
        "errors": list(capture.get("errors", [])) if isinstance(capture, dict) else [],
        "candidate_commands": dict(commands),
        "hardware_verified": bool(analysis.get("hardware_verified", False)) if isinstance(analysis, dict) else False,
        "observations": rows,
    }


def protocol_badge(profile):
    level = str(profile.get("frame_verification") or "unknown").upper()
    allowed = bool(profile.get("hardware_writes_allowed_by_design"))
    return f"{level} · {'WRITE-ELIGIBLE' if allowed else 'WRITE-BLOCKED'}"
