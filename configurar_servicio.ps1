# Script de configuración e instalación del servicio Windows con NSSM
$ErrorActionPreference = 'SilentlyContinue'

$serviceName = "ElTatoImpresion"
$dir = $PSScriptRoot
if (-not $dir) { $dir = (Get-Location).Path }
$nssm = "$dir\nssm.exe"
$node = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $node)) {
    $nodeCmd = (Get-Command node -ErrorAction SilentlyContinue).Source
    if ($nodeCmd) { $node = $nodeCmd }
}
$script = "$dir\server\index.js"
$logOut = "$dir\server\data\servicio_stdout.log"
$logErr = "$dir\server\data\servicio_stderr.log"

Write-Host "Configurando servicio Windows con NSSM..." -ForegroundColor Cyan

# 1. Detener servicio previo si existiera
& $nssm stop $serviceName 2>$null

# 2. Liberar puerto 3000 si hay procesos bloqueándolo
$pids = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($pids) {
    Stop-Process -Id $pids -Force -ErrorAction SilentlyContinue
}

# 3. Instalar y configurar servicio
& $nssm install $serviceName "$node" "`"$script`""
& $nssm set $serviceName AppDirectory "$dir"
& $nssm set $serviceName DisplayName "Sistema de Impresión El Tato"
& $nssm set $serviceName Description "Servidor Web Kiosco de Impresión Epson L3560 (Inicio automático con Windows)"
& $nssm set $serviceName Start SERVICE_AUTO_START
& $nssm set $serviceName AppStdout "$logOut"
& $nssm set $serviceName AppStderr "$logErr"
& $nssm set $serviceName AppExit Default Restart
& $nssm set $serviceName AppRestartDelay 5000

# 4. Limpiar accesos duplicados en Startup
$startupLnk = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Kiosco El Tato.lnk"
if (Test-Path $startupLnk) {
    Remove-Item $startupLnk -Force -ErrorAction SilentlyContinue
}

# 5. Iniciar servicio
& $nssm start $serviceName

# 6. Escribir resultado
$status = & $nssm status $serviceName
Set-Content -Path "$dir\server\data\servicio_instalado.txt" -Value "SERVICIO: $serviceName`nESTADO: $status`nFECHA: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Encoding UTF8

Write-Host "¡Servicio configurado! Estado: $status" -ForegroundColor Green
