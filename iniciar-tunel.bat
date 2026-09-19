@echo off
chcp 65001 >nul
title Túnel y Conexión Móvil - Kiosco El Tato

echo.
echo ========================================================
echo       INICIANDO TÚNEL REMOTO - KIOSCO EL TATO
echo ========================================================
echo.

node "%~dp0scripts\tunnel_manager.js"

pause
