@echo off
title Instalador y Autoarranque - Kiosco El Tato
color 0B

cd /d "%~dp0"

echo ======================================================================
echo           INSTALADOR Y CONFIGURADOR DE AUTO-ARRANQUE
echo                   KIOSCO "EL TATO"
echo ======================================================================
echo.
echo Iniciando asistente de instalacion y configuracion...
echo (Si Windows solicita permisos de Administrador, presiona "Si").
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Hubo un inconveniente durante la instalacion.
  pause
)
