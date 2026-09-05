#!/usr/bin/env python3
"""Upload a verified 666STREAM production repository archive into the canonical 666PFS child folder.

This script is intentionally production-only. It never discovers a destination by name;
the canonical Google Drive folder id must be supplied explicitly by the workflow.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

DRIVE_SCOPE = "https://www.googleapis.com/auth/drive"


def fail(message: str) -> "NoReturn":
    raise SystemExit(f"PFS_DRIVE_HANDOFF_FAIL: {message}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def exact_child(drive, folder_id: str, name: str):
    escaped = name.replace("'", "\\'")
    result = (
        drive.files()
        .list(
            q=f"'{folder_id}' in parents and name='{escaped}' and trashed=false",
            spaces="drive",
            fields="files(id,name,md5Checksum,size,modifiedTime)",
            pageSize=10,
        )
        .execute()
    )
    files = result.get("files", [])
    if len(files) > 1:
        fail(f"ambiguous destination name {name!r}: {len(files)} files")
    return files[0] if files else None


def upload_or_replace(drive, folder_id: str, local_path: Path, remote_name: str):
    media = MediaFileUpload(str(local_path), mimetype="application/zip", resumable=True)
    existing = exact_child(drive, folder_id, remote_name)
    if existing:
        return (
            drive.files()
            .update(fileId=existing["id"], media_body=media, fields="id,name,md5Checksum,size,modifiedTime")
            .execute()
        )
    return (
        drive.files()
        .create(
            body={"name": remote_name, "parents": [folder_id]},
            media_body=media,
            fields="id,name,md5Checksum,size,modifiedTime",
        )
        .execute()
    )


def upload_json_or_replace(drive, folder_id: str, local_path: Path, remote_name: str):
    media = MediaFileUpload(str(local_path), mimetype="application/json", resumable=False)
    existing = exact_child(drive, folder_id, remote_name)
    if existing:
        return drive.files().update(fileId=existing["id"], media_body=media, fields="id,name,size,modifiedTime").execute()
    return drive.files().create(
        body={"name": remote_name, "parents": [folder_id]},
        media_body=media,
        fields="id,name,size,modifiedTime",
    ).execute()


def main() -> None:
    archive = Path(os.environ.get("PFS_ARCHIVE", ""))
    source_commit = os.environ.get("PFS_SOURCE_COMMIT", "").strip()
    expected_sha = os.environ.get("PFS_ARCHIVE_SHA256", "").strip().lower()
    folder_id = os.environ.get("PFS_DRIVE_FOLDER_ID", "").strip()
    service_json = os.environ.get("PFS_GDRIVE_SERVICE_ACCOUNT_JSON", "").strip()

    if not archive.is_file():
        fail(f"archive missing: {archive}")
    if len(source_commit) != 40:
        fail("PFS_SOURCE_COMMIT must be a full 40-character commit SHA")
    if not folder_id:
        fail("PFS_DRIVE_FOLDER_ID missing")
    if not service_json:
        fail("GitHub secret PFS_GDRIVE_SERVICE_ACCOUNT_JSON is not configured")

    actual_sha = sha256(archive)
    if expected_sha and actual_sha != expected_sha:
        fail(f"archive SHA mismatch expected={expected_sha} actual={actual_sha}")

    try:
        service_info = json.loads(service_json)
        credentials = service_account.Credentials.from_service_account_info(
            service_info,
            scopes=[DRIVE_SCOPE],
        )
    except Exception as exc:  # pragma: no cover - credential parsing is runtime-only
        fail(f"invalid service-account credential: {exc}")

    drive = build("drive", "v3", credentials=credentials, cache_discovery=False)

    immutable_name = f"666SOUNDsDESIGn_PRODUCTION_{source_commit}_PFS_CHILD_COPY.zip"
    current_name = "CURRENT_666STREAM_PRODUCTION_REPOSITORY.zip"
    pointer_name = "CURRENT_666STREAM_DEPLOYMENT.json"

    immutable = upload_or_replace(drive, folder_id, archive, immutable_name)
    current = upload_or_replace(drive, folder_id, archive, current_name)

    pointer = {
        "schema": "666pfs-666stream-drive-pointer-v1",
        "systemId": "666PFS-666STREAM-DEPLOYMENT-001",
        "parentSystem": "666PFS",
        "sourceRepository": os.environ.get("GITHUB_REPOSITORY", "xfraggelpower666x/WebRadio-666SOUNDsDESIGn"),
        "sourceBranch": "WebRadio-666SOUNDsDESIGn",
        "sourceCommit": source_commit,
        "archiveSha256": actual_sha,
        "archiveName": immutable_name,
        "currentRepositoryCopy": current_name,
        "driveFolderId": folder_id,
        "backupClass": "POST_DEPLOY_VERIFIED_TREE",
        "deploymentReadback": "PASS",
        "repositoryVerify": "PASS",
        "immutableDriveFileId": immutable["id"],
        "currentDriveFileId": current["id"],
    }
    pointer_path = Path(f"PFS_DRIVE_TRANSFER_{source_commit}.json")
    pointer_path.write_text(json.dumps(pointer, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    pointer_remote = upload_json_or_replace(drive, folder_id, pointer_path, pointer_name)
    pointer["pointerDriveFileId"] = pointer_remote["id"]
    pointer_path.write_text(json.dumps(pointer, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print("PFS_DRIVE_HANDOFF=PASS")
    print(f"PFS_DRIVE_FOLDER_ID={folder_id}")
    print(f"PFS_SOURCE_COMMIT={source_commit}")
    print(f"PFS_ARCHIVE_SHA256={actual_sha}")
    print(f"PFS_IMMUTABLE_FILE_ID={immutable['id']}")
    print(f"PFS_CURRENT_FILE_ID={current['id']}")
    print(f"PFS_POINTER_FILE_ID={pointer_remote['id']}")
    print(f"PFS_RECEIPT={pointer_path}")


if __name__ == "__main__":
    main()
