<?php

namespace App\Services\Ai;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Models\AiInsight;
use App\Models\Report;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class InsightService
{
    public function __construct(private readonly GeminiClient $gemini) {}

    /**
     * Hitung ringkasan agregat dashboard untuk periode fromDate..toDate (YYYY-MM-DD).
     *
     * @return array{
     *   period: array{from: string, to: string},
     *   totals: array<string, int>,
     *   by_category: array<int, array{category: string, label: string, count: int}>
     * }
     */
    public function computeSummary(string $fromDate, string $toDate): array
    {
        $start = Carbon::parse($fromDate, 'Asia/Jakarta')->startOfDay();
        $end   = Carbon::parse($toDate, 'Asia/Jakarta')->endOfDay();

        $statusRows = Report::query()
            ->select('status', DB::raw('COUNT(*) as aggregate'))
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $totals = [
            'all'                 => 0,
            'menunggu_verifikasi' => (int) ($statusRows[ReportStatus::MENUNGGU_VERIFIKASI->value] ?? 0),
            'menunggu_penanganan' => (int) ($statusRows[ReportStatus::MENUNGGU_PENANGANAN->value] ?? 0),
            'diproses'            => (int) ($statusRows[ReportStatus::DIPROSES->value] ?? 0),
            'selesai'             => (int) ($statusRows[ReportStatus::SELESAI->value] ?? 0),
            'ditolak'             => (int) ($statusRows[ReportStatus::DITOLAK->value] ?? 0),
        ];

        $totals['all'] = $totals['menunggu_verifikasi']
            + $totals['menunggu_penanganan']
            + $totals['diproses']
            + $totals['selesai']
            + $totals['ditolak'];

        $categoryRows = Report::query()
            ->select('category', DB::raw('COUNT(*) as aggregate'))
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('category')
            ->groupBy('category')
            ->pluck('aggregate', 'category');

        $byCategory = [];
        foreach (Category::cases() as $cat) {
            $byCategory[] = [
                'category' => $cat->value,
                'label'    => $cat->label(),
                'count'    => (int) ($categoryRows[$cat->value] ?? 0),
            ];
        }

        return [
            'period'      => [
                'from' => $fromDate,
                'to'   => $toDate,
            ],
            'totals'      => $totals,
            'by_category' => $byCategory,
        ];
    }

    /**
     * Ambil atau buat ringkasan eksekutif AI (3 poin) untuk periode fromDate..toDate.
     * Memakai cache di tabel ai_insights bila usianya < 6 jam dan !$forceRegenerate.
     *
     * @return array{
     *   bullets: array<int, string>,
     *   based_on_total: int,
     *   period: array{from: string, to: string},
     *   generated_at: string
     * }
     */
    public function getInsight(string $fromDate, string $toDate, bool $forceRegenerate = false): array
    {
        if (! $forceRegenerate) {
            $cached = AiInsight::query()
                ->whereDate('from_date', $fromDate)
                ->whereDate('to_date', $toDate)
                ->first();

            if ($cached && $cached->generated_at && $cached->generated_at->gt(now()->subHours(6))) {
                return [
                    'bullets'        => array_values((array) $cached->bullets),
                    'based_on_total' => (int) $cached->based_on_total,
                    'period'         => [
                        'from' => $fromDate,
                        'to'   => $toDate,
                    ],
                    'generated_at'   => $cached->generated_at->toIso8601String(),
                ];
            }
        }

        $summary = $this->computeSummary($fromDate, $toDate);
        $bullets = $this->generateBulletsWithAiOrFallback($summary);
        $now     = now();

        $existing = AiInsight::query()
            ->whereDate('from_date', $fromDate)
            ->whereDate('to_date', $toDate)
            ->first();

        if ($existing) {
            $existing->update([
                'bullets'        => $bullets,
                'based_on_total' => $summary['totals']['all'],
                'generated_at'   => $now,
            ]);
        } else {
            AiInsight::create([
                'from_date'      => $fromDate,
                'to_date'        => $toDate,
                'bullets'        => $bullets,
                'based_on_total' => $summary['totals']['all'],
                'generated_at'   => $now,
            ]);
        }

        return [
            'bullets'        => $bullets,
            'based_on_total' => $summary['totals']['all'],
            'period'         => [
                'from' => $fromDate,
                'to'   => $toDate,
            ],
            'generated_at'   => $now->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $summary
     * @return array<int, string>
     */
    private function generateBulletsWithAiOrFallback(array $summary): array
    {
        try {
            $totals     = $summary['totals'];
            $byCategory = $summary['by_category'];
            $period     = $summary['period'];

            $promptData = json_encode([
                'period'      => $period,
                'totals'      => $totals,
                'by_category' => $byCategory,
            ], JSON_UNESCAPED_UNICODE);

            $system = <<<'SYS'
Anda adalah analis eksekutif platform pengaduan publik KawalWarga.
Berdasarkan HANYA angka agregat yang diberikan, susun tepat 3 poin ringkasan eksekutif dalam bahasa Indonesia yang ringkas, padat, memuat angka dan persentase nyata, serta satu rekomendasi prioritas tindakan bagi admin/pimpinan.
Setiap poin maksimal 160 karakter.
SYS;

            $schema = [
                'type'       => 'OBJECT',
                'properties' => [
                    'bullets' => [
                        'type'  => 'ARRAY',
                        'items' => ['type' => 'STRING'],
                    ],
                ],
                'required'   => ['bullets'],
            ];

            $raw = $this->gemini->generate(
                [['text' => "Data agregat laporan:\n".$promptData]],
                $system,
                $schema,
                0.2
            );

            $rawBullets = is_array($raw['bullets'] ?? null) ? $raw['bullets'] : [];
            $cleaned    = [];

            foreach ($rawBullets as $item) {
                if (is_string($item) && trim($item) !== '') {
                    $cleaned[] = mb_substr(trim($item), 0, 220);
                }
            }

            if (count($cleaned) >= 3) {
                return array_slice($cleaned, 0, 3);
            }
        } catch (\Throwable) {
            // Gunakan fallback di bawah
        }

        return $this->buildFallbackBullets($summary);
    }

    /**
     * Susun 3 poin ringkasan dari aturan sederhana (kategori terbanyak + persen, jumlah laporan aktif, persen selesai).
     *
     * @param  array<string, mixed>  $summary
     * @return array<int, string>
     */
    public function buildFallbackBullets(array $summary): array
    {
        $totals     = $summary['totals'];
        $byCategory = $summary['by_category'];
        $all        = (int) $totals['all'];

        if ($all === 0) {
            return [
                'Belum ada laporan masuk pada periode yang dipilih.',
                '0 laporan sedang dalam alur penanganan.',
                'Pantau berkala antrean verifikasi untuk menindaklanjuti laporan baru.',
            ];
        }

        // Urutkan kategori dari jumlah terbanyak
        $sortedCategories = $byCategory;
        usort($sortedCategories, fn (array $a, array $b) => $b['count'] <=> $a['count']);
        $topCat   = $sortedCategories[0];
        $topLabel = $topCat['label'];
        $topCount = (int) $topCat['count'];
        $topPct   = (int) round(($topCount / $all) * 100);

        $waitingVerify  = (int) $totals['menunggu_verifikasi'];
        $waitingOfficer = (int) $totals['menunggu_penanganan'];
        $inProgress     = (int) $totals['diproses'];
        $activeCount    = $waitingOfficer + $inProgress;
        $completedCount = (int) $totals['selesai'];
        $completedPct   = (int) round(($completedCount / $all) * 100);

        return [
            "{$topLabel} mendominasi: {$topCount} laporan ({$topPct}%). Prioritaskan pemeriksaan ruas lingkungan.",
            "{$activeCount} laporan masih dalam alur penanganan. {$waitingOfficer} laporan terverifikasi belum diambil petugas.",
            "{$completedCount} laporan telah selesai ({$completedPct}%). Tinjau {$waitingVerify} laporan baru agar antrean tidak menumpuk.",
        ];
    }
}
