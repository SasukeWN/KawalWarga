<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\Category;
use App\Enums\ReportStatus;
use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\Ai\InsightService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /**
     * GET /api/v1/admin/dashboard/summary
     */
    public function summary(Request $request, InsightService $insightService): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvePeriod($request);

        return ApiResponse::success(
            $insightService->computeSummary($fromDate, $toDate)
        );
    }

    /**
     * GET /api/v1/admin/dashboard/map
     * Hanya laporan yang sudah diverifikasi (bukan menunggu_verifikasi), maks 500 pin.
     */
    public function map(Request $request): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvePeriod($request);

        $start = Carbon::parse($fromDate, 'Asia/Jakarta')->startOfDay();
        $end   = Carbon::parse($toDate, 'Asia/Jakarta')->endOfDay();

        $reports = Report::query()
            ->where('status', '!=', ReportStatus::MENUNGGU_VERIFIKASI->value)
            ->whereBetween('created_at', [$start, $end])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(500)
            ->get();

        $items = $reports->map(function (Report $report): array {
            $status = $report->status instanceof ReportStatus
                ? $report->status
                : ReportStatus::from((string) $report->status);

            $rawCategory = $report->category ?? $report->ai_category;
            $category    = $rawCategory instanceof Category
                ? $rawCategory
                : ($rawCategory ? Category::tryFrom((string) $rawCategory) : null);

            return [
                'ticket_id'      => $report->ticket_id,
                'title'          => $report->title,
                'category'       => $category?->value,
                'category_label' => $category?->label(),
                'status'         => $status->value,
                'status_label'   => $status->label(),
                'latitude'       => (float) $report->latitude,
                'longitude'      => (float) $report->longitude,
                'photo_url'      => $report->photo_url,
            ];
        })->values()->all();

        return ApiResponse::success($items);
    }

    /**
     * GET /api/v1/admin/dashboard/ai-insight
     */
    public function aiInsight(Request $request, InsightService $insightService): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvePeriod($request);

        return ApiResponse::success(
            $insightService->getInsight($fromDate, $toDate, false)
        );
    }

    /**
     * POST /api/v1/admin/dashboard/ai-insight/regenerate
     */
    public function regenerateAiInsight(Request $request, InsightService $insightService): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvePeriod($request);

        return ApiResponse::success(
            $insightService->getInsight($fromDate, $toDate, true)
        );
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolvePeriod(Request $request): array
    {
        $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to'   => ['nullable', 'date_format:Y-m-d'],
        ], [
            'from.date_format' => 'Format tanggal awal harus YYYY-MM-DD.',
            'to.date_format'   => 'Format tanggal akhir harus YYYY-MM-DD.',
        ]);

        $nowJakarta = Carbon::now('Asia/Jakarta');
        $fromDate   = $request->filled('from')
            ? (string) $request->input('from')
            : $nowJakarta->copy()->subDays(7)->toDateString();

        $toDate = $request->filled('to')
            ? (string) $request->input('to')
            : $nowJakarta->toDateString();

        return [$fromDate, $toDate];
    }
}
