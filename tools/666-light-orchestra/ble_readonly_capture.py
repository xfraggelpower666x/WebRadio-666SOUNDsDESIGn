"""Read-only Windows BLE discovery/capture for LIGHT ORCHESTRA.

This module never writes GATT characteristics. It may scan, connect, enumerate
services/characteristics, subscribe to notifications, and disconnect.
"""
from __future__ import annotations

import asyncio
import json
import platform
import subprocess
import time
from dataclasses import dataclass, asdict
from typing import Any, Callable

try:
    from bleak import BleakClient, BleakScanner
except Exception:
    BleakClient = None
    BleakScanner = None


@dataclass(frozen=True)
class DiscoveredDevice:
    name: str
    address: str
    family: str
    rssi: int | None = None
    advertised_name: str = ""
    service_uuids: tuple[str, ...] = ()


@dataclass(frozen=True)
class CharacteristicInfo:
    service_uuid: str
    characteristic_uuid: str
    properties: tuple[str, ...]


@dataclass(frozen=True)
class NotificationSample:
    address: str
    characteristic_uuid: str
    payload_hex: str
    monotonic_s: float


def classify_name(name: str | None) -> str | None:
    value = str(name or "").strip().lower()
    if not value:
        return None
    if value.startswith("lenze-rgb") or "lenze-rgb" in value:
        return "lenze"
    if value.startswith("oc21w") or "oc21w" in value:
        return "magic_lantern"
    return None


def _adv_name(dev, adv) -> str:
    for value in (
        getattr(adv, "local_name", None),
        getattr(dev, "name", None),
    ):
        if value:
            return str(value)
    return ""


def _adv_rssi(dev, adv):
    value = getattr(adv, "rssi", None)
    if value is None:
        value = getattr(dev, "rssi", None)
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _adv_services(adv) -> tuple[str, ...]:
    values = getattr(adv, "service_uuids", None) or ()
    return tuple(sorted({str(x).lower() for x in values if x}))


def bluetooth_preflight() -> dict:
    """Diagnose the local Bluetooth stack without changing adapter/service state."""
    result = {
        "ok": False,
        "platform": platform.system(),
        "hardware_io": "READ_ONLY_DIAGNOSTIC",
        "adapter_state": "UNKNOWN",
        "service_state": "UNKNOWN",
        "adapters": [],
        "all_bluetooth_devices": [],
        "drivers": [],
        "reason": None,
    }
    if platform.system().lower() != "windows":
        result["reason"] = "WINDOWS_REQUIRED_FOR_NATIVE_ADAPTER_PREFLIGHT"
        return result

    command = (
        "$ErrorActionPreference='SilentlyContinue';"
        "$svc=Get-Service bthserv;"
        "$devs=@(Get-PnpDevice -Class Bluetooth | "
        "Select-Object FriendlyName,Status,InstanceId,Problem);"
        "$drivers=@(Get-CimInstance Win32_PnPSignedDriver | "
        "Where-Object {$_.DeviceClass -eq 'Bluetooth'} | "
        "Select-Object DeviceName,DriverVersion,Manufacturer,DriverProviderName,InfName);"
        "[pscustomobject]@{"
        "service_status=if($svc){$svc.Status.ToString()}else{'MISSING'};"
        "devices=$devs;"
        "drivers=$drivers"
        "}|ConvertTo-Json -Depth 6 -Compress"
    )
    try:
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        proc = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
            capture_output=True,
            text=True,
            timeout=8,
            creationflags=flags,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        result["reason"] = "POWERSHELL_PREFLIGHT_FAILED"
        result["details"] = str(exc)
        return result

    if proc.returncode != 0 or not proc.stdout.strip():
        result["reason"] = "BLUETOOTH_PNP_QUERY_FAILED"
        result["details"] = (proc.stderr or "").strip()
        return result

    try:
        payload = json.loads(proc.stdout)
    except (TypeError, ValueError) as exc:
        result["reason"] = "BLUETOOTH_PNP_JSON_INVALID"
        result["details"] = str(exc)
        return result

    devices = payload.get("devices") or []
    if isinstance(devices, dict):
        devices = [devices]
    normalized = []
    adapters = []
    ignore_markers = (
        "enumerator", "rfcomm", "protocol tdi", "personal area network",
        "device identification service", "generic attribute service",
    )
    for row in devices if isinstance(devices, list) else []:
        if not isinstance(row, dict):
            continue
        name = str(row.get("FriendlyName") or "").strip()
        status = str(row.get("Status") or "").strip().upper()
        item = {
            "name": name,
            "status": status or "UNKNOWN",
            "instance_id": str(row.get("InstanceId") or ""),
            "problem": row.get("Problem"),
        }
        normalized.append(item)
        lname = name.lower()
        if name and not any(marker in lname for marker in ignore_markers):
            adapters.append(item)

    service = str(payload.get("service_status") or "UNKNOWN").upper()
    healthy = [x for x in adapters if x["status"] == "OK"]
    result["service_state"] = service
    result["all_bluetooth_devices"] = normalized
    result["adapters"] = adapters
    drivers = payload.get("drivers") or []
    if isinstance(drivers, dict):
        drivers = [drivers]
    result["drivers"] = [dict(x) for x in drivers if isinstance(x, dict)]

    if healthy:
        result["ok"] = True
        result["adapter_state"] = "READY"
        result["reason"] = "BLUETOOTH_ADAPTER_READY"
    elif adapters:
        result["adapter_state"] = "PRESENT_NOT_READY"
        result["reason"] = "BLUETOOTH_ADAPTER_DISABLED_OR_DRIVER_ERROR"
    elif normalized:
        result["adapter_state"] = "NO_PHYSICAL_ADAPTER"
        result["reason"] = "ONLY_BLUETOOTH_ENUMERATORS_FOUND"
    else:
        result["adapter_state"] = "MISSING"
        result["reason"] = "BLUETOOTH_ADAPTER_NOT_AVAILABLE"
    return result


