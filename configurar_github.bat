@echo off
chcp 65001 >nul
title Configurar Sincronización GitHub - El Tato

echo.
echo ========================================================
echo       CONFIGURAR SINCRONIZACIÓN GITHUB - EL TATO
echo ========================================================
echo.

node "%~dp0scripts\configurar_github.js"

pause
