<?php

namespace App\Services\Ai;

use App\Exceptions\AiUnavailable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class GeminiClient
{
    /**
     * Panggil endpoint generateContent v1beta Google Gemini API tanpa retry.
     *
     * @param  array<int, mixed>  $parts  Daftar part (contoh: [['text' => '...']] atau multi-turn contents)
     * @param  array<string, mixed>|null  $schema  JSON Schema untuk keluaran terstruktur
     * @return array<string, mixed>
     *
     * @throws AiUnavailable
     */
    public function generate(
        array $parts,
        ?string $system = null,
        ?array $schema = null,
        float $temperature = 0.2
    ): array {
        $apiKey  = (string) config('services.gemini.api_key');
        $model   = (string) config('services.gemini.model');
        $timeout = (int) config('services.gemini.timeout', 12);

        if ($apiKey === '') {
            throw new AiUnavailable('GEMINI_API_KEY belum diisi di backend/.env');
        }

        if ($model === '') {
            throw new AiUnavailable('GEMINI_MODEL belum diisi di backend/.env (contoh: gemini-2.5-flash)');
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        // Dukung baik array parts tunggal maupun array multi-turn contents
        $first = $parts[0] ?? null;
        $contents = (is_array($first) && isset($first['parts']))
            ? $parts
            : [['role' => 'user', 'parts' => $parts]];

        $generationConfig = [
            'temperature' => $temperature,
        ];

        if ($schema !== null) {
            $generationConfig['responseMimeType'] = 'application/json';
            $generationConfig['responseSchema']   = $schema;
        }

        $payload = [
            'contents'         => $contents,
            'generationConfig' => $generationConfig,
        ];

        if ($system !== null && trim($system) !== '') {
            $payload['systemInstruction'] = [
                'parts' => [
                    ['text' => $system],
                ],
            ];
        }

        try {
            $response = Http::timeout($timeout)
                ->withHeaders([
                    'x-goog-api-key' => $apiKey,
                ])
                ->post($url, $payload);
        } catch (ConnectionException) {
            throw new AiUnavailable('Koneksi ke Gemini gagal atau habis waktu.');
        } catch (\Throwable) {
            throw new AiUnavailable('Gagal menghubungi layanan AI.');
        }

        if (! $response->successful()) {
            $errMessage = $response->json('error.message') ?? $response->body();
            throw new AiUnavailable('Gemini merespons dengan status HTTP '.$response->status().': '.$errMessage);
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text');

        if (! is_string($text) || trim($text) === '') {
            throw new AiUnavailable('Respons Gemini kosong atau tidak valid.');
        }

        if ($schema !== null) {
            $cleaned = trim($text);
            if ( str_starts_with($cleaned, '```')) {
                $cleaned = (string) preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $cleaned);
            }

            $decoded = json_decode($cleaned, true);
            if (! is_array($decoded)) {
                throw new AiUnavailable('Respons JSON dari Gemini tidak valid.');
            }

            return $decoded;
        }

        return ['text' => trim($text)];
    }
}
