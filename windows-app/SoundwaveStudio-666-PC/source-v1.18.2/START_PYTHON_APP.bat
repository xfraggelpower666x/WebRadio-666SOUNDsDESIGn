@echo off
cd /d "%~dp0"
where py >nul 2>nul && (py -3 soundwave_666.py & exit /b)
python soundwave_666.py
