$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder "Kiosco El Tato.lnk"

if (Test-Path $shortcutPath) {
    Remove-Item -Path $shortcutPath -Force
    Write-Host "[OK] Auto-inicio desactivado: Se elimino el acceso directo de la carpeta de Inicio de Windows." -ForegroundColor Green
} else {
    Write-Host "[INFO] El auto-inicio no estaba activo en esta PC (no existia el acceso en Inicio)." -ForegroundColor Yellow
}
