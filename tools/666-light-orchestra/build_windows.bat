@echo off
setlocal
cd /d "%~dp0"
py -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
pyinstaller --noconfirm --clean --onefile --name "666_LIGHT_ORCHESTRA" --hidden-import=device_registry --hidden-import=light_control_state 666_light_orchestra.py
if errorlevel 1 exit /b 1
pyinstaller --noconfirm --clean --onefile --windowed --name "666_LIGHT_ORCHESTRA_SYMPHONY" --hidden-import=666_light_orchestra --hidden-import=device_registry --hidden-import=light_control_state 666_light_orchestra_control_center.py
if errorlevel 1 exit /b 1
pyinstaller --noconfirm --clean --onefile --windowed --name "666_LIGHT_ORCHESTRA_LAB" --hidden-import=666_light_orchestra --hidden-import=device_registry 666_light_orchestra_gui.py
if errorlevel 1 exit /b 1
echo EXE CLI: dist\666_LIGHT_ORCHESTRA.exe
echo EXE CONTROL CENTER: dist\666_LIGHT_ORCHESTRA_SYMPHONY.exe
echo EXE LAB: dist\666_LIGHT_ORCHESTRA_LAB.exe
endlocal
