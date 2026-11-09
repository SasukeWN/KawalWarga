<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\AiUnavailable;
use App\Http\Controllers\Controller;
use App\Services\Ai\GeminiClient;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    /**
     * GET /api/v1/health
     * Cek status aplikasi dan database.
     */
    public function index(): JsonResponse
    {
        $db = 'ok';

        try {
            DB::select('SELECT 1');
        } catch (\Throwable) {
            $db = 'error';
        }

        return ApiResponse::success([
            'app'  => 'ok',
            'db'   => $db,
            'time' => now()->toIso8601String(),
        ]);
    }

    /**
     * GET /api/v1/health/ai
     * Uji koneksi ke Gemini API menggunakan GeminiClient. Dilindungi header X-Health-Key.
     */
    public function ai(Request $request, GeminiClient $gemini): JsonResponse
    {
        $expectedKey = (string) config('services.health_key');
        $providedKey = (string) $request->header('X-Health-Key');

        if ($expectedKey === '' || ! hash_equals($expectedKey, $providedKey)) {
            return ApiResponse::error('Akses ditolak.', 403);
        }

        if (! config('services.gemini.api_key') || ! config('services.gemini.model')) {
            return ApiResponse::error('Konfigurasi Gemini belum diatur.', 500);
        }

        try {
            $gemini->generate([['text' => 'Balas "ok".']], null, null, 0.0);

            return ApiResponse::success([
                'ai'   => 'ok',
                'time' => now()->toIso8601String(),
            ]);
        } catch (AiUnavailable $e) {
            return ApiResponse::error($e->getMessage(), 502);
        } catch (\Throwable) {
            return ApiResponse::error('Gagal menghubungi layanan AI.', 502);
        }
    }
}
