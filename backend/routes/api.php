<?php

use App\Http\Controllers\Api\V1\Admin\ReportController as AdminReportController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Officer\ReportController as OfficerReportController;
use App\Http\Controllers\Api\V1\Public\ReportController as PublicReportController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', [HealthController::class, 'index']);
    Route::get('/health/ai', [HealthController::class, 'ai']);

    // Endpoint Publik (Warga)
    Route::post('/reports', [PublicReportController::class, 'store'])->middleware('throttle:reports');
    Route::get('/reports/track/{ticket_id}', [PublicReportController::class, 'track']);

    // Autentikasi
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
    });

    // Endpoint Admin (role: admin)
    Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
        Route::get('/ping', fn () => ApiResponse::success(['role' => 'admin']));

        Route::get('/reports', [AdminReportController::class, 'index']);
        Route::get('/reports/{ticket_id}', [AdminReportController::class, 'show']);
        Route::post('/reports/{ticket_id}/approve', [AdminReportController::class, 'approve']);
        Route::post('/reports/{ticket_id}/reject', [AdminReportController::class, 'reject']);
        Route::post('/reports/{ticket_id}/reanalyze', [AdminReportController::class, 'reanalyze']);
    });

    // Endpoint Petugas (role: petugas)
    Route::prefix('officer')->middleware(['auth:sanctum', 'role:petugas'])->group(function () {
        Route::get('/ping', fn () => ApiResponse::success(['role' => 'petugas']));

        Route::get('/queue', [OfficerReportController::class, 'queue']);
        Route::get('/my-reports', [OfficerReportController::class, 'myReports']);
        Route::get('/reports/{ticket_id}', [OfficerReportController::class, 'show']);
        Route::post('/reports/{ticket_id}/take', [OfficerReportController::class, 'take']);
        Route::post('/reports/{ticket_id}/progress', [OfficerReportController::class, 'progress']);
        Route::post('/reports/{ticket_id}/complete', [OfficerReportController::class, 'complete']);
    });
});
