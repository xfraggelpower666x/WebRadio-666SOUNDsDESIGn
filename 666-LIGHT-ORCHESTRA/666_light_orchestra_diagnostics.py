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

    govee = await engine.govee.discover()
    govee_ip = govee.get("ip") or cfg.get("govee", {}).get("device_ip")
    govee_network = await asyncio.to_thread(ping_host, govee_ip)

    return {
        "schema": 1,
        "kind": "LIGHT_ORCHESTRA_READ_ONLY_DIAGNOSTICS",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "python": sys.version,
        "platform": platform.platform(),
        "hardware_writes_performed": 0,
        "bluetooth": bluetooth,
        "ble_scan": ble,
        "govee": govee,
        "govee_network": {"ip": govee_ip, **govee_network},
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
    g = report["govee"]
    gn = report["govee_network"]
    print("============================================================")
    print(" 666 LIGHT ORCHESTRA - READ ONLY DIAGNOSTICS")
    print("============================================================")
    print(f"Bluetooth: {bt.get('adapter_state')} / {bt.get('reason')}")
    print(f"Bluetooth service: {bt.get('service_state')}")
    print(f"BLE visible devices: {len(ble.get('devices') or [])}")
    print(f"Govee: {'FOUND' if g.get('ok') else 'NOT FOUND'} / {g.get('ip')} / {g.get('source')}")
    print(f"Govee network reachability: {gn.get('reason')} / {gn.get('ip')}")
    print(f"Hardware writes performed: {report['hardware_writes_performed']}")
    print(f"Report: {REPORT_FILE.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
