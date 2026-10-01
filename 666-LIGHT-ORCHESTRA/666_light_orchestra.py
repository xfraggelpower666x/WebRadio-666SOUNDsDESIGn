from __future__ import annotations

import asyncio
import json
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from device_registry import DeviceRegistry

try:
    from bleak import BleakClient, BleakScanner
except Exception:
    BleakClient = None
    BleakScanner = None

VERSION = "0.5.0-dev"
LENZE_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb"
LENZE_WRITE_UUID = "0000fff3-0000-1000-8000-00805f9b34fb"
LENZE_NOTIFY_UUID = "0000fff4-0000-1000-8000-00805f9b34fb"
MAGIC_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb"
MAGIC_WRITE_UUID = "0000fff3-0000-1000-8000-00805f9b34fb"
MAGIC_NOTIFY_UUID = "0000fff4-0000-1000-8000-00805f9b34fb"

DEFAULT_CONFIG = {
    "server": {"host": "127.0.0.1", "port": 3000, "allowed_origins": ["https://webradio.666soundsdesign-broadcaster.com", "http://localhost:3000", "http://127.0.0.1:3000"]},
    "engine": {"enabled": True, "mode": "cyber"},
    "govee": {
        "enabled": True,
        "auto_discover": True,
        "device_ip": None,
        "device_name": "GOVEE-LIGHT-BARS",
        "model": "H6047",
    },
    "lenze": {
        "enabled": True,
        "device_name_prefix": "LENZE-RGB",
        "service_uuid": LENZE_SERVICE_UUID,
        "write_uuid": LENZE_WRITE_UUID,
        "notify_uuid": LENZE_NOTIFY_UUID,
        "write_enabled": False,
    },
    "magic_lantern": {
        "enabled": True,
        "device_name_prefix": "OC21W",
        "service_uuid": MAGIC_SERVICE_UUID,
        "write_uuid": MAGIC_WRITE_UUID,
        "notify_uuid": MAGIC_NOTIFY_UUID,
        "write_enabled": False,
        "protocol_verified": False,
        "approved_windows_addresses": [],
        "disconnect_after_write": True,
        "color_order": "RGB",
    },
}


