"""Hardware-free protocol design layer for LENZE RGB and OC21W.

This module NEVER performs BLE writes. It models capabilities, validation state,
candidate frame plans and audio-reactive intents so protocol development can
continue before real hardware validation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Verification(str, Enum):
    UNKNOWN = "unknown"
    CANDIDATE = "candidate"
    OBSERVED = "observed"
    VERIFIED = "verified"


@dataclass(frozen=True)
class BleIdentity:
    family: str
    name_prefix: str
    service_uuid: str
    write_uuid: str
    notify_uuid: str
    expected_count: int
    verification: Verification = Verification.CANDIDATE


@dataclass(frozen=True)
class Capability:
    name: str
    supported: bool
    verification: Verification
    notes: str = ""


@dataclass
class ProtocolProfile:
    profile_id: str
    identity: BleIdentity
    capabilities: dict[str, Capability]
    frame_family: str
    frame_verification: Verification
    notes: list[str] = field(default_factory=list)

    @property
    def hardware_writes_allowed(self) -> bool:
        return self.frame_verification is Verification.VERIFIED


@dataclass(frozen=True)
class CommandIntent:
    command: str
    params: dict[str, Any]
    target_family: str


@dataclass(frozen=True)
class FramePlan:
    profile_id: str
    command: str
    status: str
    candidate_frames_hex: tuple[str, ...] = ()
    reason: str = ""


LENZE_PROFILE = ProtocolProfile(
    profile_id="lenze-rgb-fff0-design-v1",
    identity=BleIdentity(
        family="lenze",
        name_prefix="LENZE-RGB",
        service_uuid="0000fff0-0000-1000-8000-00805f9b34fb",
        write_uuid="0000fff3-0000-1000-8000-00805f9b34fb",
        notify_uuid="0000fff4-0000-1000-8000-00805f9b34fb",
        expected_count=2,
    ),
    capabilities={
        "power": Capability("power", True, Verification.UNKNOWN, "Frame encoding unresolved"),
        "rgb": Capability("rgb", True, Verification.UNKNOWN, "Frame encoding unresolved"),
        "brightness": Capability("brightness", True, Verification.UNKNOWN, "Frame encoding unresolved"),
        "mode": Capability("mode", False, Verification.UNKNOWN, "Not yet evidenced"),
        "speed": Capability("speed", False, Verification.UNKNOWN, "Not yet evidenced"),
        "notify": Capability("notify", True, Verification.OBSERVED, "FFF4 notifications are captured"),
        "audio_reactive": Capability("audio_reactive", True, Verification.CANDIDATE, "Software mapping only"),
    },
    frame_family="unresolved",
    frame_verification=Verification.UNKNOWN,
    notes=[
        "Do not infer LENZE frames from OC21W merely because UUID family is similar.",
        "iOS peripheral UUIDs are identity hints, not Windows BLE addresses.",
        "Real writes remain blocked until captured/verified frame evidence exists.",
    ],
)


OC21W_PROFILE = ProtocolProfile(
    profile_id="oc21w-fff0-candidate-v1",
    identity=BleIdentity(
        family="magic_lantern",
        name_prefix="OC21W",
        service_uuid="0000fff0-0000-1000-8000-00805f9b34fb",
        write_uuid="0000fff3-0000-1000-8000-00805f9b34fb",
        notify_uuid="0000fff4-0000-1000-8000-00805f9b34fb",
        expected_count=4,
    ),
    capabilities={
        "power": Capability("power", True, Verification.CANDIDATE, "Candidate 7E..EF frame"),
        "rgb": Capability("rgb", True, Verification.CANDIDATE, "Candidate command 0x05"),
        "brightness": Capability("brightness", True, Verification.CANDIDATE, "Candidate command 0x01"),
        "mode": Capability("mode", True, Verification.CANDIDATE, "Candidate command 0x03"),
        "speed": Capability("speed", True, Verification.CANDIDATE, "Candidate command 0x02"),
        "notify": Capability("notify", True, Verification.UNKNOWN, "Capture workflow not completed"),
        "audio_reactive": Capability("audio_reactive", True, Verification.CANDIDATE, "Software mapping only"),
    },
    frame_family="7e-length-command-5payload-ef",
    frame_verification=Verification.CANDIDATE,
    notes=[
        "Candidate frames may be generated offline but MUST NOT imply hardware validation.",
        "Power-frame conflict remains open until observed on the real controller.",
        "Windows BLE allowlist and explicit protocol_verified gate remain mandatory.",
    ],
)


def _clamp(value: Any, lo: int, hi: int) -> int:
    return max(lo, min(hi, int(value)))


def oc21w_frame(length: int, cmd: int, p1: int, p2: int, p3: int, p4: int, p5: int) -> bytes:
    """Pure candidate-frame encoder. No IO."""
    return bytes((0x7E, length & 0xFF, cmd & 0xFF, p1 & 0xFF, p2 & 0xFF,
                  p3 & 0xFF, p4 & 0xFF, p5 & 0xFF, 0xEF))


def plan_command(profile: ProtocolProfile, intent: CommandIntent) -> FramePlan:
    """Compile an intent to an offline plan. Unknown protocols remain unresolved."""
    cap = profile.capabilities.get(intent.command)
    if cap is None or not cap.supported:
        return FramePlan(profile.profile_id, intent.command, "blocked", reason="capability_not_supported")

    if profile is LENZE_PROFILE:
        return FramePlan(
            profile.profile_id,
            intent.command,
            "needs_protocol_capture",
            reason="LENZE command encoding intentionally unresolved",
        )

    if profile is not OC21W_PROFILE:
        return FramePlan(profile.profile_id, intent.command, "blocked", reason="unknown_profile")

    p = intent.params
    frames: list[bytes] = []
    if intent.command == "power":
        b = 1 if bool(p.get("on")) else 0
        frames.append(oc21w_frame(0x04, 0x04, b, 0x00, b, 0xFF, 0x00))
    elif intent.command == "rgb":
        r, g, b = (_clamp(p.get(k, 0), 0, 255) for k in ("r", "g", "b"))
        frames.append(oc21w_frame(0x07, 0x05, 0x03, r, g, b, 0x10))
    elif intent.command == "brightness":
        value = _clamp(p.get("value", 65), 0, 100)
        frames.append(oc21w_frame(0x04, 0x01, value, 0x01, 0xFF, 0xFF, 0x00))
    elif intent.command == "mode":
        mode = _clamp(p.get("mode", 0), 0, 127) | 0x80
        frames.append(oc21w_frame(0x05, 0x03, mode, 0x03, 0xFF, 0xFF, 0x00))
    elif intent.command == "speed":
        speed = _clamp(p.get("speed", 0), 0, 255)
        frames.append(oc21w_frame(0x04, 0x02, speed, 0xFF, 0xFF, 0xFF, 0x00))
    else:
        return FramePlan(profile.profile_id, intent.command, "blocked", reason="no_candidate_encoder")

    return FramePlan(
        profile.profile_id,
        intent.command,
        "candidate_only",
        tuple(frame.hex(" ").upper() for frame in frames),
        "offline plan; real hardware write remains forbidden until verified",
    )


def audio_intent(family: str, payload: dict[str, Any]) -> CommandIntent:
    energy = _clamp(payload.get("energy", 0), 0, 255)
    bass = _clamp(payload.get("bass", 0), 0, 255)
    mid = _clamp(payload.get("mid", 0), 0, 255)
    high = _clamp(payload.get("high", 0), 0, 255)
    if payload.get("drop"):
        rgb = (255, 20, 220)
    elif payload.get("kick"):
        rgb = (min(255, 100 + bass // 2), min(255, 30 + mid // 3), min(255, 160 + high // 3))
    else:
        rgb = (min(255, 30 + mid // 2), min(255, 80 + high // 2), min(255, 120 + bass // 2))
    brightness = max(10, min(100, round(15 + energy * 85 / 255)))
    return CommandIntent("rgb", {"r": rgb[0], "g": rgb[1], "b": rgb[2], "brightness": brightness}, family)
