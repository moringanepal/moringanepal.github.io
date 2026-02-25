$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$galleryDir = Join-Path $repoRoot "gallery"
$outFile = Join-Path $galleryDir "images.json"

if (!(Test-Path $galleryDir)) {
  throw "Gallery directory not found: $galleryDir"
}

$imageExts = @(".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg")

$files =
  Get-ChildItem -Path $galleryDir -File |
  Where-Object {
    $name = $_.Name.ToLowerInvariant()
    if ($name -eq "index.html") { return $false }
    if ($name -eq "images.json") { return $false }
    foreach ($ext in $imageExts) {
      if ($name.EndsWith($ext)) { return $true }
    }
    return $false
  } |
  Sort-Object -Property Name |
  Select-Object -ExpandProperty Name

$json = $files | ConvertTo-Json -Depth 2
$json | Set-Content -Path $outFile -Encoding UTF8

Write-Host "Wrote $($files.Count) images to $outFile"