def merge(base, override):
    out = dict(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config(path="config.json"):
    p = Path(path)
    return merge(DEFAULT_CONFIG, json.loads(p.read_text("utf-8"))) if p.exists() else DEFAULT_CONFIG


class GoveeLan:
    DISCOVERY_ADDR = ("239.255.255.250", 4001)
    CONTROL_PORT = 4003

    def __init__(self, cfg):
        self.cfg = cfg
        self.ip = cfg.get("device_ip")
        self.online = False
        self.detail = "not started"
        self.last_color = None
        self._last_audio_write = 0.0
        self._last_probe_ok = 0.0

    async def start(self):
        if not self.cfg.get("enabled", True):
            self.detail = "disabled"
            return
        if not self.ip and self.cfg.get("auto_discover", True):
            self.ip = await asyncio.to_thread(self._discover)
        self.online = False  # IP-Konfiguration ist kein Erreichbarkeitsnachweis
        self.detail = f"LAN target {self.ip}; probe pending" if self.ip else "not discovered"

    def _discover(self):
        msg = json.dumps({"msg": {"cmd": "scan", "data": {"account_topic": "reserve"}}}).encode()
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.settimeout(1.2)
        try:
            try:
                sock.bind(("", 4002))
            except OSError:
                pass
            sock.sendto(msg, self.DISCOVERY_ADDR)
            deadline = time.time() + 2.5
            while time.time() < deadline:
                try:
                    raw, addr = sock.recvfrom(65535)
                except socket.timeout:
                    continue
                try:
                    data = json.loads(raw.decode("utf-8", "ignore")).get("msg", {}).get("data", {})
                    ip = data.get("ip") or addr[0]
                    model = str(data.get("sku") or data.get("model") or "")
                    name = str(data.get("deviceName") or "")
                    wanted_model = str(self.cfg.get("model") or "")
                    wanted_name = str(self.cfg.get("device_name") or "")
                    if wanted_model and model and wanted_model.lower() == model.lower():
                        return ip
                    if wanted_name and name and wanted_name.lower() in name.lower():
                        return ip
                    if not wanted_model and not wanted_name:
                        return ip
                except Exception:
                    pass
        finally:
            sock.close()
        return None

    def _send(self, cmd, data):
        if not self.ip:
            raise RuntimeError("Govee device not discovered")
        packet = json.dumps({"msg": {"cmd": cmd, "data": data}}, separators=(",", ":")).encode()
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            sock.sendto(packet, (self.ip, self.CONTROL_PORT))
        finally:
            sock.close()

    def _probe_sync(self):
        """Read-only UDP status query; no color/power changes."""
        if not self.ip:
            return {"ok": False, "reason": "no_configured_address"}
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(1.5)
        try:
            sock.bind(("", 4002))
            self._send("devStatus", {})
            until = time.monotonic() + 2.0
            while time.monotonic() < until:
                try:
                    raw, sender = sock.recvfrom(4096)
                except socket.timeout:
                    break
                if sender[0] != self.ip:
                    continue
                try:
                    message = json.loads(raw.decode("utf-8", "replace"))
                except (UnicodeDecodeError, ValueError):
                    continue
                envelope = message.get("msg", {}) if isinstance(message, dict) else {}
                if not isinstance(envelope, dict) or envelope.get("cmd") != "devStatus":
                    continue
                data = envelope.get("data")
                if not isinstance(data, dict):
                    continue
                if data.get("onOff") not in (0, 1) or not isinstance(data.get("brightness"), int):
                    continue
                if not 1 <= data["brightness"] <= 100:
                    continue
                return {"ok": True, "source_ip": sender[0], "status": data}
            return {"ok": False, "reason": "no_matching_udp_response"}
        except OSError as exc:
            return {"ok": False, "reason": "udp_port_unavailable", "details": str(exc)}
        finally:
            sock.close()

    async def probe(self):
        result = await asyncio.to_thread(self._probe_sync)
        self.online = bool(result.get("ok"))
        self._last_probe_ok = time.monotonic() if self.online else 0.0
        self.detail = "LAN probe confirmed" if self.online else "LAN probe: " + str(result.get("reason", "unknown"))
        return result

    def _require_confirmed_lan(self):
        if not self.cfg.get("enabled", True) or not self.online or (time.monotonic() - self._last_probe_ok > 300.0):
            self.online = False
            raise RuntimeError("GOVEE_LAN_UNVERIFIED_OR_STALE: run successful /api/govee/probe first")

    async def set_power(self, on):
        self._require_confirmed_lan()
        await asyncio.to_thread(self._send, "turn", {"value": 1 if on else 0})
        self.detail = "power UDP sent (no ack)"

    async def set_color(self, r, g, b, brightness=65):
        self._require_confirmed_lan()
        r, g, b = [max(0, min(255, int(x))) for x in (r, g, b)]
        brightness = max(1, min(100, int(brightness)))
        await asyncio.to_thread(self._send, "colorwc", {"color": {"r": r, "g": g, "b": b}, "colorTemInKelvin": 0})
        await asyncio.to_thread(self._send, "brightness", {"value": brightness})
        self.last_color = (r, g, b, brightness)
        self.detail = "color UDP sent (no ack)"

    async def audio(self, payload):
        if not self.online or (time.monotonic() - self._last_probe_ok > 300.0):
            self.online = False
            return {"ok": False, "reason": "govee_probe_required_or_stale"}
        now = time.monotonic()
        if now - self._last_audio_write < 0.20:
            return {"ok": True, "throttled": True}
        energy = max(0, min(255, int(payload.get("energy", 0))))
        bass = max(0, min(255, int(payload.get("bass", 0))))
        mid = max(0, min(255, int(payload.get("mid", 0))))
        high = max(0, min(255, int(payload.get("high", 0))))
        if payload.get("drop"):
            rgb = (255, 35, 210)
        elif payload.get("kick"):
            rgb = (120 + bass // 2, 30 + mid // 6, 180 + high // 4)
        else:
            rgb = (60 + mid // 2, 20 + high // 8, 130 + bass // 3)
        rgb = tuple(max(0, min(255, x)) for x in rgb)
        brightness = max(8, min(100, round(18 + energy * 82 / 255)))
        if (*rgb, brightness) != self.last_color:
            await self.set_color(*rgb, brightness)
            self._last_audio_write = time.monotonic()
        return {"ok": True}

    def status(self):
        return {"kind": "govee", "name": self.cfg.get("device_name") or "Govee", "online": self.online, "detail": self.detail, "ip": self.ip, "model": self.cfg.get("model")}


class LenzeFleet:
    def __init__(self, cfg):
        self.cfg = cfg
        self.devices = {}
        self.clients = {}
        self.notifications = {}
        self.detail = "not started"

    async def start(self):
        if not self.cfg.get("enabled", True):
            self.detail = "disabled"
            return
        await self.scan()
        self.detail = f"{len(self.devices)} LENZE-RGB found; command writes safety-blocked"

    async def scan(self, timeout=5.0):
        if BleakScanner is None:
            self.detail = "bleak not installed"
            return []
        prefix = str(self.cfg.get("device_name_prefix") or "LENZE-RGB").lower()
        found = await BleakScanner.discover(timeout=timeout)
        self.devices = {d.address: d for d in found if (d.name or "").lower().startswith(prefix)}
        return [{"name": d.name, "address": d.address} for d in self.devices.values()]

    async def connect_all(self):
        if BleakClient is None:
            raise RuntimeError("bleak not installed")
        for address, dev in self.devices.items():
            client = self.clients.get(address)
            if client and client.is_connected:
                continue
            client = BleakClient(dev)
            await client.connect(timeout=10.0)
            self.clients[address] = client
            try:
                await client.start_notify(
                    self.cfg.get("notify_uuid", LENZE_NOTIFY_UUID),
                    lambda _c, data, a=address: self.notifications.__setitem__(a, bytes(data).hex()),
                )
            except Exception:
                pass
        return list(self.clients)

    async def set_power(self, on):
        raise RuntimeError("LENZE_WRITE_BLOCKED: power command frame not verified")

    async def set_color(self, r, g, b, brightness=65):
        raise RuntimeError("LENZE_WRITE_BLOCKED: color command frame not verified")

    async def audio(self, payload):
        return

    def status(self):
        return {
            "kind": "lenze",
            "name": "LENZE-RGB fleet",
            "online": any(getattr(c, "is_connected", False) for c in self.clients.values()),
            "detail": self.detail,
            "found": [{"name": d.name, "address": a} for a, d in self.devices.items()],
            "service_uuid": self.cfg.get("service_uuid", LENZE_SERVICE_UUID),
            "write_uuid": self.cfg.get("write_uuid", LENZE_WRITE_UUID),
            "notify_uuid": self.cfg.get("notify_uuid", LENZE_NOTIFY_UUID),
            "write_enabled": False,
            "command_protocol_verified": False,
            "notifications": dict(self.notifications),
        }


class MagicLanternFleet:
    def __init__(self, cfg):
        self.cfg = cfg
        self.devices = {}
        self.clients = {}
        self.detail = "not started"
        self.last_frame = None

    async def start(self):
        if not self.cfg.get("enabled", True):
            self.detail = "disabled"
            return
        await self.scan()
        state = "armed" if self.cfg.get("write_enabled", False) else "write-blocked"
        self.detail = f"{len(self.devices)} OC21W found; public FFF0 protocol {state}"

    async def scan(self, timeout=5.0):
        if BleakScanner is None:
            self.detail = "bleak not installed"
            return []
        prefix = str(self.cfg.get("device_name_prefix") or "OC21W").lower()
        found = await BleakScanner.discover(timeout=timeout)
        self.devices = {d.address: d for d in found if (d.name or "").lower().startswith(prefix)}
        return [{"name": d.name, "address": d.address} for d in self.devices.values()]

    @staticmethod
    def _frame(length, cmd, p1, p2, p3, p4, p5):
        return bytes((0x7E, length & 0xFF, cmd & 0xFF, p1 & 0xFF, p2 & 0xFF, p3 & 0xFF, p4 & 0xFF, p5 & 0xFF, 0xEF))

    def _ordered_rgb(self, r, g, b):
        order = str(self.cfg.get("color_order") or "RGB").upper()
        values = {"R": int(r), "G": int(g), "B": int(b)}
        if sorted(order) != ["B", "G", "R"]:
            order = "RGB"
        return tuple(values[ch] for ch in order)

    async def _write_all(self, payload):
        if not self.cfg.get("write_enabled", False) or not self.cfg.get("protocol_verified", False):
            raise RuntimeError("MAGIC_LANTERN_WRITE_BLOCKED: unverified controller protocol")
        allowed = set(self.cfg.get("approved_windows_addresses") or [])
        if not allowed or not self.devices or any(address not in allowed for address in self.devices):
            raise RuntimeError("MAGIC_LANTERN_WRITE_BLOCKED: Windows BLE address allowlist required")
        if BleakClient is None:
            raise RuntimeError("bleak not installed")
        if not self.devices:
            await self.scan()
        results = []
        for address, dev in list(self.devices.items()):
            client = None
            try:
                client = BleakClient(dev)
                await client.connect(timeout=10.0)
                await client.write_gatt_char(self.cfg.get("write_uuid", MAGIC_WRITE_UUID), payload, response=False)
                self.last_frame = payload.hex(" ").upper()
                results.append({"address": address, "ok": True})
            except Exception as exc:
                results.append({"address": address, "ok": False, "error": str(exc)})
            finally:
                if client is not None and self.cfg.get("disconnect_after_write", True):
                    try:
                        await asyncio.wait_for(client.disconnect(), timeout=4.0)
                    except Exception:
                        pass
        return results

    async def set_power(self, on):
        b = 1 if on else 0
        return await self._write_all(self._frame(0x04, 0x04, b, 0x00, b, 0xFF, 0x00))

    async def set_color(self, r, g, b, brightness=65):
        r, g, b = self._ordered_rgb(r, g, b)
        result = await self._write_all(self._frame(0x07, 0x05, 0x03, r, g, b, 0x10))
        await asyncio.sleep(0.06)
        await self._write_all(self._frame(0x04, 0x01, max(0, min(100, int(brightness))), 0x01, 0xFF, 0xFF, 0x00))
        return result

    async def set_mode(self, mode, speed=None):
        result = await self._write_all(self._frame(0x05, 0x03, int(mode) | 0x80, 0x03, 0xFF, 0xFF, 0x00))
        if speed is not None:
            await asyncio.sleep(0.06)
            await self._write_all(self._frame(0x04, 0x02, int(speed), 0xFF, 0xFF, 0xFF, 0x00))
        return result

    async def audio(self, payload):
        if not self.cfg.get("write_enabled", False) or not self.cfg.get("protocol_verified", False):
            return {"ok": True, "skipped": "magic_lantern_write_blocked"}
        energy = max(0, min(255, int(payload.get("energy", 0))))
        bass = max(0, min(255, int(payload.get("bass", 0))))
        mid = max(0, min(255, int(payload.get("mid", 0))))
        high = max(0, min(255, int(payload.get("high", 0))))
        if payload.get("drop"):
            rgb = (255, 20, 220)
        elif payload.get("kick"):
            rgb = (min(255, 100 + bass // 2), min(255, 30 + mid // 3), min(255, 160 + high // 3))
        else:
            rgb = (min(255, 30 + mid // 2), min(255, 80 + high // 2), min(255, 120 + bass // 2))
        brightness = max(10, min(100, round(15 + energy * 85 / 255)))
        await self.set_color(*rgb, brightness)

    def status(self):
        return {
            "kind": "magic_lantern",
            "name": "Magic Lantern OC21W fleet",
            "online": any(getattr(client, "is_connected", False) for client in self.clients.values()),
            "detail": self.detail,
            "found": [{"name": d.name, "address": a} for a, d in self.devices.items()],
            "service_uuid": self.cfg.get("service_uuid", MAGIC_SERVICE_UUID),
            "write_uuid": self.cfg.get("write_uuid", MAGIC_WRITE_UUID),
            "notify_uuid": self.cfg.get("notify_uuid", MAGIC_NOTIFY_UUID),
            "write_enabled": bool(self.cfg.get("write_enabled", False)),
            "command_protocol_verified": "public-wl.smartled.rgb-fff0-family",
            "last_frame": self.last_frame,
        }


class Engine:
    def __init__(self, cfg):
        self.cfg = cfg
        self.enabled = bool(cfg["engine"].get("enabled", True))
        self.mode = str(cfg["engine"].get("mode", "cyber"))
        self.registry = DeviceRegistry()
        self.govee = GoveeLan(cfg["govee"])
        self.lenze = LenzeFleet(cfg["lenze"])
        self.magic_lantern = MagicLanternFleet(cfg["magic_lantern"])
        self.devices = [self.govee, self.lenze, self.magic_lantern]
        self.last_audio = None
        self.started_at = time.time()
        self.lock = asyncio.Lock()

    async def start(self):
        self.start_errors = []
        outcomes = await asyncio.gather(*(d.start() for d in self.devices), return_exceptions=True)
        for adapter, outcome in zip(self.devices, outcomes):
            if isinstance(outcome, BaseException):
                self.start_errors.append({"device": adapter.status()["kind"], "error": str(outcome)})

    async def set_enabled(self, enabled):
        self.enabled = bool(enabled)
        return self.status()

    async def set_mode(self, mode):
        self.mode = str(mode or "cyber")[:32]
        return self.status()

    def _device_selected(self, device):
        """Registry enables individual hardware; BLE addresses require separate proof."""
        if device is self.govee:
            entry = self.registry.get("govee_h6047")
            return bool(entry and entry.get("enabled") and self.govee.cfg.get("enabled", True))
        if device is self.lenze:
            return any(d["family"] == "lenze" and d["enabled"] for d in self.registry.all())
        if device is self.magic_lantern:
            selected = [d for d in self.registry.all() if d["family"] == "magic_lantern" and d["enabled"]]
            if not selected:
                return False
            windows = {d["windows_ble_address"] for d in selected if d.get("windows_ble_address")}
            discovered = set(self.magic_lantern.devices)
            return bool(discovered and discovered <= windows)
        return True  # injected mock/adapters still surface their failures in offline tests

    async def test_device_color(self, device_id, r, g, b, brightness=65):
        if not self.enabled:
            raise RuntimeError("MASTER_DISABLED")
        if device_id != "govee_h6047" or not self._device_selected(self.govee):
            raise RuntimeError("WRITE_BLOCKED: device not selected or protocol not validated")
        await self.govee.set_color(r, g, b, brightness)
        return {"ok": True, "device": device_id, "notice": "UDP sent; device acknowledgement not implied"}

    async def set_power(self, on):
        if not self.enabled:
            return {"ok": False, "error": "MASTER_DISABLED", "results": []}
        out = []
        for d in self.devices:
            if not self._device_selected(d):
                out.append({"device": d.status()["kind"], "ok": True, "skipped": "registry_disabled_or_identity_unverified"})
                continue
            try:
                await d.set_power(on)
                out.append({"device": d.status()["kind"], "ok": True})
            except Exception as e:
                out.append({"device": d.status()["kind"], "ok": False, "error": str(e)})
        return {"ok": all(x["ok"] for x in out), "results": out}

    async def set_color(self, r, g, b, brightness=65):
        if not self.enabled:
            return {"ok": False, "error": "MASTER_DISABLED", "results": []}
        out = []
        for d in self.devices:
            if not self._device_selected(d):
                out.append({"device": d.status()["kind"], "ok": True, "skipped": "registry_disabled_or_identity_unverified"})
                continue
            try:
                await d.set_color(r, g, b, brightness)
                out.append({"device": d.status()["kind"], "ok": True})
            except Exception as e:
                out.append({"device": d.status()["kind"], "ok": False, "error": str(e)})
        return {"ok": all(x["ok"] for x in out), "results": out}

    async def audio(self, payload):
        self.last_audio = payload
        if not self.enabled:
            return {"ok": True, "enabled": False}
        async with self.lock:
            selected = [d for d in self.devices if self._device_selected(d)]
            results = await asyncio.gather(*(d.audio(payload) for d in selected), return_exceptions=True)
        errors = [{"device": adapter.status()["kind"], "error": str(value) if isinstance(value, BaseException) else str(value.get("reason") or value.get("error") or "adapter_reported_failure")}
                  for adapter, value in zip(selected, results)
                  if isinstance(value, BaseException) or (isinstance(value, dict) and value.get("ok") is False)]
        return {"ok": not errors, "enabled": True, "errors": errors}

    def status(self):
        return {
            "ok": True,
            "registry": self.registry.all(),
            "name": "666SOUNDsDESIGn LIGHT ORCHESTRA",
            "version": VERSION,
            "enabled": self.enabled,
            "mode": self.mode,
            "uptime_s": int(time.time() - self.started_at),
            "devices": [d.status() for d in self.devices],
            "last_audio": self.last_audio,
            "start_errors": getattr(self, "start_errors", []),
        }


class Bridge:
    def __init__(self, engine, host, port):
        self.engine = engine
        self.host = host
        self.port = int(port)
        self.loop = asyncio.new_event_loop()

    def run_async(self, coro):
        future = asyncio.run_coroutine_threadsafe(coro, self.loop)
        try:
            return future.result(timeout=15)
        except Exception:
            future.cancel()
            raise

    def start(self):
        threading.Thread(target=self._loop, daemon=True).start()
        bridge = self
        engine = self.engine

        class Handler(BaseHTTPRequestHandler):
            def headers_json(self, code=200):
                self.send_response(code)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                origin = self.headers.get("Origin")
                allowed = bridge.engine.cfg.get("server", {}).get("allowed_origins", [])
                if origin and origin in allowed:
                    self.send_header("Access-Control-Allow-Origin", origin)
                    self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.end_headers()

            def reply(self, obj, code=200):
                self.headers_json(code)
                self.wfile.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))

            def body(self):
                n = int(self.headers.get("Content-Length") or 0)
                if n < 0 or n > 65536:
                    raise ValueError("request_body_size_limit")
                result = json.loads(self.rfile.read(n).decode("utf-8")) if n else {}
                if not isinstance(result, dict):
                    raise ValueError("json_body_must_be_object")
                return result

            def _authorized(self):
                host = self.headers.get("Host", "").split(":")[0].lower()
                origin = self.headers.get("Origin")
                allowed = bridge.engine.cfg.get("server", {}).get("allowed_origins", [])
                if host not in ("localhost", "127.0.0.1") or (origin is not None and origin not in allowed):
                    self.reply({"ok": False, "error": "forbidden_origin_or_host"}, 403)
                    return False
                return True

            def do_OPTIONS(self):
                if self._authorized():
                    self.headers_json(204)

            def do_GET(self):
                if not self._authorized():
                    return
                path = urlparse(self.path).path
                if path in ("/", "/api/status"):
                    self.reply(engine.status())
                elif path == "/api/devices":
                    self.reply({"devices": engine.status()["devices"], "registry": engine.registry.all()})
                elif path == "/api/registry":
                    self.reply({"ok": True, "devices": engine.registry.all()})
                else:
                    self.reply({"ok": False, "error": "not_found"}, 404)

            def do_POST(self):
                if not self._authorized():
                    return
                if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                    return self.reply({"ok": False, "error": "json_required"}, 415)
                path = urlparse(self.path).path
                try:
                    body = self.body()
                    if path == "/api/enabled":
                        result = bridge.run_async(engine.set_enabled(bool(body.get("enabled"))))
                    elif path == "/api/mode":
                        result = bridge.run_async(engine.set_mode(body.get("mode", "cyber")))
                    elif path == "/api/audio":
                        result = bridge.run_async(engine.audio(body))
                    elif path == "/api/test/on":
                        result = bridge.run_async(engine.set_power(True))
                    elif path == "/api/test/off":
                        result = bridge.run_async(engine.set_power(False))
                    elif path == "/api/test/color":
                        result = bridge.run_async(engine.set_color(body.get("r", 0), body.get("g", 180), body.get("b", 255), body.get("brightness", 65)))
                    elif path == "/api/govee/probe":
                        result = bridge.run_async(engine.govee.probe())
                    elif path == "/api/registry/update":
                        result = {"ok": True, "device": engine.registry.edit(str(body.get("id", "")), body.get("updates", {}))}
                    elif path == "/api/device/test-color":
                        device_id = str(body.get("id", ""))
                        entry = engine.registry.get(device_id)
                        if entry is None:
                            raise ValueError("unknown_device")
                        if device_id != "govee_h6047" or not entry.get("enabled"):
                            raise ValueError("WRITE_BLOCKED: individual hardware test requires verified and enabled Govee H6047")
                        result = bridge.run_async(engine.test_device_color(device_id, body.get("r", 0), body.get("g", 180), body.get("b", 255), body.get("brightness", 65)))
                    elif path == "/api/lenze/scan":
                        result = {"ok": True, "result": bridge.run_async(engine.lenze.scan())}
                    elif path == "/api/magic-lantern/scan":
                        result = {"ok": True, "result": bridge.run_async(engine.magic_lantern.scan())}
                    elif path == "/api/magic-lantern/mode":
                        result = {"ok": True, "result": bridge.run_async(engine.magic_lantern.set_mode(body.get("mode", 0), body.get("speed")))}
                    else:
                        return self.reply({"ok": False, "error": "not_found"}, 404)
                    self.reply(result, 200 if result.get("ok", True) else 502)
                except Exception as e:
                    self.reply({"ok": False, "error": str(e)}, 500)

            def log_message(self, fmt, *args):
                print("[HTTP] " + fmt % args)

        self.httpd = ThreadingHTTPServer((self.host, self.port), Handler)
        print(f"666 LIGHT ORCHESTRA v{VERSION} on http://{self.host}:{self.port}")
        self.httpd.serve_forever()

    def _loop(self):
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self.engine.start())
        self.loop.run_forever()


if __name__ == "__main__":
    cfg = load_config()
    EngineCfg = Engine(cfg)
    Bridge(EngineCfg, cfg["server"]["host"], cfg["server"]["port"]).start()