async def scan_all(timeout: float = 6.0) -> list[DiscoveredDevice]:
    """Return every BLE device visible to Windows; classify only after discovery."""
    if BleakScanner is None:
        raise RuntimeError("bleak not installed")
    timeout = max(1.0, min(30.0, float(timeout)))
    try:
        found = await BleakScanner.discover(timeout=timeout, return_adv=True)
    except TypeError:
        found = await BleakScanner.discover(timeout=timeout)

    rows = []
    if isinstance(found, dict):
        iterable = []
        for value in found.values():
            if isinstance(value, tuple) and len(value) >= 2:
                iterable.append((value[0], value[1]))
            else:
                iterable.append((value, None))
    else:
        iterable = [(dev, None) for dev in (found or [])]

    seen = set()
    for dev, adv in iterable:
        address = str(getattr(dev, "address", "") or "").strip()
        if not address or address in seen:
            continue
        seen.add(address)
        advertised_name = _adv_name(dev, adv)
        device_name = str(getattr(dev, "name", "") or advertised_name or "")
        family = classify_name(device_name) or classify_name(advertised_name) or "unknown"
        rows.append(DiscoveredDevice(
            name=device_name,
            address=address,
            family=family,
            rssi=_adv_rssi(dev, adv),
            advertised_name=advertised_name,
            service_uuids=_adv_services(adv),
        ))
    rows.sort(key=lambda x: (0 if x.family != "unknown" else 1, -(x.rssi or -999), x.name.lower(), x.address))
    return rows


async def scan_known(timeout: float = 5.0) -> list[DiscoveredDevice]:
    """Compatibility helper: return recognized devices only."""
    return [x for x in await scan_all(timeout=timeout) if x.family != "unknown"]


def _services_from_client(client: Any) -> list[CharacteristicInfo]:
    out: list[CharacteristicInfo] = []
    services = getattr(client, "services", None)
    if services is None:
        return out
    for service in services:
        suuid = str(getattr(service, "uuid", ""))
        for char in getattr(service, "characteristics", ()) or ():
            out.append(CharacteristicInfo(
                suuid,
                str(getattr(char, "uuid", "")),
                tuple(str(x) for x in (getattr(char, "properties", ()) or ())),
            ))
    return out


