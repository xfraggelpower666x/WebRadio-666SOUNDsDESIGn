import os
import re
import secrets
import shutil
import sqlite3
import subprocess
import tempfile
import threading
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict
from starlette.background import BackgroundTask


APP_NAME = "666soundsdesign-audio-player-alert-backend"
PLAYER_ALERT_SERVICE_TOKEN = os.getenv("PLAYER_ALERT_SERVICE_TOKEN", "").strip()
PLAYER_ALERT_TTL_SECONDS = max(30, int(os.getenv("PLAYER_ALERT_TTL_SECONDS", "900")))
PLAYER_ALERT_MAX_HISTORY = max(1, min(200, int(os.getenv("PLAYER_ALERT_MAX_HISTORY", "30"))))
PLAYER_ALERT_RATE_SECONDS = max(1, int(os.getenv("PLAYER_ALERT_RATE_SECONDS", "180")))
MAX_UPLOAD_BYTES = max(1, int(os.getenv("MAX_UPLOAD_MB", "64"))) * 1024 * 1024
FFMPEG_TIMEOUT_SECONDS = max(10, int(os.getenv("FFMPEG_TIMEOUT_SECONDS", "180")))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
SQLITE_PATH = Path(os.getenv("PLAYER_ALERT_DB_PATH", "./data/player-alerts.sqlite3"))

app = FastAPI(title=APP_NAME)
_db_lock = threading.RLock()


def which(binary_name: str) -> Optional[str]:
    return shutil.which(binary_name)


def cleanup_file(path_str: str) -> None:
    try:
        path = Path(path_str)
        if path.exists():
            path.unlink()
    except Exception:
        pass


def cleanup_files(*path_strs: str) -> None:
    for path_str in path_strs:
        cleanup_file(path_str)


def safe_filename(name: str) -> str:
    stem = Path(name or "upload.mp3").stem
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._")
    return (cleaned or "upload")[:120]


def check_player_alert_service(request: Request) -> None:
    if not PLAYER_ALERT_SERVICE_TOKEN:
        raise HTTPException(status_code=503, detail="player_alert_service_token_not_configured")
    provided = request.headers.get("x-player-alert-service-token", "").strip()
    if not secrets.compare_digest(provided, PLAYER_ALERT_SERVICE_TOKEN):
        raise HTTPException(status_code=401, detail="unauthorized")


def database_backend() -> str:
    return "postgres" if DATABASE_URL.startswith(("postgres://", "postgresql://")) else "sqlite"


@contextmanager
def db_connection() -> Iterator[object]:
    if database_backend() == "postgres":
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError("psycopg_not_installed") from exc
        connection = psycopg.connect(DATABASE_URL)
    else:
        SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(SQLITE_PATH, timeout=15, check_same_thread=False)
        connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def sql_placeholders(sql: str) -> str:
    return sql.replace("?", "%s") if database_backend() == "postgres" else sql


def row_to_dict(cursor, row) -> dict:
    if row is None:
        return {}
    if isinstance(row, sqlite3.Row):
        return dict(row)
    columns = [description[0] for description in cursor.description]
    return dict(zip(columns, row))


def init_database() -> None:
    statement = """
        CREATE TABLE IF NOT EXISTS player_alerts (
            id TEXT PRIMARY KEY,
            message TEXT NOT NULL,
            username TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            timestamp BIGINT NOT NULL,
            created_at TEXT NOT NULL,
            version TEXT NOT NULL,
            source TEXT NOT NULL
        )
    """
    index_statement = "CREATE INDEX IF NOT EXISTS idx_player_alerts_timestamp ON player_alerts(timestamp DESC)"
    sender_index = "CREATE INDEX IF NOT EXISTS idx_player_alerts_sender_timestamp ON player_alerts(sender_id, timestamp DESC)"
    with _db_lock, db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(statement)
        cursor.execute(index_statement)
        cursor.execute(sender_index)


