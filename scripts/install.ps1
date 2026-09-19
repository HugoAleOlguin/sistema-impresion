# ==============================================================================
# INSTALADOR Y CONFIGURADOR DE AUTO-INICIO -- KIOSCO "EL TATO"
# ==============================================================================

$Host.UI.RawUI.WindowTitle = "Instalador Kiosco El Tato"

$ProjectRoot = (Get-Item "$PSScriptRoot\..").FullName
Set-Location $ProjectRoot

function Show-Header {
    Clear-Host
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "         INSTALADOR AUTOMATICO - KIOSCO 'EL TATO'                     " -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
}

Show-Header

# ------------------------------------------------------------------------------
# Paso 0: Verificacion y Elevacion de Permisos de Administrador
# ------------------------------------------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[*] Solicitando permisos de Administrador para configurar Firewall y accesos..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "[OK] Permisos de Administrador concedidos." -ForegroundColor Green
Write-Host "Directorio del proyecto: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

# ------------------------------------------------------------------------------
# Paso 1: Verificacion de Node.js
# ------------------------------------------------------------------------------
Write-Host "1. Verificando instalacion de Node.js..." -ForegroundColor Cyan
$nodeInstalled = $false
try {
    $nodeVer = & node -v 2>$null
    if ($nodeVer) {
        Write-Host "   [OK] Node.js detectado: $nodeVer" -ForegroundColor Green
        $nodeInstalled = $true
    }
} catch {}

if (-not $nodeInstalled) {
    Write-Host "   [!] Node.js NO esta instalado en esta PC." -ForegroundColor Yellow
    Write-Host "   Intentando instalar Node.js LTS mediante Windows Package Manager (winget)..." -ForegroundColor Gray
    try {
        & winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        Write-Host "   [OK] Node.js instalado con winget." -ForegroundColor Green
    } catch {
        Write-Host "   [X] No se pudo auto-instalar con winget." -ForegroundColor Red
        Write-Host "   Por favor descarga e instala Node.js LTS desde: https://nodejs.org/" -ForegroundColor Yellow
        Start-Process "https://nodejs.org/"
        pause
        exit 1
    }
}

# ------------------------------------------------------------------------------
# Paso 2: Instalacion de dependencias npm
# ------------------------------------------------------------------------------
Write-Host "`n2. Verificando dependencias del proyecto (npm)..." -ForegroundColor Cyan
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    Write-Host "   Instalando dependencias de Node.js (express, pdf-lib, sharp, etc)..." -ForegroundColor Gray
    & npm install --prefix "$ProjectRoot"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Dependencias instaladas correctamente." -ForegroundColor Green
    } else {
        Write-Host "   [!] Advertencia al ejecutar npm install. Codigo: $LASTEXITCODE" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [OK] La carpeta node_modules ya existe y esta lista." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Paso 3: Motor de Impresion Silenciosa (SumatraPDF)
# ------------------------------------------------------------------------------
Write-Host "`n3. Verificando motor de impresion silenciosa (SumatraPDF)..." -ForegroundColor Cyan
$binDir = "$ProjectRoot\server\bin"
$sumatraExe = "$binDir\SumatraPDF.exe"

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Force -Path $binDir | Out-Null
}