async def verify_gatt_read_only(
    address: str,
    expected_service_uuid: str | None = None,
    expected_write_uuid: str | None = None,
    expected_notify_uuid: str | None = None,
    client_factory: Callable[..., Any] | None = None,
) -> dict:
    """Connect, enumerate GATT, disconnect. No characteristic write is performed."""
    if not isinstance(address, str) or not address.strip():
        raise ValueError("address_required")
    if client_factory is None:
        if BleakClient is None:
            raise RuntimeError("bleak not installed")
        client_factory = BleakClient

    client = client_factory(address)
    connected = False
    characteristics = []
    errors = []
    try:
        await client.connect(timeout=10.0)
        connected = bool(getattr(client, "is_connected", True))
        characteristics = _services_from_client(client)
    except Exception as exc:
        errors.append(str(exc))
    finally:
        if getattr(client, "is_connected", False):
            try:
                await client.disconnect()
            except Exception as exc:
                errors.append("disconnect: " + str(exc))

    service_values = {str(x.service_uuid).lower() for x in characteristics}
    char_values = {str(x.characteristic_uuid).lower() for x in characteristics}
    exp_service = str(expected_service_uuid or "").lower()
    exp_write = str(expected_write_uuid or "").lower()
    exp_notify = str(expected_notify_uuid or "").lower()

    checks = {
        "connected": connected,
        "service_uuid": (not exp_service) or exp_service in service_values,
        "write_characteristic_present": (not exp_write) or exp_write in char_values,
        "notify_characteristic_present": (not exp_notify) or exp_notify in char_values,
        "no_errors": not errors,
    }
    return {
        "ok": all(checks.values()),
        "hardware_io": "READ_ONLY_GATT_VERIFY",
        "address": address,
        "checks": checks,
        "characteristics": [asdict(x) for x in characteristics],
        "errors": errors,
        "write_operations": 0,
        "hardware_verified": False,
    }


async def capture_read_only(
    address: str,
    notify_uuids: list[str] | tuple[str, ...],
    duration_s: float = 5.0,
    client_factory: Callable[..., Any] | None = None,
) -> dict:
    """Read-only BLE capture. No write_gatt_char call exists in this function."""
    if not isinstance(address, str) or not address.strip():
        raise ValueError("address_required")
    duration_s = max(0.1, min(30.0, float(duration_s)))
    if client_factory is None:
        if BleakClient is None:
            raise RuntimeError("bleak not installed")
        client_factory = BleakClient

    client = client_factory(address)
    samples: list[NotificationSample] = []
    started = time.monotonic()
    subscribed: list[str] = []
    errors: list[dict[str, str]] = []
    characteristics = []

    try:
        await client.connect(timeout=10.0)
        characteristics = _services_from_client(client)

        def callback(_sender, data, uuid=""):
            samples.append(NotificationSample(
                address=address,
                characteristic_uuid=uuid,
                payload_hex=bytes(data).hex(" ").upper(),
                monotonic_s=time.monotonic(),
            ))

        for uuid in notify_uuids:
            uuid = str(uuid).strip()
            if not uuid:
                continue
            try:
                await client.start_notify(uuid, lambda sender, data, u=uuid: callback(sender, data, u))
                subscribed.append(uuid)
            except Exception as exc:
                errors.append({"uuid": uuid, "error": str(exc)})

        await asyncio.sleep(duration_s)

        for uuid in list(subscribed):
            stop = getattr(client, "stop_notify", None)
            if stop is not None:
                try:
                    await stop(uuid)
                except Exception as exc:
                    errors.append({"uuid": uuid, "error": "stop_notify: " + str(exc)})
    finally:
        if getattr(client, "is_connected", False):
            try:
                await client.disconnect()
            except Exception as exc:
                errors.append({"uuid": "", "error": "disconnect: " + str(exc)})

    return {
        "ok": True,
        "hardware_io": "READ_ONLY",
        "address": address,
        "duration_s": round(time.monotonic() - started, 3),
        "characteristics": [asdict(x) for x in characteristics],
        "subscribed": subscribed,
        "samples": [asdict(x) for x in samples],
        "errors": errors,
        "write_operations": 0,
    }
