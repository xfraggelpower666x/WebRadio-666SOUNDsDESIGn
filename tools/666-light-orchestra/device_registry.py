"""Lokale, nicht-destruktive Geräte-Registry für 666 LIGHT ORCHESTRA.

iOS CoreBluetooth-UUIDs sind Identitäts-Hinweise und KEINE Windows-BLE-Adressen.
Schreibzugriffe auf Hardware werden NICHT durch diese Registry freigeschaltet.
"""
from __future__ import annotations
import json
import os
from pathlib import Path

SCHEMA_VERSION = 1
SEED_DEVICES = [
    {"id":"govee_h6047","family":"govee","label":"Govee H6047 Lightbars","transport":"lan",
     "host":"192.168.2.32","mac":"60:74:F4:40:D9:A2","model":"H6047","role":"room",
     "verified":"user_router_and_govee_screenshots","enabled":True},
    {"id":"govee_tv","family":"govee","label":"Govee TV (Modell offen)","transport":"unverified",
     "host":"192.168.2.33","mac":"60:74:F4:4F:1C:C5","model":None,"role":"unassigned",
     "verified":"router_presence_only","enabled":False},
    {"id":"lenze_1","family":"lenze","label":"LENZE-RGB 1","transport":"ble",
     "ios_peripheral_uuid":"18D726B4-2B86-0119-3A60-4A6670B1EF21",
     "windows_ble_address":None,"role":"unassigned","verified":"ios_connected","enabled":False},
    {"id":"lenze_2","family":"lenze","label":"LENZE-RGB 2","transport":"ble",
     "ios_peripheral_uuid":"230C5293-707D-E21D-5F1E-E24988A71AB5",
     "windows_ble_address":None,"role":"unassigned","verified":"ios_connected","enabled":False},
    {"id":"oc21w_1","family":"magic_lantern","label":"OC21W 1","transport":"ble",
     "ios_peripheral_uuid":"E9A6F268-0295-4E63-C44A-F7515EE6BBDF",
     "windows_ble_address":None,"role":"unassigned","verified":"ios_bound","enabled":False},
    {"id":"oc21w_2","family":"magic_lantern","label":"OC21W 2","transport":"ble",
     "ios_peripheral_uuid":"9EC7E483-33CE-1434-B75C-1891A8997040",
     "windows_ble_address":None,"role":"unassigned","verified":"ios_bound","enabled":False},
    {"id":"oc21w_3","family":"magic_lantern","label":"OC21W 3","transport":"ble",
     "ios_peripheral_uuid":"07D72E18-0866-F349-4862-3A3119E9F2C0",
     "windows_ble_address":None,"role":"unassigned","verified":"ios_bound","enabled":False},
    {"id":"oc21w_4","family":"magic_lantern","label":"OC21W 4","transport":"ble",
     "ios_peripheral_uuid":"5545C7BA-CE31-C31A-0636-FA9FA064A662",
     "windows_ble_address":None,"role":"unassigned","verified":"ios_bound","enabled":False}
]
ALLOWED_EDIT_FIELDS = {"label","role","enabled"}

class DeviceRegistry:
    def __init__(self, path=None):
        self.path = Path(path or Path(__file__).with_name("devices.local.json"))
        self._entries = self._load()

    def _load(self):
        base = {v["id"]:dict(v) for v in SEED_DEVICES}
        if self.path.exists():
            saved = json.loads(self.path.read_text(encoding="utf-8"))
            if not isinstance(saved,dict) or saved.get("schema") != SCHEMA_VERSION:
                raise ValueError("Registry-Schema unbekannt – keine automatische Migration")
            for item in saved.get("devices",[]):
                identifier = item.get("id")
                if identifier not in base:  # nie stillschweigend eine fremde Geräteidentität übernehmen
                    continue
                for k in ALLOWED_EDIT_FIELDS:
                    if k in item:
                        base[identifier][k] = item[k]
        return base

    def all(self):
        return [dict(item) for item in self._entries.values()]

    def get(self, device_id):
        result = self._entries.get(str(device_id))
        return dict(result) if result is not None else None

    def edit(self, device_id, updates):
        if device_id not in self._entries:
            raise KeyError("unknown_device")
        if not isinstance(updates, dict) or not updates or set(updates) - ALLOWED_EDIT_FIELDS:
            raise ValueError("Only label, role, enabled are editable")
        if "enabled" in updates and not isinstance(updates["enabled"],bool):
            raise ValueError("enabled must be boolean")
        for field in ("label","role"):
            if field in updates and (not isinstance(updates[field],str) or len(updates[field])>100):
                raise ValueError(field+" must be text <= 100 chars")
        self._entries[device_id].update(updates)
        self.save()
        return self.get(device_id)

    def save(self):
        data={"schema":SCHEMA_VERSION,"devices":self.all()}
        self.path.parent.mkdir(parents=True,exist_ok=True)
        tmp=self.path.with_suffix(self.path.suffix+".tmp")
        try:
            with tmp.open("w",encoding="utf-8") as fh:
                json.dump(data,fh,ensure_ascii=False,indent=2)
                fh.flush()
                os.fsync(fh.fileno())
            os.replace(tmp,self.path)
        finally:
            if tmp.exists():
                tmp.unlink()
