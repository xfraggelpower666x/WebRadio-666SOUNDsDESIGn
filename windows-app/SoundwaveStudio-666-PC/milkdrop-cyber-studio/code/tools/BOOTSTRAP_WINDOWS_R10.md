# Windows bootstrap R10 — original host log diagnosis (2026-11-06)

Source evidence: 11 owner-supplied log files from the local v0.6.3 installation (not GitHub Actions).

## Verified findings

- Python 3.13 was found at the user's local Windows Python installation.
- `bootstrap.ps1` invokes `python -c 'import tkinter; print("Tkinter OK")'`; Windows PowerShell 5.1 passes a malformed code string, producing `SyntaxError: '(' was never closed` before Tkinter can be assessed.
- Minimal fix: use `python -c 'import tkinter; print(1)'` and the same code in the project venv check. Avoid double quotes in these native CLI argument strings.
- `netfx3.ps1 -Action check` and `-Action enable` both fail before reporting state because `Get-WindowsOptionalFeature -Online -FeatureName NetFx3` requires elevation on this host.
- Minimal repair: wrap the status query in a try/catch; use a read-only `HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v3.5` Install=1 fallback; otherwise return `UnknownNeedsElevation`, not `Disabled` or `Enabled`. An enable operation still requires explicit administrator rights.
- The SDK manager recognized an existing install directory, so no DirectX SDK download or reinstall should be attempted just to resolve these failures.

## Boundaries

The v0.6.3 user's local extracted workspace is **not** automatically updated by this repository commit.
No Windows host executable/GUI was run from this Linux/cloud context.
No production branch promotion or renderer source replacement was performed.

The targeted owner-side patch is the standalone file `REPAIR_666SD_BOOTSTRAP_R10.ps1` delivered in the conversation. It modifies the two original PowerShell scripts only after backups, with no download or installation.

## Required readback

Run the patch from the original extracted v0.6.3 root. Verify:
1. `CHECK_TOOLS.bat` passes the Python/Tkinter check.
2. `START_STUDIO.bat` advances past the same point.
3. `CHECK_NETFX3.bat` returns `Enabled` or `UnknownNeedsElevation` without misreporting installed state.
4. Compare the logs from the new run with the original failures.
