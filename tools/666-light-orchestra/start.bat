@echo off
setlocal
cd /d "%~dp0"
if not exist config.json copy /Y config.example.json config.json >nul
py -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
py 666_light_orchestra_gui.py
endlocal
