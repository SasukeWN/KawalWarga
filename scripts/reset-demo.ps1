# ============================================================================
# KawalWarga — Reset Demo Database & Seeders (PowerShell)
# ============================================================================

$RootDir = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"

$PhpCmd = "php"
if (-not (Get-Command "php" -ErrorAction SilentlyContinue)) {
    $Candidate = Get-ChildItem "C:\laragon\bin\php\*\php.exe", "C:\xampp\php\php.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($Candidate) {
        $PhpCmd = $Candidate.FullName
    }
}

Write-Host "Mereset dan melakukan seeding ulang database demo..." -ForegroundColor Yellow
Push-Location $BackendDir
try {
    & $PhpCmd artisan migrate:fresh --seed
    Write-Host "`nDatabase demo berhasil direset ke kondisi awal (204 laporan demo siap)!" -ForegroundColor Green
} finally {
    Pop-Location
}
