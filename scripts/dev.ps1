# ============================================================================
# KawalWarga — Jalankan Backend (8000) & Frontend (3000) Sekaligus (PowerShell)
# ============================================================================

$RootDir = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

# Deteksi binary PHP jika belum terdaftar di PATH global (misal Laragon/XAMPP)
$PhpCmd = "php"
if (-not (Get-Command "php" -ErrorAction SilentlyContinue)) {
    $Candidate = Get-ChildItem "C:\laragon\bin\php\*\php.exe", "C:\xampp\php\php.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($Candidate) {
        $PhpCmd = $Candidate.FullName
    }
}

Write-Host "Menjalankan Backend Laravel di http://localhost:8000 ..." -ForegroundColor Cyan
$BackendProc = Start-Process -FilePath $PhpCmd -ArgumentList "artisan", "serve", "--host=127.0.0.1", "--port=8000" -WorkingDirectory $BackendDir -PassThru -NoNewWindow

Write-Host "Menjalankan Frontend Next.js di http://localhost:3000 ..." -ForegroundColor Green
try {
    Set-Location $FrontendDir
    npm.cmd run dev
} finally {
    if ($BackendProc -and !$BackendProc.HasExited) {
        Stop-Process -Id $BackendProc.Id -Force -ErrorAction SilentlyContinue
    }
}
