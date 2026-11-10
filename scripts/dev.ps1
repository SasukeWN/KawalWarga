# ============================================================================
# KawalWarga — Jalankan Backend (8000) & Frontend (3000) Sekaligus (PowerShell)
# ============================================================================

$RootDir = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

Write-Host "Menjalankan Backend Laravel di http://localhost:8000 ..." -ForegroundColor Cyan
$BackendProc = Start-Process -FilePath "php" -ArgumentList "artisan", "serve", "--host=127.0.0.1", "--port=8000" -WorkingDirectory $BackendDir -PassThru -NoNewWindow

Write-Host "Menjalankan Frontend Next.js di http://localhost:3000 ..." -ForegroundColor Green
try {
    Set-Location $FrontendDir
    npm run dev
} finally {
    if ($BackendProc -and !$BackendProc.HasExited) {
        Stop-Process -Id $BackendProc.Id -Force -ErrorAction SilentlyContinue
    }
}
