from __future__ import annotations

import asyncio
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from importlib import import_module

core = import_module("666_light_orchestra")

REPORT_DIR = Path("diagnostics")
REPORT_FILE = REPORT_DIR / "LIGHT_ORCHESTRA_DIAGNOSTICS.json"

def ping_host(ip: str) -> dict:
    ip = str(ip or "").strip()
    if not ip:
        return {"ok": False, "reason": "NO_IP"}
    args = ["ping", "-n" if platform.system().lower() == "windows" else "-c", "1"]
    if platform.system().lower() == "windows":
        args += ["-w", "1200"]
    else:
        args += ["-W", "1"]
    args.append(ip)
    try:
        proc = subprocess.run(args, capture_output=True, text=True, timeout=3, check=False)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"ok": False, "reason": "PING_EXEC_FAILED", "details": str(exc)}
    return {
        "ok": proc.returncode == 0,
        "reason": "ICMP_REACHABLE" if proc.returncode == 0 else "ICMP_NO_REPLY",
        "returncode": proc.returncode,
    }



def windows_network_context() -> dict:
    if platform.system().lower() != "windows":
        return {"ok": False, "reason": "WINDOWS_ONLY"}
    command = (
        "$ErrorActionPreference='SilentlyContinue';"
        "$profiles=@(Get-NetConnectionProfile | Select-Object Name,InterfaceAlias,NetworkCategory,IPv4Connectivity,IPv6Connectivity);"
        "$firewall=@(Get-NetFirewallProfile | Select-Object Name,Enabled,DefaultInboundAction,DefaultOutboundAction);"
        "[pscustomobject]@{profiles=$profiles;firewall=$firewall}|ConvertTo-Json -Depth 5 -Compress"
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
        return {"ok": False, "reason": "NETWORK_CONTEXT_QUERY_FAILED", "details": str(exc)}
    if proc.returncode != 0 or not proc.stdout.strip():
        return {"ok": False, "reason": "NETWORK_CONTEXT_EMPTY", "details": (proc.stderr or "").strip()}
    try:
        payload = json.loads(proc.stdout)
    except (TypeError, ValueError) as exc:
        return {"ok": False, "reason": "NETWORK_CONTEXT_JSON_INVALID", "details": str(exc)}
    return {
        "ok": True,
        "profiles": payload.get("profiles") or [],
        "firewall": payload.get("firewall") or [],
    }


async def collect():
    cfg = core.load_config()
    engine = core.Engine(cfg)

    bluetooth = await asyncio.to_thread(engine.bluetooth_preflight)
    ble = {
        "ok": False,
        "hardware_io": "READ_ONLY_SCAN",
        "devices": [],
        "error": bluetooth.get("reason") if not bluetooth.get("ok") else None,
    }
    if bluetooth.get("ok"):
        ble = await engine.scan_all_ble(8.0)

    gatt_batch = await engine.verify_all_bound_ble() if bluetooth.get("ok") else {
        "ok": False,
        "hardware_io": "READ_ONLY_GATT_VERIFY_BATCH",
        "results": [],
        "bound_device_count": 0,
        "write_operations": 0,
        "hardware_verified": False,
        "automatic_write_enable": False,
        "error": bluetooth.get("reason") or "BLUETOOTH_NOT_READY",
    }

    govee = await engine.govee.discover()
    govee_ip = govee.get("ip") or cfg.get("govee", {}).get("device_ip")
    govee_network = await asyncio.to_thread(ping_host, govee_ip)
    network_context = await asyncio.to_thread(windows_network_context)

    return {
        "schema": 1,
        "kind": "LIGHT_ORCHESTRA_READ_ONLY_DIAGNOSTICS",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "python": sys.version,
        "platform": platform.platform(),
        "hardware_writes_performed": 0,
        "bluetooth": bluetooth,
        "ble_scan": ble,
        "gatt_batch": gatt_batch,
        "govee": govee,
        "govee_network": {"ip": govee_ip, **govee_network},
        "network_context": network_context,
        "registry": engine.registry.all(),
        "safety": {
            "lenze_write_verified": False,
            "oc21w_write_verified": bool(cfg.get("magic_lantern", {}).get("protocol_verified", False)),
            "automatic_protocol_promotion": False,
        },
    }


def main():
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report = asyncio.run(collect())
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    bt = report["bluetooth"]
    ble = report["ble_scan"]
    gatt = report["gatt_batch"]
    g = report["govee"]
    gn = report["govee_network"]
    print("============================================================")
    print(" 666 LIGHT ORCHESTRA - READ ONLY DIAGNOSTICS")
    print("============================================================")
    print(f"Bluetooth: {bt.get('adapter_state')} / {bt.get('reason')}")
    print(f"Bluetooth service: {bt.get('service_state')}")
    drivers = bt.get("drivers") or []
    if drivers:
        first = drivers[0]
        print(f"Bluetooth driver: {first.get('DeviceName')} / {first.get('DriverVersion')} / {first.get('DriverProviderName')}")
    print(f"BLE visible devices: {len(ble.get('devices') or [])}")
    gatt_rows = gatt.get("results") or []
    gatt_pass = sum(1 for row in gatt_rows if row.get("ok"))
    print(f"Bound BLE GATT verify: {gatt_pass}/{len(gatt_rows)} PASS / writes={gatt.get('write_operations', 0)}")
    print(f"Govee: {'FOUND' if g.get('ok') else 'NOT FOUND'} / {g.get('ip')} / {g.get('source')}")
    print(f"Govee network reachability: {gn.get('reason')} / {gn.get('ip')}")
    nc = report.get("network_context") or {}
    print(f"Windows network context: {'AVAILABLE' if nc.get('ok') else nc.get('reason')}")
    print(f"Hardware writes performed: {report['hardware_writes_performed']}")
    print(f"Report: {REPORT_FILE.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
