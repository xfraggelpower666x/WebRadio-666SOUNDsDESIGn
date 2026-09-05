#!/usr/bin/env python3
"""Build a self-contained 666PFS child handoff package.

The radio side only prepares a verified transfer package. 666PFS remains the
owner of child storage, current pointers, retention, and final registration.
No Google Drive credentials are required in the radio repository.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import zipfile
from pathlib import Path


def fail(message: str) -> "NoReturn":
    raise SystemExit(f"PFS_HANDOFF_PACKAGE_FAIL: {message}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_file(env_name: str) -> Path:
    path = Path(os.environ.get(env_name, "").strip())
    if not path.is_file():
        fail(f"{env_name} missing or not a file: {path}")
    return path


def add_if_exists(bundle: zipfile.ZipFile, path: Path) -> None:
    if path.is_file():
        bundle.write(path, arcname=path.name)


def main() -> None:
    archive = require_file("PFS_ARCHIVE")
    tree = require_file("PFS_TREE_FILE")
    metadata = require_file("PFS_METADATA_FILE")
    source_commit = os.environ.get("PFS_SOURCE_COMMIT", "").strip()
    expected_sha = os.environ.get("PFS_ARCHIVE_SHA256", "").strip().lower()
    backup_class = os.environ.get("PFS_BACKUP_CLASS", "").strip() or "UNKNOWN"
    child_target = os.environ.get("PFS_CHILD_TARGET", "").strip()

    if len(source_commit) != 40:
        fail("PFS_SOURCE_COMMIT must be a full 40-character commit SHA")
    if not child_target:
        fail("PFS_CHILD_TARGET missing")

    actual_sha = sha256(archive)
    if expected_sha and actual_sha != expected_sha:
        fail(f"archive SHA mismatch expected={expected_sha} actual={actual_sha}")

    manifest = {
        "schema": "666pfs-child-handoff-package-v1",
        "systemId": "666PFS-666STREAM-DEPLOYMENT-001",
        "parentSystem": "666PFS",
        "sourceSystem": "666STREAM",
        "sourceRepository": os.environ.get(
            "GITHUB_REPOSITORY", "xfraggelpower666x/WebRadio-666SOUNDsDESIGn"
        ),
        "sourceBranch": "WebRadio-666SOUNDsDESIGn",
        "sourceCommit": source_commit,
        "repositoryArchive": archive.name,
        "repositoryArchiveSha256": actual_sha,
        "repositoryTree": tree.name,
        "freezeMetadata": metadata.name,
        "backupClass": backup_class,
        "targetChild": child_target,
        "handoffState": "READY_FOR_PFS_INTAKE",
        "storageOwner": "666PFS",
        "radioDriveCredentialsRequired": False,
        "pfsResponsibilities": [
            "store immutable repository copy",
            "update current repository copy",
            "update current pointer",
            "register child backup",
            "apply PFS retention and freeze rules",
            "verify stored copy against repositoryArchiveSha256",
        ],
    }

    manifest_path = Path(f"PFS_HANDOFF_MANIFEST_{source_commit}.json")
    manifest_path.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    package = Path(f"666PFS_666STREAM_HANDOFF_{source_commit}.zip")
    with zipfile.ZipFile(package, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        bundle.write(archive, arcname=archive.name)
        archive_sha_file = Path(f"{archive}.sha256")
        add_if_exists(bundle, archive_sha_file)
        bundle.write(tree, arcname=tree.name)
        bundle.write(metadata, arcname=metadata.name)
        add_if_exists(bundle, Path(f"ZIP_CRC_{source_commit}.txt"))
        add_if_exists(bundle, Path(f"PRODUCTION_READBACK_{source_commit}.json"))
        add_if_exists(bundle, Path(f"PRODUCTION_DEPLOYMENT_IDENTITY_{source_commit}.json"))
        add_if_exists(bundle, Path(f"PRODUCTION_READBACK_RECEIPT_{source_commit}.txt"))
        bundle.write(manifest_path, arcname=manifest_path.name)

    with zipfile.ZipFile(package, "r") as bundle:
        bad = bundle.testzip()
        if bad:
            fail(f"handoff ZIP CRC failure at {bad}")

    package_sha = sha256(package)
    sha_path = Path(f"{package}.sha256")
    sha_path.write_text(f"{package_sha}  {package.name}\n", encoding="utf-8")

    print("PFS_HANDOFF_PACKAGE=READY")
    print(f"PFS_HANDOFF_TARGET={child_target}")
    print(f"PFS_SOURCE_COMMIT={source_commit}")
    print(f"PFS_REPOSITORY_SHA256={actual_sha}")
    print(f"PFS_HANDOFF_PACKAGE_FILE={package}")
    print(f"PFS_HANDOFF_PACKAGE_SHA256={package_sha}")
    print(f"PFS_HANDOFF_MANIFEST={manifest_path}")


if __name__ == "__main__":
    main()
