@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ========================================================
echo   INSTALADOR DE SERVICIO WINDOWS CON NSSM
echo ========================================================
echo.

openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de Administrador...
    powershell -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

set "SERVICE_NAME=ElTatoImpresion"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"

set "APP_SCRIPT=%APP_DIR%\server\index.js"
set "LOG_OUT=%APP_DIR%\server\data\servicio_stdout.log"
set "LOG_ERR=%APP_DIR%\server\data\servicio_stderr.log"
set "NSSM_EXE=%APP_DIR%\nssm.exe"

if not exist "%NODE_EXE%" (
    for /f "delims=" %%i in ('where node.exe 2^>nul') do set "NODE_EXE=%%i"
)

echo [1/5] Deteniendo servicio anterior si existe...
"%NSSM_EXE%" stop "%SERVICE_NAME%" >nul 2>&1

echo [2/5] Liberando puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [3/5] Registrando y configurando servicio en NSSM...
"%NSSM_EXE%" remove "%SERVICE_NAME%" confirm >nul 2>&1
"%NSSM_EXE%" install "%SERVICE_NAME%" "%NODE_EXE%" "\"%APP_SCRIPT%\""
"%NSSM_EXE%" set "%SERVICE_NAME%" AppDirectory "%APP_DIR%"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppParameters "\"%APP_SCRIPT%\""
"%NSSM_EXE%" set "%SERVICE_NAME%" DisplayName "Sistema de Impresion El Tato"
"%NSSM_EXE%" set "%SERVICE_NAME%" Description "Servidor Web Kiosco de Impresion para Epson L3560. Inicia con Windows."
"%NSSM_EXE%" set "%SERVICE_NAME%" Start SERVICE_AUTO_START
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStdout "%LOG_OUT%"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStderr "%LOG_ERR%"
"%NSSM_EXE%" set "%SERVICE_NAME%" AppExit Default Restart
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRestartDelay 5000

echo [4/5] Limpiando accesos directos anteriores de Inicio...
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Kiosco El Tato.lnk" (
    del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Kiosco El Tato.lnk" >nul 2>&1
)

echo [5/5] Iniciando servicio de Windows...
"%NSSM_EXE%" start "%SERVICE_NAME%"

echo.
echo ========================================================
echo   SERVICIO INSTALADO Y EN EJECUCION
echo   Inicia automaticamente cada vez que se enciende la PC
echo   Acceso: http://localhost:3000
echo ========================================================
echo.
pause
