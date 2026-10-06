"""Read-only Windows BLE discovery/capture for LIGHT ORCHESTRA.

This module never writes GATT characteristics. It may scan, connect, enumerate
services/characteristics, subscribe to notifications, and disconnect.
"""
from __future__ import annotations

import asyncio
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
    value = str(name or "").lower()
    if value.startswith("lenze-rgb"):
        return "lenze"
    if value.startswith("oc21w"):
        return "magic_lantern"
    return None


async def scan_known(timeout: float = 5.0) -> list[DiscoveredDevice]:
    if BleakScanner is None:
        raise RuntimeError("bleak not installed")
    found = await BleakScanner.discover(timeout=timeout)
    out = []
    for dev in found:
        family = classify_name(getattr(dev, "name", None))
        if family:
            out.append(DiscoveredDevice(
                str(dev.name or ""),
                str(dev.address),
                family,
                getattr(dev, "rssi", None),
            ))
    return out


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
