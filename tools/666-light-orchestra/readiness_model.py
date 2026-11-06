"""Pure readiness model for LIGHT ORCHESTRA visual guidance.

No network, BLE or hardware IO.
"""
from __future__ import annotations


def _by_kind(devices):
    return {str(x.get("kind")): x for x in (devices or []) if isinstance(x, dict)}


def build_readiness(registry, devices, bluetooth=None, gatt_results=None):
    registry = [dict(x) for x in (registry or []) if isinstance(x, dict)]
    status = _by_kind(devices)
    bluetooth = bluetooth or {}
    gatt_results = gatt_results or {}
    bt_ready = bool(bluetooth.get("ok"))

    rows = []
    for item in registry:
        device_id = str(item.get("id") or "")
        family = str(item.get("family") or "")
        enabled = bool(item.get("enabled"))
        binding = item.get("windows_ble_address")

        if family == "govee":
            g = status.get("govee", {})
            ip = g.get("ip") or item.get("host")
            online = bool(g.get("online"))
            if not enabled:
                stage, state, next_action = "REGISTRY", "DISABLED", "Enable the Govee slot when you want to control it."
            elif not ip:
                stage, state, next_action = "CONNECTION", "IP_REQUIRED", "Set or discover the H6047 IP."
            elif not online:
                stage, state, next_action = "PROBE", "READ_ONLY_PROBE_REQUIRED", "Run SEARCH GOVEE LAN / read-only devStatus probe."
            else:
                stage, state, next_action = "CONTROL_GATE", "SESSION_PROBE_READY", "Govee session probe is valid; hardware acknowledgement is still not implied."
            rows.append({
                "device_id": device_id,
                "family": family,
                "enabled": enabled,
                "stage": stage,
                "state": state,
                "next_action": next_action,
                "binding": ip,
                "hardware_verified": False,
            })
            continue

        if family in ("lenze", "magic_lantern"):
            gatt = gatt_results.get(device_id) if isinstance(gatt_results, dict) else None
            if not bt_ready:
                stage, state, next_action = "BLUETOOTH", "ADAPTER_REQUIRED", "Repair/check the Windows Bluetooth adapter."
            elif not binding:
                stage, state, next_action = "BINDING", "DEVICE_NOT_BOUND", "Run SEARCH BLE DEVICES and bind this slot."
            elif not gatt:
                stage, state, next_action = "GATT", "VERIFY_REQUIRED", "Run CONNECT / VERIFY to inspect FFF0/FFF3/FFF4 read-only."
            elif not gatt.get("ok"):
                stage, state, next_action = "GATT", "VERIFY_FAILED", "Review GATT result or re-scan/re-bind the physical lamp."
            elif family == "lenze":
                stage, state, next_action = "PROTOCOL", "WRITE_BLOCKED", "Collect labeled read-only evidence; LENZE command frames are not verified."
            else:
                stage, state, next_action = "PROTOCOL", "WRITE_BLOCKED", "Collect read-only evidence and resolve OC21W frame variants before writes."
            rows.append({
                "device_id": device_id,
                "family": family,
                "enabled": enabled,
                "stage": stage,
                "state": state,
                "next_action": next_action,
                "binding": binding,
                "hardware_verified": False,
            })
            continue

        rows.append({
            "device_id": device_id,
            "family": family,
            "enabled": enabled,
            "stage": "UNVERIFIED",
            "state": "UNVERIFIED_TRANSPORT",
            "next_action": "Keep disabled until transport/model is verified.",
            "binding": None,
            "hardware_verified": False,
        })

    counts = {}
    for row in rows:
        counts[row["state"]] = counts.get(row["state"], 0) + 1

    return {
        "rows": rows,
        "counts": counts,
        "hardware_verified": False,
        "automatic_promotion_allowed": False,
    }
