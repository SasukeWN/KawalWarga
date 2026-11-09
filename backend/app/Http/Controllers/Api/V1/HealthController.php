<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

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
     * Uji koneksi ke Gemini API. Dilindungi header X-Health-Key.
     */
    public function ai(Request $request): JsonResponse
    {
        $expectedKey = (string) config('services.health_key');
        $providedKey = (string) $request->header('X-Health-Key');

        if ($expectedKey === '' || ! hash_equals($expectedKey, $providedKey)) {
            return ApiResponse::error('Akses ditolak.', 403);
        }

        $apiKey  = config('services.gemini.api_key');
        $model   = config('services.gemini.model');
        $timeout = (int) config('services.gemini.timeout', 12);

        if (! $apiKey || ! $model) {
            return ApiResponse::error('Konfigurasi Gemini belum diatur.', 500);
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        try {
            $response = Http::timeout($timeout)
                ->withoutVerifying()
                ->withHeaders([
                    'x-goog-api-key' => $apiKey,
                ])
                ->post($url, [
                    'contents' => [
                        ['parts' => [['text' => 'Balas "ok".']]],
                    ],
                    'generationConfig' => [
                        'maxOutputTokens' => 8,
                        'temperature'     => 0.0,
                    ],
                ]);

            if ($response->successful()) {
                return ApiResponse::success([
                    'ai'   => 'ok',
                    'time' => now()->toIso8601String(),
                ]);
            }

            return ApiResponse::error('Gemini merespons dengan status HTTP '.$response->status().'.', 502);
        } catch (ConnectionException) {
            return ApiResponse::error('Koneksi ke Gemini gagal atau habis waktu.', 502);
        } catch (\Throwable) {
            return ApiResponse::error('Gagal menghubungi layanan AI.', 502);
        }
    }
}
