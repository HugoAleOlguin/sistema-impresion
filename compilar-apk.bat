@echo off
chcp 65001 >nul
title Compilar APK Android - Kiosco El Tato

echo ========================================================
echo        COMPILADOR DE APK ANDROID - KIOSCO EL TATO
echo ========================================================
echo.

set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [!] No se encontro JDK 17 en la ruta por defecto. Buscando en el sistema...
    for /f "delims=" %%i in ('where java 2^>nul') do set "JAVA_BIN=%%i"
) else (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not exist "%ANDROID_HOME%" (
    set "ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
)

echo [1/3] Verificando entorno de compilacion...
echo       Java:        %JAVA_HOME%
echo       Android SDK: %ANDROID_HOME%
echo.

cd /d "%~dp0android"

echo [2/3] Compilando APK nativo ultra-liviano con Gradle...
call gradlew.bat assembleRelease --no-daemon

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] La compilacion de Gradle fallo con codigo %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Copiando archivo APK listo para instalar...
set "OUT_DIR=%~dp0android\app\build\outputs\apk\release"
set "FINAL_APK=%~dp0KioscoElTato.apk"

if exist "%OUT_DIR%\app-release.apk" (
    copy /y "%OUT_DIR%\app-release.apk" "%FINAL_APK%" >nul
    echo.
    echo ========================================================
    echo         ¡APK COMPILADO EXITOSAMENTE CON EXITO!
    echo ========================================================
    echo.
    echo  Archivo generado:
    echo  --^> %FINAL_APK%
    echo.
    echo  Tamano ultra-liviano:
    for %%A in ("%FINAL_APK%") do echo  --^> %%~zA bytes
    echo.
    echo  Instrucciones para instalar:
    echo  1. Enviate el archivo KioscoElTato.apk a tu celular por WhatsApp Web, Drive o cable USB.
    echo  2. Tocalo en el celular y selecciona "Instalar".
    echo  3. Abrelo y se conectara solo al instante.
    echo ========================================================
) else (
    echo [!] No se encontro el archivo app-release.apk en: %OUT_DIR%
)

echo.
pause
