@echo off
title Servidor de Impresion - Kiosco El Tato
color 0A

cd /d "%~dp0"

echo ======================================================================
echo             SERVIDOR DE IMPRESION - KIOSCO "EL TATO"
echo ======================================================================
echo.
echo   1. Mantene esta ventana SIEMPRE ABIERTA mientras el kiosco atienda.
echo   2. Conecta el celular del mostrador a la misma red Wi-Fi.
echo   3. En el celular, abri la direccion IP que se mostrara abajo.
echo.
echo ======================================================================
echo.

node server/index.js

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] El servidor se detuvo con codigo %ERRORLEVEL%.
  pause
)

pause

