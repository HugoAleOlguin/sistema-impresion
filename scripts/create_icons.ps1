Add-Type -AssemblyName System.Drawing

function Generate-Icon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    # Printer base (Blue)
    $scale = $size / 100.0
    $blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 250, 252))
    $greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))

    # Top paper
    $g.FillRectangle($whiteBrush, [int](30 * $scale), [int](15 * $scale), [int](40 * $scale), [int](22 * $scale))
    # Body
    $g.FillRectangle($blueBrush, [int](18 * $scale), [int](35 * $scale), [int](64 * $scale), [int](34 * $scale))
    # Bottom printed sheet
    $g.FillRectangle($whiteBrush, [int](28 * $scale), [int](55 * $scale), [int](44 * $scale), [int](30 * $scale))
    # Green LED
    $g.FillEllipse($greenBrush, [int](24 * $scale), [int](44 * $scale), [int](6 * $scale), [int](6 * $scale))

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Generate-Icon 192 "public/icons/icon-192.png"
Generate-Icon 512 "public/icons/icon-512.png"
Write-Host "Icons generated successfully!"
