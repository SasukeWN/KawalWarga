<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\ReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReportRequest;
use App\Http\Resources\TrackResource;
use App\Models\Report;
use App\Services\Ai\ReportAnalyzer;
use App\Services\ReportWorkflow;
use App\Services\TicketService;
use App\Services\UploadService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * POST /api/v1/reports
     * Kirim laporan baru dari warga (multipart/form-data).
     */
    public function store(
        StoreReportRequest $request,
        UploadService $uploadService,
        ReportWorkflow $workflow,
        ReportAnalyzer $analyzer
    ): JsonResponse {
        $photoPath = $uploadService->storeReportPhoto($request->file('photo'));

        $report = $workflow->submit($request->validated(), $photoPath);

        try {
            $report = $analyzer->analyze($report);
        } catch (\Throwable) {
            $report->update([
                'title'     => mb_substr(trim($report->description), 0, 60),
                'ai_status' => 'failed',
            ]);
            $report->refresh();
        }

        $status = $report->status instanceof ReportStatus
            ? $report->status
            : ReportStatus::from((string) $report->status);

        return ApiResponse::created([
            'ticket_id'    => $report->ticket_id,
            'status'       => $status->value,
            'status_label' => $status->label(),
            'created_at'   => $report->created_at->toIso8601String(),
        ], 'Laporan berhasil dikirim.');
    }

    /**
     * GET /api/v1/reports/track/{ticket_id}
     * Lacak status laporan publik berdasarkan ID tiket.
     */
    public function track(Request $request, string $ticket_id): JsonResponse
    {
        $normalized = TicketService::normalize($ticket_id);

        if (! $normalized) {
            return ApiResponse::error('Data tidak ditemukan.', 404);
        }

        $report = Report::with(['events.actor', 'handler', 'rejecter'])
            ->where('ticket_id', $normalized)
            ->first();

        if (! $report) {
            return ApiResponse::error('Data tidak ditemukan.', 404);
        }

        return ApiResponse::success(
            (new TrackResource($report))->resolve($request)
        );
    }
}
