@echo off
set "PULSE_ROOT=C:\Users\Taz\SunsetPulse"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PULSE_ROOT%\apps\pulse\scripts\start-web-knowledge-worker.ps1"
