# 666STREAM GOVEE Binary Repository Bridge Facet v1

STATUS=PREPARED_NOT_EXECUTED
SCOPE=projects/666-GOVEE-CONTROL/
SOURCE_PATTERN=LYVRA_NATIVE_RUNTIME/current/repository/BINARY_REPOSITORY_BRIDGE.md (capability only)
OWNERSHIP=666STREAM_RADIO_CODEFORGE_PROJECT_LOCAL
OTHER_SYSTEM_IDENTITY_IMPORT=FORBIDDEN
NO_FOREIGN_AUTOACTIVATION=TRUE

## Prepared artifact
Chat artifact: `666STREAM_GOVEE_REPOSITORY_BRIDGE_v1.zip`.
The archive bundles original verified ZIP bytes and manifest for `666-GOVEE-WORKER-v0.2-CODEFORGE.zip`, `666-GOVEE-WORKER-v1.zip`, `GOVEE_HYBRID_CONTROL_v1.1.zip`, `GOVEE_LOCAL_CONTROL_v1.zip`.
**The bridge archive itself has not been uploaded to GitHub and the bundled ZIPs have not yet been imported.**
APK/XAPK excluded.

## Contract
Preflight source path/size/SHA256; capture remote HEAD; fresh target-branch clone; exact allowlisted paths only; reject overwrites and remote HEAD drift; explicit local user confirmation; git push without force; fresh independent remote clone; byte size + SHA256 remote readback; machine-readable receipt. Only `PASS_REMOTE_READBACK` proves delivery. No pointer mutation, deployments, production radio edits, secrets, or cross-system merges.

## Target
Repository: `xfraggelpower666x/WebRadio-666SOUNDsDESIGn`
Branch: `WebRadio-666SOUNDsDESIGn`
Destination: `projects/666-GOVEE-CONTROL/imports/2026-10-17/`

## Boundaries
This bridge is a repository transport fallback, not a Govee-LAN bridge or a runtime worker. Preserve prior valid project changes; any later promotion is a separate native 666STREAM update. No bypass of protected write authority. GitHub remote import needs independent readback before claiming success.
