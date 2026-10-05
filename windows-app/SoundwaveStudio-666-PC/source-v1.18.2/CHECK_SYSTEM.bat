@echo off
setlocal
cd /d "%~dp0"
echo === SoundwaveStudio 666 System Check ===
where node >nul 2>nul || (echo FAIL: Node.js missing & exit /b 1)
where npm >nul 2>nul || (echo FAIL: npm missing & exit /b 1)
node --version
npm --version
node tests\deep-integration.test.cjs || exit /b 1
node --check main.js || exit /b 1
node --check preload.js || exit /b 1
node --check src\integration\666-integration.js || exit /b 1
echo PASS: source gates
