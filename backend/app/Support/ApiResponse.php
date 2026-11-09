<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Helper untuk membuat envelope respons API yang konsisten.
 * Format: { success, message, data, meta?, errors? }
 */
class ApiResponse
{
    /**
     * Respons sukses umum (200).
     */
    public static function success(mixed $data = null, string $message = 'OK', int $status = 200, ?array $meta = null): JsonResponse
    {
        $payload = [
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ];

        if ($meta !== null) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    /**
     * Respons sukses untuk pembuatan data (201).
     */
    public static function created(mixed $data = null, string $message = 'Berhasil dibuat.'): JsonResponse
    {
        return self::success($data, $message, 201);
    }

    /**
     * Respons error.
     */
    public static function error(string $message, int $status = 400, ?array $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
