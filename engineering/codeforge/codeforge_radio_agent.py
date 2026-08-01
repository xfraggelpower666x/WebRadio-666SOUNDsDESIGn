from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import tempfile
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

VERSION = "1.6.0-radio.1"
REPOSITORY = "xfraggelpower666x/WebRadio-666SOUNDsDESIGn"
PRODUCTION_BRANCH = "WebRadio-666SOUNDsDESIGn"
INTEGRATION_ROOT = "engineering/codeforge"
PROTECTED_PATHS = (
    "worker.js", "public/", "workers/", "js/", "css/", ".github/workflows/",
    "wrangler.jsonc", "package.json", "index.html",
)
SECRET_PATTERNS = {
    "github_token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    "private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "cloudflare_token": re.compile(r"(?i)CLOUDFLARE(?:_API)?_TOKEN\s*[:=]\s*[^\s$<{]{12,}"),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def canonical_digest(payload: Any) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str).encode()).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def atomic_json_write(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(data, handle, indent=2, sort_keys=True, ensure_ascii=False)
            handle.write("\n")
            handle.flush(); os.fsync(handle.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name): os.unlink(temp_name)


@dataclass(slots=True)
class FileEvidence:
    path: str
    size: int
    sha256: str
    kind: str
    protected: bool


class ContinuationManager:
    """Checkpoint → interruption → integration → knowledge → re-audit → resume."""

    def __init__(self, workspace: Path):
        self.root = workspace / "continuation"
        self.state_path = self.root / "state.json"
        self.interruptions_path = self.root / "interruptions.jsonl"
        self.knowledge_path = self.root / "knowledge.jsonl"
        self.reaudit_path = self.root / "reaudit.jsonl"

    def _append(self, path: Path, record: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(record, sort_keys=True, ensure_ascii=False) + "\n")
            handle.flush(); os.fsync(handle.fileno())

    def initialize(self) -> dict[str, Any]:
        if not self.state_path.exists():
            state = {
                "schema": "codeforge-radio-continuation-v1", "active_task": None,
                "last_checkpoint": None, "pending_interruptions": [], "last_reaudit": None,
                "resume_state": "IDLE", "updated_at": utc_now(),
            }
            atomic_json_write(self.state_path, state)
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def set_task(self, task: dict[str, Any]) -> dict[str, Any]:
        state = self.initialize(); state["active_task"] = task; state["active_task_digest"] = canonical_digest(task)
        state["resume_state"] = "ACTIVE"; state["updated_at"] = utc_now(); atomic_json_write(self.state_path, state); return state

    def checkpoint(self, phase: str, block_from: int, block_to: int, payload: dict[str, Any]) -> dict[str, Any]:
        state = self.initialize()
        cp = {"schema":"codeforge-radio-checkpoint-v1","phase":phase,"block_from":block_from,"block_to":block_to,
              "payload":payload,"previous_digest":(state.get("last_checkpoint") or {}).get("digest"),"created_at":utc_now()}
        cp["digest"] = canonical_digest(cp)
        state["last_checkpoint"] = cp; state["resume_state"] = "CHECKPOINTED"; state["updated_at"] = utc_now()
        atomic_json_write(self.state_path, state); return cp

    def interrupt(self, message: str, classification: str = "USER_INFORMATION") -> dict[str, Any]:
        state = self.initialize(); cp = state.get("last_checkpoint")
        if not cp: raise RuntimeError("No checkpoint available")
        rec = {"schema":"codeforge-radio-interruption-v1","message":message,"classification":classification,
               "checkpoint_digest":cp["digest"],"active_task_digest":state.get("active_task_digest"),"state":"PENDING","at":utc_now()}
        rec["digest"] = canonical_digest(rec); self._append(self.interruptions_path, rec)
        state["pending_interruptions"].append(rec); state["last_reaudit"] = None; state["resume_state"] = "INTERRUPTED"; state["updated_at"] = utc_now()
        atomic_json_write(self.state_path, state); return rec

    def integrate(self) -> dict[str, Any]:
        state = self.initialize(); cp = state.get("last_checkpoint")
        if not cp or cp.get("digest") != canonical_digest({k:v for k,v in cp.items() if k != "digest"}):
            raise RuntimeError("Checkpoint integrity failure")
        integrated = []
        for rec in state["pending_interruptions"]:
            material = {k:v for k,v in rec.items() if k != "digest"}
            if rec.get("digest") != canonical_digest(material): raise RuntimeError("Interruption integrity failure")
            if rec["checkpoint_digest"] != cp["digest"] or rec["active_task_digest"] != state.get("active_task_digest"):
                raise RuntimeError("Interruption binding failure")
            knowledge = {"schema":"codeforge-radio-knowledge-v1","source_digest":rec["digest"],
                         "classification":rec["classification"],"message_digest":hashlib.sha256(rec["message"].encode()).hexdigest(),
                         "status":"INTEGRATED","at":utc_now()}
            knowledge["digest"] = canonical_digest(knowledge); self._append(self.knowledge_path, knowledge); integrated.append(rec["digest"])
        receipt = {"schema":"codeforge-radio-reaudit-v1","checkpoint_digest":cp["digest"],
                   "active_task_digest":state.get("active_task_digest"),"integrated_interruptions":integrated,
                   "architecture_drift":False,"status":"PASS","at":utc_now()}
        receipt["digest"] = canonical_digest(receipt); self._append(self.reaudit_path, receipt)
        state["pending_interruptions"] = []; state["last_reaudit"] = receipt; state["resume_state"] = "READY_TO_RESUME"; state["updated_at"] = utc_now()
        atomic_json_write(self.state_path, state); return receipt

    def resume(self) -> dict[str, Any]:
        state = self.initialize()
        if state["pending_interruptions"]: raise RuntimeError("Pending interruption must be integrated")
        cp = state.get("last_checkpoint"); reaudit = state.get("last_reaudit")
        if not cp: raise RuntimeError("No checkpoint available")
        if cp.get("digest") != canonical_digest({k:v for k,v in cp.items() if k != "digest"}):
            raise RuntimeError("Checkpoint integrity failure")
        task = state.get("active_task")
        if task is not None and state.get("active_task_digest") != canonical_digest(task):
            raise RuntimeError("Active task integrity failure")
        if state.get("resume_state") == "READY_TO_RESUME":
            if not reaudit or reaudit.get("status") != "PASS": raise RuntimeError("Re-audit receipt required")
            if reaudit.get("digest") != canonical_digest({k:v for k,v in reaudit.items() if k != "digest"}): raise RuntimeError("Re-audit integrity failure")
            if reaudit["checkpoint_digest"] != cp["digest"]: raise RuntimeError("Re-audit checkpoint mismatch")
            if reaudit.get("active_task_digest") != state.get("active_task_digest"):
                raise RuntimeError("Re-audit task mismatch")
        state["resume_state"] = "ACTIVE"; state["updated_at"] = utc_now(); atomic_json_write(self.state_path, state)
        return {"status":"RESUMED","checkpoint":cp,"active_task":state.get("active_task"),"reaudit":reaudit}


class RadioRepositoryCodingAgent:
    def __init__(self, repository_root: str | Path):
        self.root = Path(repository_root).resolve()
        if not self.root.is_dir(): raise NotADirectoryError(self.root)
        self.workspace = self.root / ".codeforge-workspace"
        self.continuation = ContinuationManager(self.workspace)

    @staticmethod
    def is_protected(path: str) -> bool:
        normalized = PurePosixPath(path).as_posix()
        return any(normalized == p.rstrip("/") or normalized.startswith(p) for p in PROTECTED_PATHS)

    def scan(self) -> dict[str, Any]:
        evidence: list[FileEvidence] = []; secret_signals = []; architecture = {"workers":[],"html":[],"workflows":[],"cloudflare":[]}
        ignore = {".git","node_modules",".venv","__pycache__",".codeforge-workspace"}
        for current, dirs, files in os.walk(self.root):
            dirs[:] = sorted(d for d in dirs if d not in ignore)
            for name in sorted(files):
                path = Path(current)/name; rel = path.relative_to(self.root).as_posix()
                try: data = path.read_bytes(); size=len(data)
                except OSError: continue
                text = None
                if b"\0" not in data[:4096]:
                    text = data.decode("utf-8", errors="replace")
                    for pattern_name, pattern in SECRET_PATTERNS.items():
                        if pattern.search(text): secret_signals.append({"path":rel,"pattern":pattern_name,"value":"REDACTED"})
                evidence.append(FileEvidence(rel,size,hashlib.sha256(data).hexdigest(),"text" if text is not None else "binary",self.is_protected(rel)))
                low=rel.lower()
                if Path(low).name in {"worker.js","worker.mjs","worker.ts"}: architecture["workers"].append(rel)
                if low.endswith((".html",".htm")): architecture["html"].append(rel)
                if low.startswith(".github/workflows/"): architecture["workflows"].append(rel)
                if "wrangler" in Path(low).name: architecture["cloudflare"].append(rel)
        evidence.sort(key=lambda x:x.path)
        result={"schema":"codeforge-radio-audit-v1","repository":REPOSITORY,"root":str(self.root),
                "file_count":len(evidence),"total_bytes":sum(x.size for x in evidence),
                "protected_file_count":sum(x.protected for x in evidence),"architecture":architecture,
                "secret_signals":secret_signals,"files":[asdict(x) for x in evidence],
                "mutation_performed":False,"status":"BLOCKED" if secret_signals else "PASS","generated_at":utc_now()}
        result["digest"] = canonical_digest(result); return result

    def build_proposal(self, audit: dict[str, Any], requested_changes: list[dict[str, Any]]) -> dict[str, Any]:
        if audit.get("digest") != canonical_digest({k:v for k,v in audit.items() if k != "digest"}): raise RuntimeError("Audit digest mismatch")
        operations=[]
        for item in requested_changes:
            candidate = PurePosixPath(item["path"])
            if candidate.is_absolute() or ".." in candidate.parts or not candidate.parts:
                raise ValueError("Unsafe path")
            path = candidate.as_posix()
            operations.append({"path":path,"operation":item.get("operation","UPDATE"),"protected":self.is_protected(path),
                               "execution_status":"WRITE_BLOCKED","reason":"Evidence-bound proposal only"})
        proposal={"schema":"codeforge-radio-change-proposal-v1","audit_digest":audit["digest"],"operations":operations,
                  "production_branch":PRODUCTION_BRANCH,"execution_enabled":False,"created_at":utc_now()}
        proposal["digest"] = canonical_digest(proposal); return proposal


def main(argv: list[str] | None = None) -> int:
    parser=argparse.ArgumentParser(description="CodeForge radio repository coding agent")
    parser.add_argument("command",choices=("audit","status","checkpoint")); parser.add_argument("repository",nargs="?",default=".")
    args=parser.parse_args(argv); agent=RadioRepositoryCodingAgent(args.repository)
    if args.command=="audit": print(json.dumps(agent.scan(),indent=2,ensure_ascii=False)); return 0
    if args.command=="status": print(json.dumps(agent.continuation.initialize(),indent=2,ensure_ascii=False)); return 0
    agent.continuation.set_task({"task":"radio-repository-audit","repository":REPOSITORY})
    print(json.dumps(agent.continuation.checkpoint("RADIO_REPOSITORY",1,1,{"status":"READY"}),indent=2)); return 0

if __name__ == "__main__": raise SystemExit(main())