if (-not (Test-Path $sumatraExe)) {
    Write-Host "   Descargando SumatraPDF portable (impresion silenciosa sin ventanas)..." -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.exe" -OutFile $sumatraExe -UseBasicParsing
        Write-Host "   [OK] SumatraPDF descargado en: $sumatraExe" -ForegroundColor Green
    } catch {
        Write-Host "   [!] Error descargando SumatraPDF: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   Se utilizara PowerShell nativo como respaldo." -ForegroundColor Gray
    }
} else {
    Write-Host "   [OK] SumatraPDF ya esta presente en $sumatraExe" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Paso 3b: Motor de Tunel Cloudflare (cloudflared)
# ------------------------------------------------------------------------------
Write-Host "`n3b. Verificando motor de tunel Cloudflare (cloudflared)..." -ForegroundColor Cyan
$cfExe = "$ProjectRoot\cloudflared.exe"
if (-not (Test-Path $cfExe)) {
    Write-Host "   Descargando cloudflared.exe para tuneles remotos automaticos..." -ForegroundColor Gray
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cfExe -UseBasicParsing
        Write-Host "   [OK] cloudflared.exe descargado en: $cfExe" -ForegroundColor Green
    } catch {
        Write-Host "   [!] Error descargando cloudflared: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [OK] cloudflared.exe ya esta presente en $cfExe" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Paso 4: Apertura de Puerto en Firewall de Windows
# ------------------------------------------------------------------------------
Write-Host "`n4. Configurando regla en Firewall de Windows (Puerto 3000)..." -ForegroundColor Cyan
$existingRule = Get-NetFirewallRule -DisplayName "Kiosco El Tato Impresiones" -ErrorAction SilentlyContinue
if (-not $existingRule) {
    & netsh advfirewall firewall add rule name="Kiosco El Tato Impresiones" dir=in action=allow protocol=TCP localport=3000 | Out-Null
    Write-Host "   [OK] Regla de Firewall creada: Puerto 3000 TCP permitido para celulares en la Wi-Fi." -ForegroundColor Green
} else {
    Write-Host "   [OK] La regla de Firewall para el puerto 3000 ya estaba activa." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Paso 5: Deteccion de Impresora Epson
# ------------------------------------------------------------------------------
Write-Host "`n5. Buscando impresora Epson en el sistema..." -ForegroundColor Cyan
try {
    $epsonPrinters = Get-Printer | Where-Object { $_.Name -like "*EPSON*" -or $_.Name -like "*L3560*" }
    if ($epsonPrinters) {
        foreach ($p in $epsonPrinters) {
            Write-Host "   [OK] Detectada: $($p.Name) (Driver: $($p.DriverName), Puerto: $($p.PortName), Estado: $($p.PrinterStatus))" -ForegroundColor Green
        }
    } else {
        Write-Host "   [INFO] No se detecto ninguna impresora Epson conectada aun." -ForegroundColor Yellow
        Write-Host "   (Asegurate de instalar el driver oficial y conectar el cable USB cuando uses esta PC)." -ForegroundColor Gray
    }
} catch {
    Write-Host "   [!] No se pudo consultar la lista de impresoras de Windows." -ForegroundColor Gray
}

# ------------------------------------------------------------------------------
# Paso 6: Configuracion de Auto-Inicio con Windows
# ------------------------------------------------------------------------------
Write-Host "`n6. Configurando Auto-Inicio con Windows (Autoarranque)..." -ForegroundColor Cyan
try {
    $WshShell = New-Object -ComObject WScript.Shell

    # 1. Acceso directo en la carpeta de Inicio de Windows (Startup)
    $startupFolder = [Environment]::GetFolderPath('Startup')
    $startupShortcutPath = Join-Path $startupFolder "Kiosco El Tato.lnk"

    $startupShortcut = $WshShell.CreateShortcut($startupShortcutPath)
    $startupShortcut.TargetPath = "$ProjectRoot\iniciar-kiosco.bat"
    $startupShortcut.WorkingDirectory = $ProjectRoot
    $startupShortcut.Description = "Servidor de Impresion Kiosco El Tato"
    $startupShortcut.IconLocation = "shell32.dll,14" # Icono de impresora
    $startupShortcut.Save()
    Write-Host "   [OK] Auto-inicio configurado: Se iniciara automaticamente al encender la PC." -ForegroundColor Green
    Write-Host "        Ubicacion: $startupShortcutPath" -ForegroundColor Gray

    # 2. Acceso directo en el Escritorio
    $desktopFolder = [Environment]::GetFolderPath('Desktop')
    $desktopShortcutPath = Join-Path $desktopFolder "Kiosco El Tato.lnk"

    $desktopShortcut = $WshShell.CreateShortcut($desktopShortcutPath)
    $desktopShortcut.TargetPath = "$ProjectRoot\iniciar-kiosco.bat"
    $desktopShortcut.WorkingDirectory = $ProjectRoot
    $desktopShortcut.Description = "Iniciar Servidor Kiosco El Tato"
    $desktopShortcut.IconLocation = "shell32.dll,14"
    $desktopShortcut.Save()
    Write-Host "   [OK] Acceso directo creado en el Escritorio: Kiosco El Tato" -ForegroundColor Green
} catch {
    Write-Host "   [!] Error creando accesos directos: $($_.Exception.Message)" -ForegroundColor Red
}

# ------------------------------------------------------------------------------
# Resumen Final
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "              INSTALACION COMPLETADA EXITOSAMENTE                     " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  * Cada vez que inicie Windows, el servidor arrancara automaticamente." -ForegroundColor White
Write-Host "  * Tambien podes iniciarlo con el icono 'Kiosco El Tato' en el Escritorio." -ForegroundColor White
Write-Host "  * Para desactivar el autoarranque en el futuro, ejecuta: desinstalar-autoinicio.bat" -ForegroundColor Gray
Write-Host ""

$answer = Read-Host "Deseas iniciar el servidor de impresion ahora mismo? (S/N)"
if ($answer -match "^[sSyY]") {
    Write-Host "`nIniciando servidor..." -ForegroundColor Green
    Start-Process "$ProjectRoot\iniciar-kiosco.bat"
}
