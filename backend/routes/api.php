<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Public\ReportController as PublicReportController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', [HealthController::class, 'index']);
    Route::get('/health/ai', [HealthController::class, 'ai']);

    // Endpoint Publik (Warga)
    Route::post('/reports', [PublicReportController::class, 'store'])->middleware('throttle:reports');

    // Autentikasi
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
    });

    // Endpoint Admin (role: admin)
    Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
        Route::get('/ping', fn () => ApiResponse::success(['role' => 'admin']));
    });

    // Endpoint Petugas (role: petugas)
    Route::prefix('officer')->middleware(['auth:sanctum', 'role:petugas'])->group(function () {
        Route::get('/ping', fn () => ApiResponse::success(['role' => 'petugas']));
    });
});
