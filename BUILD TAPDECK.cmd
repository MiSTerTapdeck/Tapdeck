@echo off
title Tapdeck local Android builder
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-local-apk.ps1"
echo.
pause
