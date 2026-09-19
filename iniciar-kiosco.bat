@echo off
title Servidor de Impresion - Kiosco El Tato
color 0A

cd /d "%~dp0"

echo ======================================================================
echo             SERVIDOR DE IMPRESION - KIOSCO "EL TATO"
echo ======================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no esta instalado en esta computadora.
    echo Por favor descargalo e instalalo desde: https://nodejs.org/
    echo (Descarga la version LTS recomendada para Windows).
    echo.
    pause
    exit /b 1
)

:: 2. Verificar dependencias de Node.js (node_modules)
if not exist "%~dp0node_modules\" (
    echo [INFO] Primera vez detectada: Instalando paquetes necesarios (npm install)...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] No se pudieron instalar las dependencias de Node.js.
        pause
        exit /b %ERRORLEVEL%
    )
    echo [OK] Dependencias instaladas correctamente.
    echo.
)

:: 3. Verificar motor de impresion silenciosa (SumatraPDF)
if not exist "%~dp0server\bin\SumatraPDF.exe" (
    echo [INFO] Descargando motor de impresion silenciosa SumatraPDF...
    powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path '%~dp0server\bin' | Out-Null; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.exe' -OutFile '%~dp0server\bin\SumatraPDF.exe' -UseBasicParsing"
)

:: 4. Verificar motor de tunel remoto Cloudflare (cloudflared.exe)
if not exist "%~dp0cloudflared.exe" (
    echo [INFO] Descargando motor de tunel Cloudflare (cloudflared.exe)...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe' -UseBasicParsing"
)

echo   1. Mantene esta ventana SIEMPRE ABIERTA mientras el kiosco atienda.
echo   2. Conecta el celular del mostrador a la misma red Wi-Fi o abri la App.
echo   3. En el celular, abri la aplicacion Kiosco El Tato o la direccion IP.
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
