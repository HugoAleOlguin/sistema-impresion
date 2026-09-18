@echo off
title Desactivar Auto-inicio - Kiosco El Tato
color 0C

cd /d "%~dp0"

echo ======================================================================
echo             DESACTIVAR AUTO-INICIO - KIOSCO "EL TATO"
echo ======================================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall-autostart.ps1"

echo.
pause
