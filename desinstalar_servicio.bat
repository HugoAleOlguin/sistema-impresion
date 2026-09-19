@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   DESINSTALADOR DE SERVICIO WINDOWS - EL TATO
echo ========================================================
echo.

openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de Administrador...
    powershell -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

set "SERVICE_NAME=ElTatoImpresion"
set "NSSM_EXE=%~dp0nssm.exe"

echo Deteniendo servicio %SERVICE_NAME%...
"%NSSM_EXE%" stop "%SERVICE_NAME%"

echo Eliminando servicio %SERVICE_NAME%...
"%NSSM_EXE%" remove "%SERVICE_NAME%" confirm

echo.
echo ========================================================
echo   Servicio desinstalado correctamente.
echo ========================================================
echo.
pause
