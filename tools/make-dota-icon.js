// Generate high-resolution Dota 2 icons: build/icon.png and build/icon.ico
const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.Drawing

$size = 512
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear background
$g.Clear([System.Drawing.Color]::Transparent)

# Outer rounded rectangle for modern icon look
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$arcRect1 = New-Object System.Drawing.Rectangle(16, 16, 96, 96)
$arcRect2 = New-Object System.Drawing.Rectangle(400, 16, 96, 96)
$arcRect3 = New-Object System.Drawing.Rectangle(400, 400, 96, 96)
$arcRect4 = New-Object System.Drawing.Rectangle(16, 400, 96, 96)

$path.AddArc($arcRect1, 180, 90)
$path.AddArc($arcRect2, 270, 90)
$path.AddArc($arcRect3, 0, 90)
$path.AddArc($arcRect4, 90, 90)
$path.CloseFigure()

# Background gradient (dark charcoal)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(0, 0)),
    (New-Object System.Drawing.PointF(512, 512)),
    [System.Drawing.Color]::FromArgb(255, 30, 24, 24),
    [System.Drawing.Color]::FromArgb(255, 14, 12, 14)
)
$g.FillPath($bgBrush, $path)

# Subtle border
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 226, 54, 38), 3)
$g.DrawPath($borderPen, $path)

# Red emblem brush (official Dota 2 red)
$redBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    ([System.Drawing.PointF]::new(60, 60)),
    ([System.Drawing.PointF]::new(450, 450)),
    [System.Drawing.Color]::FromArgb(255, 235, 60, 42),
    [System.Drawing.Color]::FromArgb(255, 185, 35, 25)
)

# 1. Radiant bottom-left stone
$p1 = @(
    [System.Drawing.PointF]::new(155, 425),
    [System.Drawing.PointF]::new(195, 410),
    [System.Drawing.PointF]::new(100, 318),
    [System.Drawing.PointF]::new(92, 313),
    [System.Drawing.PointF]::new(77, 354),
    [System.Drawing.PointF]::new(65, 395),
    [System.Drawing.PointF]::new(116, 439)
)
$g.FillPolygon($redBrush, $p1)

# 2. Diagonal River traversal
$p2 = @(
    [System.Drawing.PointF]::new(443, 380),
    [System.Drawing.PointF]::new(463, 331),
    [System.Drawing.PointF]::new(107, 91),
    [System.Drawing.PointF]::new(95, 82),
    [System.Drawing.PointF]::new(76, 91),
    [System.Drawing.PointF]::new(57, 101),
    [System.Drawing.PointF]::new(214, 265),
    [System.Drawing.PointF]::new(372, 429),
    [System.Drawing.PointF]::new(423, 429)
)
$g.FillPolygon($redBrush, $p2)

# 3. Dire top-right stone
$p3 = @(
    [System.Drawing.PointF]::new(414, 149),
    [System.Drawing.PointF]::new(421, 110),
    [System.Drawing.PointF]::new(406, 98),
    [System.Drawing.PointF]::new(391, 87),
    [System.Drawing.PointF]::new(308, 110),
    [System.Drawing.PointF]::new(407, 187)
)
$g.FillPolygon($redBrush, $p3)

$g.Dispose()

$pngPath = Resolve-Path 'build/icon.png'
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Generate multi-res ICO
$sizes = @(256, 128, 64, 48, 32, 16)
$icoBytes = New-Object System.Collections.Generic.List[byte]

# ICO Header
$icoBytes.AddRange([byte[]]@(0, 0, 1, 0, [byte]$sizes.Count, 0))

$offset = 6 + ($sizes.Count * 16)
$imageDatas = @()

foreach ($s in $sizes) {
    $subBmp = New-Object System.Drawing.Bitmap($bmp, $s, $s)
    $ms = New-Object System.IO.MemoryStream
    $subBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $imageDatas += ,$bytes
    $subBmp.Dispose()
    $ms.Dispose()

    $wByte = if ($s -ge 256) { 0 } else { [byte]$s }
    $hByte = if ($s -ge 256) { 0 } else { [byte]$s }
    
    # Directory entry
    $icoBytes.Add($wByte)
    $icoBytes.Add($hByte)
    $icoBytes.Add(0) # colors
    $icoBytes.Add(0) # reserved
    $icoBytes.AddRange([byte[]]@(1, 0)) # planes
    $icoBytes.AddRange([byte[]]@(32, 0)) # bpp
    
    # size of image data (4 bytes LE)
    $len = $bytes.Length
    $icoBytes.Add([byte]($len -band 0xFF))
    $icoBytes.Add([byte](($len -shr 8) -band 0xFF))
    $icoBytes.Add([byte](($len -shr 16) -band 0xFF))
    $icoBytes.Add([byte](($len -shr 24) -band 0xFF))

    # offset of image data (4 bytes LE)
    $icoBytes.Add([byte]($offset -band 0xFF))
    $icoBytes.Add([byte](($offset -shr 8) -band 0xFF))
    $icoBytes.Add([byte](($offset -shr 16) -band 0xFF))
    $icoBytes.Add([byte](($offset -shr 24) -band 0xFF))

    $offset += $len
}

foreach ($img in $imageDatas) {
    $icoBytes.AddRange($img)
}

[System.IO.File]::WriteAllBytes((Resolve-Path 'build/icon.ico'), $icoBytes.ToArray())
$bmp.Dispose()
Write-Output "SUCCESS"
`;

fs.writeFileSync('tools/make-icon.ps1', psScript, 'utf8');
execSync('powershell -ExecutionPolicy Bypass -File tools/make-icon.ps1', { stdio: 'inherit' });
console.log('Successfully generated build/icon.png and build/icon.ico');
