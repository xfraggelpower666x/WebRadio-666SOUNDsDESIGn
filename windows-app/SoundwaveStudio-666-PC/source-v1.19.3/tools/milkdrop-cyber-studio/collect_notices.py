"""Collect notices from the exact Python runtime and wheels used for the build."""
from importlib import metadata
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parent
target = Path(sys.argv[1])
target.mkdir(parents=True, exist_ok=False)

def copy(source, destination):
    source = Path(source)
    if not source.is_file():
        raise RuntimeError(f"Required license notice missing: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)

base = Path(sys.base_prefix)
copy(base / "LICENSE.txt", target / "Python" / "LICENSE.txt")
copy(base / "tcl" / "tk8.6" / "license.terms", target / "Tk" / "license.terms")
for name in ("TCL.txt", "TKDND.txt", "PORTAUDIO.txt"):
    copy(root / "licenses" / name, target / name)

for line in (root / "build-requirements.txt").read_text(encoding="utf-8").splitlines():
    name, version = line.split("==")
    dist = metadata.distribution(name)
    if dist.version != version:
        raise RuntimeError(f"Wrong version of {name}: {dist.version}, expected {version}")
    notices = [
        item for item in dist.files or ()
        if ".dist-info/" in str(item).replace("\\", "/")
        and ("/licenses/" in str(item).replace("\\", "/")
             or Path(item).name.upper().startswith(("LICENSE", "COPYING", "NOTICE")))
    ]
    if not notices:
        raise RuntimeError(f"No license notice found for {name} {version}")
    for item in notices:
        parts = str(item).replace("\\", "/").split("/")
        relative = Path(*parts[1:])
        copy(dist.locate_file(item), target / f"{name}-{version}" / relative)