def clean_alert_text(value: str | None, limit: int = 240) -> str:
    text = str(value or "").replace("<", "").replace(">", "")
    return " ".join(text.split())[:limit]


def insert_alert(alert: dict) -> None:
    query = sql_placeholders(
        "INSERT INTO player_alerts (id, message, username, sender_id, timestamp, created_at, version, source) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    params = (
        alert["id"], alert["message"], alert["username"], alert["senderId"],
        alert["timestamp"], alert["createdAt"], alert["version"], alert["source"]
    )
    with _db_lock, db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, params)
        # Keep the table bounded without deleting the active row accidentally.
        prune = sql_placeholders(
            "DELETE FROM player_alerts WHERE id NOT IN "
            "(SELECT id FROM player_alerts ORDER BY timestamp DESC LIMIT ?)"
        )
        cursor.execute(prune, (max(PLAYER_ALERT_MAX_HISTORY * 4, 100),))


def latest_alert() -> dict | None:
    with _db_lock, db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM player_alerts ORDER BY timestamp DESC LIMIT 1")
        row = cursor.fetchone()
        return row_to_dict(cursor, row) if row else None


def alert_history(limit: int) -> list[dict]:
    query = sql_placeholders("SELECT * FROM player_alerts ORDER BY timestamp DESC LIMIT ?")
    with _db_lock, db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, (limit,))
        return [row_to_dict(cursor, row) for row in cursor.fetchall()]


def latest_sender_timestamp(sender_id: str) -> int:
    query = sql_placeholders("SELECT timestamp FROM player_alerts WHERE sender_id = ? ORDER BY timestamp DESC LIMIT 1")
    with _db_lock, db_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, (sender_id,))
        row = cursor.fetchone()
        if not row:
            return 0
        if isinstance(row, sqlite3.Row):
            return int(row["timestamp"] or 0)
        return int(row[0] or 0)


def public_alert(alert: dict | None) -> dict | None:
    if not alert:
        return None
    return {
        "id": alert.get("id"),
        "message": alert.get("message"),
        "username": alert.get("username"),
        "senderId": alert.get("senderId") or alert.get("sender_id"),
        "clientId": alert.get("senderId") or alert.get("sender_id"),
        "timestamp": int(alert.get("timestamp") or 0),
        "createdAt": alert.get("createdAt") or alert.get("created_at"),
        "version": alert.get("version") or "",
        "source": alert.get("source") or "render-backend",
    }


def alert_active(alert: dict | None) -> bool:
    if not alert:
        return False
    created_ms = int(alert.get("timestamp") or 0)
    return bool(created_ms and ((time.time() * 1000) - created_ms) < (PLAYER_ALERT_TTL_SECONDS * 1000))


@app.on_event("startup")
def startup() -> None:
    init_database()


@app.get("/health")
def health():
    database_ok = True
    try:
        init_database()
    except Exception:
        database_ok = False
    return {
        "ok": database_ok,
        "service": APP_NAME,
        "ffmpeg_found": bool(which("ffmpeg")),
        "ffprobe_found": bool(which("ffprobe")),
        "database_backend": database_backend(),
        "database_ok": database_ok,
        "player_alert_write_auth_configured": bool(PLAYER_ALERT_SERVICE_TOKEN),
    }


