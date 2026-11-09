<?php

namespace App\Services\Ai;

use App\Models\Report;

/**
 * Layanan analisis laporan dengan AI.
 * Catatan: pada Step 3 ini masih berupa stub (fallback judul 60 karakter pertama dan ai_status = failed).
 * Implementasi penuh menggunakan GeminiClient akan ditambahkan pada Step 7.
 */
class ReportAnalyzer
{
    public function analyze(Report $report): Report
    {
        $report->update([
            'title'     => mb_substr(trim($report->description), 0, 60),
            'ai_status' => 'failed',
        ]);

        return $report->fresh();
    }
}
