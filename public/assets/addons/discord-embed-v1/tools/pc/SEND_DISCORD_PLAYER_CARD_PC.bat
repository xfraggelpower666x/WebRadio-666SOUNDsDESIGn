@echo off
REM ############################################################
REM # 666SOUNDsDESIGn — PC Starter BAT
REM # Created: 2026-05-05
REM # Modified: 2026-05-05
REM # Version: V1.0
REM # Purpose: Double-click starter for PowerShell Discord sender.
REM ############################################################
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0send-discord-player-card.ps1"
pause