@app.post("/process")
async def process_audio(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form(default="process"),
):
    check_player_alert_service(request)
    ffmpeg_bin = which("ffmpeg")
    if not ffmpeg_bin:
        raise HTTPException(status_code=503, detail="ffmpeg_not_available")

    original_name = file.filename or "upload.mp3"
    output_name = f"{safe_filename(original_name)}_mastered.mp3"
    suffix = Path(original_name).suffix.lower() or ".mp3"
    if suffix not in {".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"}:
        raise HTTPException(status_code=415, detail="unsupported_audio_type")

    input_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    output_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    input_path = Path(input_tmp.name)
    output_path = Path(output_tmp.name)
    input_tmp.close()
    output_tmp.close()

    total = 0
    try:
        with input_path.open("wb") as target:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="audio_file_too_large")
                target.write(chunk)
        if total == 0:
            raise HTTPException(status_code=400, detail="uploaded_file_empty")

        command = [
            ffmpeg_bin, "-nostdin", "-y", "-i", str(input_path),
            "-af", "loudnorm=I=-9:TP=-1.0:LRA=7",
            "-ar", "48000", "-b:a", "320k", str(output_path),
        ]
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=FFMPEG_TIMEOUT_SECONDS,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(status_code=504, detail="ffmpeg_timeout") from exc

        if result.returncode != 0:
            raise HTTPException(status_code=422, detail="audio_processing_failed")
        if not output_path.exists() or output_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="output_file_missing")

        cleanup_file(str(input_path))
        return FileResponse(
            path=str(output_path),
            media_type="audio/mpeg",
            filename=output_name,
            background=BackgroundTask(cleanup_file, str(output_path)),
        )
    except HTTPException:
        cleanup_files(str(input_path), str(output_path))
        raise
    except Exception as exc:
        cleanup_files(str(input_path), str(output_path))
        raise HTTPException(status_code=500, detail="audio_processing_internal_error") from exc


class PlayerAlertPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    clientId: str | None = None
    senderId: str | None = None
    username: str | None = None
    message: str
    timestamp: int | None = None
    createdAt: str | None = None
    version: str | None = None


@app.get("/api/player-alert/status")
def player_alert_status():
    current = latest_alert()
    return {
        "ok": True,
        "service": "666soundsdesign-player-alert-render-relay",
        "backend": database_backend(),
        "storage_scope": "shared-postgres" if database_backend() == "postgres" else "local-sqlite",
        "shared_persistence": database_backend() == "postgres",
        "ttl_seconds": PLAYER_ALERT_TTL_SECONDS,
        "history_size": len(alert_history(PLAYER_ALERT_MAX_HISTORY)),
        "current_active": alert_active(current),
        "write_auth_configured": bool(PLAYER_ALERT_SERVICE_TOKEN),
    }


@app.post("/api/player-alert/send")
async def player_alert_send(request: Request, payload: PlayerAlertPayload):
    check_player_alert_service(request)
    message = clean_alert_text(payload.message)
    sender = clean_alert_text(payload.senderId or payload.clientId or "anonymous", 80) or "anonymous"
    username = clean_alert_text(payload.username or "Broadcast", 28) or "Broadcast"
    if not message:
        raise HTTPException(status_code=400, detail="empty_message")

    now_ms = int(time.time() * 1000)
    last_ms = latest_sender_timestamp(sender)
    retry_ms = (PLAYER_ALERT_RATE_SECONDS * 1000) - (now_ms - last_ms)
    if last_ms and retry_ms > 0:
        raise HTTPException(status_code=429, detail={"error": "rate_limited", "retryAfterMs": retry_ms})

    alert = {
        "ok": True,
        "active": True,
        "id": clean_alert_text(payload.id, 80) or f"render-{now_ms}-{secrets.token_hex(3)}",
        "message": message,
        "username": username,
        "senderId": sender,
        "clientId": sender,
        "timestamp": now_ms,
        "createdAt": payload.createdAt or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "version": clean_alert_text(payload.version, 40),
        "source": "render-backend",
    }
    insert_alert(alert)
    return {
        "ok": True,
        "delivered": True,
        "source": "render-backend",
        "alert": alert,
        "history_size": len(alert_history(PLAYER_ALERT_MAX_HISTORY)),
    }


@app.get("/api/player-alert/current")
def player_alert_current():
    current = latest_alert()
    if not alert_active(current):
        return {"ok": True, "active": False, "source": "render-backend"}
    return dict(public_alert(current) or {}, ok=True, active=True, source="render-backend")


@app.get("/api/player-alert/history")
def player_alert_history():
    return {
        "ok": True,
        "source": "render-backend",
        "items": [public_alert(item) for item in alert_history(PLAYER_ALERT_MAX_HISTORY)],
    }
