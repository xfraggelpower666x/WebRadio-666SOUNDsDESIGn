from pathlib import Path
from PyInstaller.utils.hooks import get_module_file_attribute

module_dir = Path(get_module_file_attribute("sounddevice")).parent
library = module_dir / "_sounddevice_data" / "portaudio-binaries" / "libportaudio64bit.dll"
if not library.is_file():
    raise RuntimeError("The pinned sounddevice wheel is missing its x64 non-ASIO PortAudio DLL")
binaries = [(str(library), "_sounddevice_data/portaudio-binaries")]
